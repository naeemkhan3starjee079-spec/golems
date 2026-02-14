export type Contact = {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  company: string | null;
  role: string | null;
  source: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  contact_id: string | null;
  message_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
};

export type LinkedInStats = {
  total: number;
  top_companies: { company: string; count: number }[];
  by_strength: Record<string, number>;
};
