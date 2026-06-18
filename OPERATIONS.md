# AuraBooking Operational Guideline

## 1. Inbound Lead Handling (The "Missed Call" Flow)

**Trigger:** Twilio receives an SMS from a new phone number.

**Action:**

1. System checks integrations to identify the correct user_id.
2. System creates a new row in conversations (status: active).
3. AI Engine is triggered:
   - It identifies the customer's intent (Book, Inquire, Reschedule).
   - It fetches the ai_settings (persona and business hours).
   - If "Book" is requested, the AI triggers the check_availability function via the Google Calendar API.
4. Response: The AI sends a conversational SMS back to the customer.

## 2. Appointment Booking Flow

**Trigger:** Customer agrees to a time proposed by the AI.

**Action:**

1. System executes create_booking.
2. Pessimistic Hold: The system places a "hold" on the slot in the slot_holds table for 5 minutes.
3. System creates the event in the business's Google Calendar.
4. System updates the appointments table with confirmed status.
5. Notification: AI sends a confirmation SMS (e.g., "You're booked for a haircut on Tuesday at 2 PM!").

## 3. Human Handoff (The "Take Over" Flow)

**Trigger:** Staff clicks "Pause AI & Take Over" in the Inbox.

**Action:**

1. conversations.ai_active is toggled to false.
2. Any further incoming messages from this customer are routed to the dashboard notification tray, not the AI engine.
3. Staff member types the response in the Inbox.
4. Staff can toggle ai_active back to true to resume automation once the issue is resolved.

## 4. Campaign & Reminder Logic

**Trigger:** Scheduled time in campaigns table.

**Action:**

1. System fetches the audience list.
2. System iterates through the list and triggers the send_sms helper.
3. System logs each message in the messages table with msg_type: 'reminder'.

## 5. Conflict & Error Handling

- **Double-Booking:** If the Google Calendar returns a "Busy" status after a request, the AI must automatically query for the next available three slots and present them to the customer.
- **No-Reply / Hang-Up:** If the customer does not reply for 60 minutes, the AI adds a "Follow-up" to the lead_engage queue to nudge them one last time.

## 6. Missed Call (Voice → SMS)

**Trigger:** Twilio receives an incoming call and the business does not answer within 15 seconds.

**Action:**

1. Twilio Voice webhook returns `<Dial>` with a 15-second timeout.
2. On `DialCallStatus=no-answer`, the voice-status webhook fires.
3. System checks integrations for missed_call_enabled and missed_call_message.
4. System sends a customized SMS to the caller via Twilio.
5. A new conversation is created (channel: 'sms') if one doesn't exist for that caller.
