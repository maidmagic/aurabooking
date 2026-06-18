import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitEvent } from "@/lib/webhooks/emit";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "AuraBooking",
    },
  });
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available time slots on a given date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          duration: { type: "number", description: "Duration in minutes" },
        },
        required: ["date", "duration"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Book an appointment and create calendar event",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          phone: { type: "string" },
          service: { type: "string" },
          datetime: { type: "string", description: "ISO 8601 datetime string" },
        },
        required: ["customer_name", "phone", "service", "datetime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_payment_link",
      description: "Generate a Stripe payment link for a deposit on a recently created appointment",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "The ID of the appointment that needs a deposit" },
          phone: { type: "string", description: "Customer phone number to send the payment link to" },
        },
        required: ["appointment_id"],
      },
    },
  },
];

const SYSTEM_PREFIX = `You are an AI receptionist for a business. You have access to their services catalog and business hours only.

STRICT RULES:
- NEVER offer discounts, promotions, or price changes not explicitly listed
- NEVER provide medical, legal, or financial advice
- NEVER claim services that are not in the services table
- NEVER promise appointment availability you haven't confirmed via check_availability
- If unsure about anything, politely say "Let me transfer you to a team member"

DEPOSIT RULES:
- Some services require a deposit to confirm the booking
- If a deposit is required, you MUST explain: "To confirm your appointment, please complete the deposit via this secure link. Your time slot is held for 10 minutes."
- After creating the booking, if a deposit is required, the system will automatically provide a payment link
- Do NOT tell the customer their appointment is confirmed until the deposit is completed
- If the customer does not complete the deposit, the slot will be released after 10 minutes
- If the customer returns to chat after the deposit expired, you can offer to re-book`;

