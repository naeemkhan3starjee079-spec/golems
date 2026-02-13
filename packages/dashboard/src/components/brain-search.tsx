"use client";

import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  matchCount: number | null;
  totalNodes: number;
};

export function BrainSearch({ value, onChange, matchCount, totalNodes }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA")
          return;
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Search nodes... (press "/")'
          className="w-64 pl-9 pr-8 py-2 text-sm bg-surface/90 backdrop-blur-sm border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-hover rounded"
          >
            <X className="w-3.5 h-3.5 text-muted" />
          </button>
        )}
      </div>
      {matchCount !== null && value && (
        <span className="text-xs text-muted bg-surface/90 backdrop-blur-sm px-2 py-1 rounded border border-border">
          {matchCount} / {totalNodes}
        </span>
      )}
    </div>
  );
}
