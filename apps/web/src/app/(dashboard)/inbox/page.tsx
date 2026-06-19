"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Phone,
  Globe,
  Send,
  Loader2,
  Search,
  Bot,
  User,
} from "lucide-react";

type Channel = "sms" | "web_chat" | "messenger" | "outreach";

interface Conversation {
  id: string;
  channel: Channel;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  ai_active: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_role: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  role: "customer" | "ai" | "human_agent" | "system";
  content: string;
  msg_type: string;
  created_at: string;
}

interface ProfileData {
  conversation: {
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    channel: string;
    status: string;
    ai_active: boolean;
    created_at: string;
  };
  appointments: Array<{
    id: string;
    customer_name: string;
    start_time: string;
    end_time: string;
    status: string;
    payment_status: string;
    service_name: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    paid_at: string | null;
  }>;
  detected_intent: string[];
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function messageDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function channelIcon(channel: Channel) {
  switch (channel) {
    case "sms":
      return <Phone className="size-3" />;
    case "web_chat":
      return <Globe className="size-3" />;
    case "messenger":
      return <MessageSquare className="size-3" />;
    case "outreach":
      return <MessageSquare className="size-3" />;
  }
}

function channelLabel(channel: Channel): string {
  switch (channel) {
    case "sms":
      return "SMS";
    case "web_chat":
      return "Web Chat";
    case "messenger":
      return "Messenger";
    case "outreach":
      return "Outreach";
  }
}

function roleLabel(role: string): string | null {
  if (role === "ai") return "AI";
  if (role === "system") return "System";
  return null;
}

function isNewDay(messages: Message[], i: number): boolean {
  if (i === 0) return true;
  const prev = new Date(messages[i - 1].created_at).toDateString();
  const curr = new Date(messages[i].created_at).toDateString();
  return prev !== curr;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [loading, setLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox/conversations");
      if (!res.ok) throw new Error("Failed to load conversations");
      const data: Conversation[] = await res.json();
      setConversations(data);
      setConvError(null);
    } catch (e) {
      setConvError(e instanceof Error ? e.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/inbox/messages?conversation_id=${encodeURIComponent(convId)}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data: Message[] = await res.json();
      setMessages(data);
      setMsgError(null);
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : "Failed to load messages");
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) return;
    fetchMessages(selectedId);
    const interval = setInterval(() => fetchMessages(selectedId), 5000);
    return () => clearInterval(interval);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (!profileDrawerOpen || !selectedId) {
      setProfileData(null);
      return;
    }
    setProfileLoading(true);
    fetch(`/api/inbox/profile?conversation_id=${encodeURIComponent(selectedId)}`)
      .then((r) => r.json())
      .then(setProfileData)
      .finally(() => setProfileLoading(false));
  }, [selectedId, profileDrawerOpen]);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      !search ||
      (c.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone ?? "").includes(search);
    const matchesChannel = channelFilter === "all" || c.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  async function handleToggleAi(checked: boolean) {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, ai_active: checked } : c))
    );
    try {
      const res = await fetch("/api/inbox/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, ai_active: checked }),
      });
      if (!res.ok) throw new Error("Failed to update AI status");
    } catch {
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, ai_active: !checked } : c))
      );
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: selectedId,
      role: "human_agent",
      content: text,
      msg_type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText("");
    try {
      const res = await fetch("/api/inbox/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: selectedId, content: text }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const created: Message = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? created : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  const channels: Array<{ key: Channel | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "sms", label: "SMS" },
    { key: "web_chat", label: "Web Chat" },
  ];

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-6 -mb-6 lg:-mx-8 lg:-mb-8">
      {/* Left Pane */}
      <div className="w-[320px] shrink-0 border-r border-border bg-[#FAF8F5] flex flex-col">
        <div className="p-3 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-1">
            {channels.map((ch) => (
              <button
                key={ch.key}
                onClick={() => setChannelFilter(ch.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  channelFilter === ch.key
                    ? "bg-[#7C5CFC] text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-[#EDE9E3]"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : convError ? (
            <div className="p-4 text-sm text-[#C44E4E]">{convError}</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center mt-8">
              <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
              No conversations yet
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-[#EDE9E3]/50 ${
                  selectedId === conv.id ? "bg-[#EDE9E3]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar size="sm">
                      <AvatarFallback>{getInitials(conv.customer_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.customer_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.last_message ?? "No messages yet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {timeAgo(conv.last_message_at ?? conv.updated_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      {conv.metadata?.needs_human && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                          Needs Help
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                        {channelIcon(conv.channel)}
                        {channelLabel(conv.channel)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane */}
      <div className="flex-1 flex bg-white">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <MessageSquare className="size-10 mx-auto mb-3 opacity-30" />
              Select a conversation to start messaging
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#FAF8F5] shrink-0">
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(selectedConv.customer_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedConv.customer_name ?? "Unknown"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                      {channelIcon(selectedConv.channel)}
                      {channelLabel(selectedConv.channel)}
                    </Badge>
                    <Badge
                      variant={
                        selectedConv.status === "booked"
                          ? "success"
                          : selectedConv.status === "qualifying"
                            ? "warning"
                            : "default"
                      }
                      className="text-[10px] h-4 px-1.5 capitalize"
                    >
                      {selectedConv.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  selectedConv.ai_active 
                    ? "bg-[#4A7C59]/10" 
                    : "bg-[#D97706]/10 border border-[#D97706]/30"
                }`}>
                  {selectedConv.ai_active ? (
                    <Bot className="size-4 text-[#4A7C59]" />
                  ) : (
                    <Bot className="size-4 text-[#D97706]" />
                  )}
                  <span className={`text-xs font-medium ${
                    selectedConv.ai_active ? "text-[#4A7C59]" : "text-[#D97706]"
                  }`}>
                    {selectedConv.ai_active ? "AI Active" : "AI Paused"}
                  </span>
                  <Switch
                    checked={selectedConv.ai_active}
                    onCheckedChange={handleToggleAi}
                    size="sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setProfileDrawerOpen(!profileDrawerOpen)}
                  className={profileDrawerOpen ? "bg-[#EDE9E3]" : ""}
                >
                  <User className="size-4" />
                </Button>
              </div>
            </div>

            {/* AI Paused note */}
            {!selectedConv.ai_active && (
              <div className="px-4 py-2 text-xs text-[#D97706] bg-[#D97706]/5 border-b border-[#D97706]/10 flex items-center gap-2">
                <Bot className="size-3.5" />
                AI paused — messages go directly to staff
              </div>
            )}

            {/* Handoff Banner */}
            {!selectedConv.ai_active && messages.some((m) => m.role === "human_agent") && (
              <div className="px-4 py-3 text-xs bg-[#D97706]/10 border-l-2 border-l-[#D97706] text-[#D97706] flex items-center gap-2 mx-4 mt-3 rounded-sm">
                <span>🔄 Transferred to staff — the AI paused because this conversation needed a human touch.</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {msgError && (
                <div className="text-sm text-[#C44E4E] text-center">{msgError}</div>
              )}
              {messages.length === 0 && !msgError ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No messages yet
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id}>
                    {isNewDay(messages, i) && (
                      <div className="flex items-center justify-center my-4">
                        <span className="text-[11px] text-muted-foreground bg-[#FAF8F5] px-2 py-0.5 rounded-full">
                          {messageDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${
                        msg.role === "human_agent" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 ${
                          msg.role === "human_agent"
                            ? "bg-[#7C5CFC] text-white"
                            : "bg-[#F0EEF5] text-foreground"
                        } ${msg.role === "system" ? "mx-auto max-w-[90%]" : ""}`}
                      >
                        {msg.role === "ai" && (
                          <div className="flex items-center gap-1 mb-1">
                            <Bot className="size-3 text-[#7C5CFC]" />
                            <span className="text-[10px] font-medium text-[#7C5CFC]">AI</span>
                          </div>
                        )}
                        {msg.role === "system" ? (
                          <p className="text-xs italic text-muted-foreground text-center">
                            {msg.content}
                          </p>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.role === "human_agent"
                              ? "text-white/60 text-right"
                              : "text-muted-foreground text-left"
                          } ${msg.role === "system" ? "text-center" : ""}`}
                        >
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-[#FAF8F5] shrink-0">
              <Input
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Profile Drawer */}
          {profileDrawerOpen && (
            <div className="w-[280px] shrink-0 border-l border-border bg-[#FAF8F5] overflow-y-auto">
              {profileLoading ? (
                <div className="flex items-center justify-center h-32 p-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : profileData ? (
                <div className="p-4 space-y-5">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Customer</h4>
                    <p className="text-sm font-medium text-foreground">{profileData.conversation.customer_name ?? "Unknown"}</p>
                    {profileData.conversation.customer_phone && (
                      <p className="text-xs text-muted-foreground">{profileData.conversation.customer_phone}</p>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{profileData.conversation.channel.replace("_", " ")}</Badge>
                      <Badge variant={profileData.conversation.status === "booked" ? "success" : "default"} className="text-[10px] capitalize">{profileData.conversation.status}</Badge>
                    </div>
                  </div>

                  {/* Detected Intent */}
                  {profileData.detected_intent?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Interested In</h4>
                      <div className="flex flex-wrap gap-1">
                        {profileData.detected_intent.map((intent: string) => (
                          <span key={intent} className="text-xs bg-[#7C5CFC]/10 text-[#7C5CFC] px-2 py-0.5 rounded-full font-medium">
                            {intent}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Appointments */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Appointments</h4>
                    {profileData.appointments?.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No appointments found</p>
                    ) : (
                      <div className="space-y-2">
                        {profileData.appointments?.slice(0, 3).map((apt: any) => (
                          <div key={apt.id} className="bg-white rounded-lg p-2.5 border border-border text-xs space-y-1">
                            <p className="font-medium text-foreground">{apt.service_name ?? "Appointment"}</p>
                            <p className="text-muted-foreground">{new Date(apt.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                            <div className="flex gap-1">
                              <Badge variant={apt.status === "confirmed" ? "booked" : apt.status === "cancelled" ? "destructive" : "default"} className="text-[10px] capitalize">{apt.status}</Badge>
                              <Badge variant={apt.payment_status === "paid" ? "success" : apt.payment_status === "pending" ? "warning" : "default"} className="text-[10px] capitalize">{apt.payment_status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payments */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Payments</h4>
                    {profileData.payments?.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No payments found</p>
                    ) : (
                      <div className="space-y-1.5">
                        {profileData.payments?.slice(0, 3).map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-border">
                            <div>
                              <p className="text-xs font-medium text-foreground">${(p.amount / 100).toFixed(2)}</p>
                              {p.paid_at && <p className="text-[10px] text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</p>}
                            </div>
                            <Badge variant={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "destructive"} className="text-[10px] capitalize">{p.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
