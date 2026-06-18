"use client";

import { useState, useEffect } from "react";
import { Bot } from "lucide-react";

const messages = [
  { role: "customer", text: "Hi! Can I book a haircut for tomorrow?" },
  { role: "ai", text: "Hi there! I'd be happy to help. We have openings at 2pm or 4pm tomorrow. Which works for you?" },
  { role: "customer", text: "2pm sounds perfect!" },
];

export function ChatPreview() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (visibleMessages < messages.length) {
        setVisibleMessages((prev) => prev + 1);
        if (messages[visibleMessages]?.role === "ai") {
          setIsTyping(true);
          let i = 0;
          const text = messages[visibleMessages].text;
          const interval = setInterval(() => {
            setTypingText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) {
              clearInterval(interval);
              setIsTyping(false);
            }
          }, 25);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [visibleMessages]);

  return (
    <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden max-w-md w-full">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <Bot className="h-5 w-5 text-accent" />
        <span className="text-primary-foreground text-sm font-medium">Aura AI</span>
      </div>
      <div className="p-4 space-y-3 min-h-[280px]">
        {messages.slice(0, visibleMessages).map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "customer" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "customer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {msg.role === "ai" && i === visibleMessages - 1 && isTyping
                ? typingText
                : msg.text}
              {msg.role === "ai" && i === visibleMessages - 1 && isTyping && (
                <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-blink" />
              )}
            </div>
          </div>
        ))}
        {visibleMessages < messages.length && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
              <span className="animate-pulse">●</span> AI is typing...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
