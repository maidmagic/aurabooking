"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Conversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  status: string;
  last_message: string | null;
  last_message_role: string | null;
  last_message_at: string | null;
  updated_at: string;
  metadata: Record<string, any> | null;
}

interface Message {
  id: string;
  role: "customer" | "ai" | "human_agent" | "system";
  content: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PortalInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const supabase = createClient();

  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
    setLoading(false);
  }, [supabase]);

  const fetchMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }, [supabase]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, 10_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) return;
    fetchMessages(selectedId);
    const channel = supabase
      .channel(`portal:messages:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        () => fetchMessages(selectedId),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId, fetchMessages, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("portal:conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => fetchConversations(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations, supabase]);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.customer_name?.toLowerCase().includes(q) ?? false) ||
      (c.customer_phone?.includes(q) ?? false)
    );
  });

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
      <div className="w-80 shrink-0">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
          />
        </div>

        <div className="space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100% - 3rem)" }}>
          {loading ? (
            <p className="py-8 text-center text-xs text-gray-300">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-300">No conversations yet</p>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedId(conv.id);
                  fetchMessages(conv.id);
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  selectedId === conv.id ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {conv.customer_name || conv.customer_phone || "Unknown"}
                  </span>
                  {conv.last_message_at && (
                    <span className="text-[11px] text-gray-300">{timeAgo(conv.last_message_at)}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {conv.last_message || "No messages yet"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${conv.metadata?.needs_human ? "bg-red-500" : "bg-green-400"}`} />
                  <span className="text-[10px] uppercase tracking-wider text-gray-300">
                    {conv.channel === "sms" ? "SMS" : conv.channel}
                  </span>
                  {conv.metadata?.needs_human && (
                    <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">
                      Needs Help
                    </span>
                  )}
                  {conv.status === "booked" && (
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                      Booked
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-gray-100 bg-white">
        {!selectedConv ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-gray-300">Select a conversation</p>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-gray-50 px-5 py-3">
              <h2 className="text-sm font-medium text-gray-900">
                {selectedConv.customer_name || selectedConv.customer_phone || "Unknown"}
              </h2>
              <p className="text-xs text-gray-300">
                {selectedConv.customer_phone && (
                  <span className="font-mono text-gray-400">{selectedConv.customer_phone}</span>
                )}
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-xs text-gray-300">No messages</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "customer" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "customer"
                          ? "bg-gray-50 text-gray-700"
                          : msg.role === "ai"
                            ? "bg-blue-50 text-gray-700"
                            : "bg-amber-50 text-gray-600"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="mt-1 text-[10px] text-gray-300">
                        {new Date(msg.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
