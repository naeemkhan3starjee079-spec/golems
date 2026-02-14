export type NotifEvent = {
  id: string;
  actor: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
};

export type Severity = "urgent" | "success" | "info";
