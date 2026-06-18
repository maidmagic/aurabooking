"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  role: "customer" | "ai" | "human_agent" | "system";
  content: string;
  msg_type?: string;
  created_at?: string;
}

interface ChatWidgetProps {
  businessId?: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  title?: string;
}

export function ChatWidget({
  businessId = "demo",
  position = "bottom-right",
  primaryColor = "#7C5CFC",
  title = "Chat with us",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi! How can I help you today?", msg_type: "text" },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBusinessId = params.get("business_id");
    if (urlBusinessId) {
      businessId = urlBusinessId;
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/chat/widget?conversation_id=${conversationId}`
        );
        if (!res.ok) throw new Error("Failed to poll messages");
        const data = await res.json();
        if (data.messages) {
          setMessages((prev) => {
            const existingIds = new Set(
              prev.filter((m) => m.id).map((m) => m.id)
            );
            const newMsgs = data.messages.filter(
              (m: Message) => !m.id || !existingIds.has(m.id)
            );
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
          });
        }
      } catch {
        // silent poll failure
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, conversationId]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    const userMessage: Message = {
      role: "customer",
      content,
      msg_type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/chat/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          business_id: businessId,
          content,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();

      if (!conversationId) {
        setConversationId(data.conversation_id);
      }

      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const positionClasses =
    position === "bottom-left"
      ? "left-4 bottom-4"
      : "right-4 bottom-4";

  return (
    <div
      className={cn("fixed z-50 font-sans", positionClasses)}
      style={{ fontFamily: "inherit" }}
    >
      {isOpen ? (
        <div
          className="flex flex-col rounded-xl shadow-2xl overflow-hidden bg-white border"
          style={{
            width: "300px",
            height: "400px",
            borderColor: "#EDE9E3",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-sm font-medium">{title}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:opacity-80 transition-opacity"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto p-3 space-y-3"
            style={{ backgroundColor: "#F5F5F5" }}
          >
            {messages.map((msg, i) => {
              const isUser = msg.role === "customer";
              return (
                <div
                  key={msg.id ?? i}
                  className={cn(
                    "flex",
                    isUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed"
                    )}
                    style={{
                      backgroundColor: isUser ? primaryColor : "#F0EEF5",
                      color: isUser ? "#FFFFFF" : "#1A1A1A",
                      borderTopLeftRadius: isUser ? "12px" : "4px",
                      borderTopRightRadius: isUser ? "4px" : "12px",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div
                  className="rounded-xl px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "#F0EEF5",
                    color: "#1A1A1A",
                    borderTopLeftRadius: "4px",
                    borderTopRightRadius: "12px",
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-3 py-1.5 text-xs" style={{ color: "#C44E4E", backgroundColor: "#FEF2F2" }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 border-t" style={{ borderColor: "#EDE9E3", backgroundColor: "#FFFFFF" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "#1A1A1A" }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="p-1.5 rounded-full flex items-center justify-center transition-opacity disabled:opacity-50"
              style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center rounded-full shadow-lg hover:opacity-90 transition-opacity"
          style={{
            width: "48px",
            height: "48px",
            backgroundColor: primaryColor,
            color: "#FFFFFF",
          }}
          aria-label="Open chat"
        >
          <MessageCircle size={22} />
        </button>
      )}
    </div>
  );
}
