export type BacklogItem = {
  id: string;
  project: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  plan_name: string | null;
  phase: string | null;
};
