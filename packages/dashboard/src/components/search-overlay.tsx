"use client";

import { Search, X, Brain } from "lucide-react";
import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanProject, sanitizeSnippet, TYPE_ICONS, TYPE_COLORS } from "@/lib/format";

type SearchResult = {
  id: string;
  content_type: string;
  project: string;
  conversation_id: string | null;
  importance: number | null;
  tags: string | null;
  summary: string | null;
  intent: string | null;
  snippet: string;
  rank: number;
};

function deriveSession(result: SearchResult): string {
  // Use conversation_id if available, otherwise derive from chunk ID
  if (result.conversation_id) return result.conversation_id;
  // Chunk IDs are like /path/to/file.jsonl:N — strip the :N suffix
  const lastColon = result.id.lastIndexOf(":");
  return lastColon > 0 ? result.id.substring(0, lastColon) : result.id;
}

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  // Open/close on Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/dashboard/search?q=${encodeURIComponent(q)}&limit=20`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setResults(data.results ?? []);
          setTimeMs(data.time_ms ?? 0);
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleInput = useCallback(
    (val: string) => {
      setQuery(val);
      setSelectedIdx(0);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(val), 200);
    },
    [doSearch]
  );

  // Navigate to session on select
  const selectResult = useCallback(
    (result: SearchResult) => {
      const session = deriveSession(result);
      router.push(`/session?id=${encodeURIComponent(session)}`);
      setOpen(false);
    },
    [router]
  );

  // Navigate to brain view with node pre-selected
  const viewInBrain = useCallback(
    (result: SearchResult, e: React.MouseEvent) => {
      e.stopPropagation();
      const session = deriveSession(result);
      router.push(`/?node=${encodeURIComponent(session)}`);
      setOpen(false);
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        selectResult(results[selectedIdx]);
      }
    },
    [results, selectedIdx, selectResult]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search 245K+ conversation chunks..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleInput("")}
              className="p-1 hover:bg-surface-hover rounded"
            >
              <X className="w-4 h-4 text-muted" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] text-muted/50 bg-background px-1.5 py-0.5 rounded border border-border/50">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-xs text-muted">
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] text-muted/50">
                {results.length} results in {timeMs.toFixed(0)}ms
              </div>
              {results.map((result, i) => {
                const Icon = TYPE_ICONS[result.content_type] ?? MessageSquare;
                const color = TYPE_COLORS[result.content_type] ?? "text-muted";
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectResult(result)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors group/result ${
                      i === selectedIdx
                        ? "bg-accent/10"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div
                        className="text-xs leading-relaxed line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: sanitizeSnippet(result.snippet) }}
                      />
                      <div className="flex items-center gap-2 text-[10px] text-muted/60">
                        <span className="font-mono">
                          {cleanProject(result.project)}
                        </span>
                        <span className={`capitalize ${color}`}>
                          {result.content_type?.replace(/_/g, " ")}
                        </span>
                        {result.importance != null && (
                          <span>
                            imp: {result.importance.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => viewInBrain(result, e)}
                      title="View in Brain"
                      className="p-1.5 shrink-0 opacity-0 group-hover/result:opacity-100 hover:bg-accent/10 rounded transition-all"
                    >
                      <Brain className="w-3.5 h-3.5 text-accent" />
                    </button>
                  </button>
                );
              })}
            </>
          )}

          {!query && (
            <div className="px-4 py-8 text-center space-y-2">
              <p className="text-xs text-muted/60">
                Search across all Claude Code conversations
              </p>
              <p className="text-[10px] text-muted/30">
                Try: &ldquo;telegram bot&rdquo;, &ldquo;authentication&rdquo;,
                &ldquo;supabase migration&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/50 flex items-center gap-4 text-[10px] text-muted/40">
          <span>
            <kbd className="bg-background px-1 py-0.5 rounded border border-border/50">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="bg-background px-1 py-0.5 rounded border border-border/50">
              ↵
            </kbd>{" "}
            open session
          </span>
          <span>
            <kbd className="bg-background px-1 py-0.5 rounded border border-border/50">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
