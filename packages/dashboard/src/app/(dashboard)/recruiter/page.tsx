"use client";

import {
  Building, ChevronDown, ChevronRight, ExternalLink, Linkedin,
  Mail, MessageSquare, Send, UserPlus, Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchOutreachContacts, fetchOutreachMessages, fetchLinkedInStats } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";

// --- Types ---

type Contact = {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  company: string | null;
  role: string | null;
  source: string | null;
  created_at: string;
};

type Message = {
  id: string;
  contact_id: string | null;
  message_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
};

type LinkedInStats = {
  total: number;
  top_companies: { company: string; count: number }[];
  by_strength: Record<string, number>;
};

// --- Page ---

export default function RecruiterPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [linkedIn, setLinkedIn] = useState<LinkedInStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pipeline" | "linkedin">("pipeline");
  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      const [contactData, messageData, linkedInData] = await Promise.all([
        fetchOutreachContacts(),
        fetchOutreachMessages(),
        fetchLinkedInStats(),
      ]);
      if (id !== fetchIdRef.current) return;
      setContacts(contactData as Contact[]);
      setMessages(messageData as Message[]);
      setLinkedIn(linkedInData);
    } catch {
      // silent
    } finally {
      if (id === fetchIdRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  const sentMessages = messages.filter((m) => m.status === "sent");
  const draftMessages = messages.filter((m) => m.status === "draft");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Recruiter
        </h2>
        <button type="button" onClick={fetchAll} className="text-xs text-muted hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-2xl font-bold tabular-nums">{contacts.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Contacts</div>
        </div>
        <div className="rounded-lg border border-emerald/30 bg-emerald/5 p-4">
          <div className="text-2xl font-bold tabular-nums text-emerald">{sentMessages.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Sent</div>
        </div>
        <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
          <div className="text-2xl font-bold tabular-nums text-amber">{draftMessages.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Drafts</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-2xl font-bold tabular-nums">{linkedIn?.total ?? 0}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">LinkedIn</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["pipeline", "linkedin"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t === "pipeline" ? "Pipeline" : "LinkedIn Network"}
          </button>
        ))}
      </div>

      {tab === "pipeline" && (
        <div className="space-y-2">
          {contacts.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No outreach contacts yet</p>
            </div>
          ) : (
            contacts.map((contact) => {
              const expanded = expandedId === contact.id;
              const contactMessages = messages.filter((m) => m.contact_id === contact.id);

              return (
                <div
                  key={contact.id}
                  className="rounded-lg border border-border/60 bg-surface/50 hover:bg-surface-hover transition-colors"
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : contact.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{contact.name}</div>
                        <div className="flex items-center gap-3 text-[11px] text-muted mt-0.5">
                          {contact.company && (
                            <span className="flex items-center gap-0.5">
                              <Building className="w-3 h-3" />
                              {contact.company}
                            </span>
                          )}
                          {contact.role && <span>{contact.role}</span>}
                          {contact.source && <span className="text-muted/60">{contact.source}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {contactMessages.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent flex items-center gap-0.5">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {contactMessages.length}
                          </span>
                        )}
                        <span className="text-[10px] text-muted/60">{timeAgo(contact.created_at)}</span>
                        {expanded ? <ChevronDown className="w-3 h-3 text-muted/40" /> : <ChevronRight className="w-3 h-3 text-muted/40" />}
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-3 pb-3 pt-0 space-y-2">
                      <div className="h-px bg-border/40" />

                      <div className="flex items-center gap-3 text-[10px] text-muted">
                        {contact.email && (
                          <span className="flex items-center gap-0.5">
                            <Mail className="w-3 h-3" />{contact.email}
                          </span>
                        )}
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Linkedin className="w-3 h-3" />LinkedIn
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>

                      {contactMessages.length > 0 && (
                        <div className="space-y-1">
                          {contactMessages.map((msg) => (
                            <div key={msg.id} className="flex items-center justify-between text-[10px] rounded bg-background/60 px-2 py-1.5 border border-border/30">
                              <div className="flex items-center gap-2">
                                <Send className="w-3 h-3 text-muted" />
                                <span className="text-muted">{msg.message_type}</span>
                                <span className={
                                  msg.status === "sent" ? "text-emerald" :
                                  msg.status === "draft" ? "text-amber" :
                                  "text-muted"
                                }>
                                  {msg.status}
                                </span>
                              </div>
                              <span className="text-muted/60">{timeAgo(msg.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "linkedin" && linkedIn && (
        <div className="space-y-6">
          {/* Top Companies */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Top Companies</h3>
            <div className="space-y-1.5">
              {linkedIn.top_companies.map(({ company, count }) => {
                const pct = (count / linkedIn.total) * 100;
                return (
                  <div key={company} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-40 truncate">{company}</span>
                    <div className="flex-1 h-2 rounded-full bg-border/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/40"
                        style={{ width: `${Math.min(pct * 3, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted tabular-nums w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strength Distribution */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Relationship Strength</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(linkedIn.by_strength).map(([strength, count]) => (
                <div key={strength} className="rounded-lg border border-border/40 bg-surface/30 p-3 min-w-[100px]">
                  <div className="text-lg font-bold tabular-nums">{count}</div>
                  <div className="text-[10px] text-muted">{strength}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
