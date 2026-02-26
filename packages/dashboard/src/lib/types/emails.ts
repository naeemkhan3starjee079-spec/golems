export type Email = {
  id: string;
  subject: string | null;
  from_address: string | null;
  snippet: string | null;
  score: number | null;
  category: string | null;
  received_at: string;
  human_score: number | null;
  human_category: string | null;
};

export type EmailSender = {
  email_address: string;
  display_name: string | null;
  domain: string | null;
  category: string | null;
  total_emails: number;
  avg_score: number | null;
  user_action: string | null;
  last_email_at: string | null;
};

export type EmailStats = {
  total: number;
  by_category: Record<string, number>;
  last_24h: number;
  urgent: number;
};
