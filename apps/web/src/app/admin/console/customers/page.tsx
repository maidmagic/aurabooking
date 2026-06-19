"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, AlertTriangle } from "lucide-react";

interface Customer {
  phone: string;
  name: string | null;
  late_cancellations: number | null;
  created_at: string;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminCustomersPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tenantId = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tenant_id") || "00000000-0000-0000-0000-000000000000";

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/customers/search?q=${encodeURIComponent(debouncedQuery)}&tenant_id=${tenantId}`)
      .then((r) => r.json())
      .then(setResults)
      .finally(() => setLoading(false));
  }, [debouncedQuery, tenantId]);

  const loadConversation = useCallback(async (customer: Customer) => {
    setSelected(customer);
    setConvLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(customer.phone)}/conversation?tenant_id=${tenantId}`);
      const data = await res.json();
      setConversation(data);
    } finally {
      setConvLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-80 border-r border-border overflow-y-auto shrink-0">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="divide-y divide-border">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && results.length === 0 && debouncedQuery && (
            <p className="text-sm text-muted-foreground text-center py-8">No customers found</p>
          )}
          {results.map((c) => (
            <button
              key={c.phone}
              onClick={() => loadConversation(c)}
              className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${selected?.phone === c.phone ? "bg-muted" : ""}`}
            >
              <p className="text-sm font-medium text-foreground">{c.name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
              {(c.late_cancellations ?? 0) > 2 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  <span className="text-[10px] text-destructive font-medium">{c.late_cancellations} late cancellations</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select a customer to view their conversation
          </div>
        ) : convLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border bg-card">
              <h2 className="text-sm font-medium text-foreground">{selected.name || "Unknown"}</h2>
              <p className="text-xs text-muted-foreground">{selected.phone}</p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversation.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages found</p>
              ) : (
                conversation.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                      msg.direction === "inbound"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${msg.direction === "inbound" ? "text-muted-foreground/60" : "text-primary-foreground/60"}`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