export async function processMessage(
  conversationId: string,
  userId: string,
  message: string,
  signal?: AbortSignal
): Promise<string> {
  const admin = createAdminClient();

  const [convResult, settingsResult] = await Promise.all([
    admin.from("conversations").select("*").eq("id", conversationId).single(),
    admin.from("ai_settings").select("*").eq("user_id", userId).single(),
  ]);

  const conversation = convResult.data;
  const settings = settingsResult.data;

  const { data: messages } = await admin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const { data: services } = await admin
    .from("services")
    .select("name, duration, price")
    .eq("user_id", userId)
    .eq("active", true);

  const serviceList = services?.map((s) => `${s.name} (${s.duration}min, $${s.price})`).join(", ") || "None configured";

  const systemMessage: OpenAI.Chat.ChatCompletionSystemMessageParam = {
    role: "system",
    content: [
      SYSTEM_PREFIX,
      `\n\nBusiness hours: ${JSON.stringify(settings?.business_hours ?? {})}`,
      `\nServices available: ${serviceList}`,
      `\nBooking rules: ${JSON.stringify(settings?.booking_rules ?? {})}`,
    ].join(""),
  };

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    systemMessage,
    ...(messages?.map((m) => ({
      role: m.role === "ai" ? "assistant" as const : m.role === "customer" ? "user" as const : "system" as const,
      content: m.content,
    })) ?? []),
  ];

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "mistralai/mistral-7b-instruct:free",
    messages: chatMessages,
    tools,
    tool_choice: "auto",
  }, { signal });

  const choice = response.choices[0];

  if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.type !== "function") continue;
      const fn = toolCall.function;
      if (fn.name === "check_availability") {
        const args = JSON.parse(fn.arguments);
        const { checkAvailability } = await import("@/lib/google/calendar");
        const slots = await checkAvailability(userId, args.date, args.duration);
        const toolResponse = slots.length > 0
          ? `Available slots: ${slots.map((s) => new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })).join(", ")}`
          : "No slots available on that date.";

        chatMessages.push(choice.message);
        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResponse,
        });
      } else if (fn.name === "create_booking") {
        const args = JSON.parse(fn.arguments);

        // Look up the service to check if deposit is required
        const { data: serviceData } = await admin
          .from("services")
          .select("id, name, duration, price, deposit_required, deposit_amount")
          .eq("user_id", userId)
          .eq("name", args.service)
          .maybeSingle();

        const depositRequired = (serviceData as any)?.deposit_required ?? false;
        const depositAmount = (serviceData as any)?.deposit_amount ?? 0;

        const startTime = args.datetime;
        const duration = (serviceData as any)?.duration ?? 60;
        const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();

        // Create the appointment (pending payment if deposit required)
        const { data: appointment } = await admin
          .from("appointments")
          .insert({
            user_id: userId,
            conversation_id: conversationId,
            customer_name: args.customer_name,
            customer_phone: args.phone,
            service_id: (serviceData as any)?.id || null,
            start_time: startTime,
            end_time: endTime,
            payment_status: depositRequired ? "pending" : "unpaid",
          })
          .select()
          .single();

        if (depositRequired && appointment) {
          // Don't update conversation to "booked" yet — payment pending
          // Insert a slot hold (10 min expiry)
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          await admin.from("slot_holds").insert({
            user_id: userId,
            start_time: startTime,
            end_time: endTime,
            expires_at: expiresAt,
            conversation_id: conversationId,
          });

          emitEvent(userId, "booking.created", {
            id: appointment.id,
            customer_name: args.customer_name,
            customer_phone: args.phone,
            service: args.service,
            start_time: startTime,
            end_time: endTime,
            deposit_required: true,
            deposit_amount: depositAmount,
            status: "pending",
          });

          chatMessages.push(choice.message);
          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              deposit_required: true,
              deposit_amount: depositAmount,
              appointment_id: appointment.id,
              start_time: startTime,
              message: `A deposit of $${Number(depositAmount).toFixed(2)} is required to confirm this appointment. I'll send you a payment link now.`,
            }),
          });
        } else {
          // No deposit — proceed as normal with calendar event
          let googleEventId = "";
          try {
            const { createCalendarEvent } = await import("@/lib/google/calendar");
            googleEventId = await createCalendarEvent(userId, `${args.service} - ${args.customer_name}`, startTime, endTime);
          } catch (e) {
            // Calendar not connected
          }

          if (googleEventId) {
            await admin.from("appointments").update({ google_event_id: googleEventId }).eq("id", appointment.id);
          }

          await admin.from("conversations").update({ status: "booked" }).eq("id", conversationId);

          emitEvent(userId, "booking.created", {
            id: appointment.id,
            customer_name: args.customer_name,
            customer_phone: args.phone,
            service: args.service,
            start_time: startTime,
            end_time: endTime,
            deposit_required: false,
            status: "confirmed",
          });

          chatMessages.push(choice.message);
          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              deposit_required: false,
              start_time: startTime,
            }),
          });
        }
      } else if (fn.name === "generate_payment_link") {
        const args = JSON.parse(fn.arguments);

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/create-deposit`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                appointment_id: args.appointment_id,
                conversation_id: conversationId,
              }),
            }
          );

          if (res.ok) {
            const { url } = await res.json();
            chatMessages.push(choice.message);
            chatMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: true,
                payment_url: url,
                message: `Please complete your deposit via this secure link: ${url}. The slot is held for 10 minutes.`,
              }),
            });
          } else {
            chatMessages.push(choice.message);
            chatMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                error: "Failed to generate payment link",
              }),
            });
          }
        } catch (e) {
          chatMessages.push(choice.message);
          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: "Payment service unavailable",
            }),
          });
        }
      }
    }

    const finalResponse = await openai.chat.completions.create({
    model: "mistralai/mistral-7b-instruct:free",
    messages: chatMessages,
  }, { signal });

    return finalResponse.choices[0].message.content ?? "I've processed your request.";
  }

  return choice.message.content ?? "I'm not sure how to help with that.";
}
