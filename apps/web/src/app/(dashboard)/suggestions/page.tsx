"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronUp, Lightbulb, MessageSquare, ArrowUp } from "lucide-react";

interface Suggestion {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  author_email: string;
  upvotes: number;
  user_voted: boolean;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "success" | "warning"> = {
  open: "default",
  planned: "secondary",
  shipped: "success",
  declined: "warning",
};

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suggestions");
      if (res.ok) setSuggestions(await res.json());
    } catch {
      setError("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit");
        return;
      }
      setTitle("");
      setBody("");
      await fetchSuggestions();
    } catch {
      setError("Failed to submit suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string) => {
    try {
      const res = await fetch(`/api/suggestions/${id}/vote`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            return {
              ...s,
              upvotes: data.voted ? s.upvotes + 1 : s.upvotes - 1,
              user_voted: data.voted,
            };
          }).sort((a, b) => b.upvotes - a.upvotes)
        );
      } else {
        const data = await res.json();
        setError(data.error ?? "Vote failed");
      }
    } catch {
      setError("Vote failed");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="size-6 text-[#D97706]" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Suggestions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Have an idea to make AuraBooking better? Paid members can submit and vote on feature requests.
          </p>
        </div>
      </div>

      {/* Submit form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Input
            placeholder="A short title for your suggestion..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-[#EDE9E3]"
          />
          <Textarea
            placeholder="Optional details..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="border-[#EDE9E3] min-h-[80px]"
          />
          {error && (
            <p className="text-sm text-[#C44E4E]">{error}</p>
          )}
          <Button onClick={handleSubmit} disabled={submitting || !title.trim()} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Lightbulb className="size-4 mr-1.5" />}
            Submit Suggestion
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="size-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No suggestions yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <Card key={s.id} className="hover:border-[#EDE9E3] transition-colors">
              <CardContent className="p-4 flex gap-4">
                {/* Vote column */}
                <div className="flex flex-col items-center gap-0.5 min-w-[40px] pt-0.5">
                  <button
                    onClick={() => handleVote(s.id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      s.user_voted
                        ? "bg-[#7C5CFC]/10 text-[#7C5CFC]"
                        : "text-muted-foreground hover:text-foreground hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <ChevronUp className="size-5" />
                  </button>
                  <span className={`text-sm font-semibold tabular-nums ${s.user_voted ? "text-[#7C5CFC]" : "text-foreground"}`}>
                    {s.upvotes}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground leading-snug">
                      {s.title}
                    </h3>
                    <Badge
                      variant={STATUS_COLORS[s.status] ?? "default"}
                      className="text-[10px] h-4 px-1.5 shrink-0 mt-0.5"
                    >
                      {s.status}
                    </Badge>
                  </div>
                  {s.body && (
                    <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">
                      {s.body}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {s.author_email} &middot; {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
