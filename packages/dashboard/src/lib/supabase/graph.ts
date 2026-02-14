import { createClient } from "./client";

const BUCKET = "brain-graphs";
const FILE_NAME = "graph.json";

/** Upload graph.json to Supabase Storage for the current user */
export async function uploadGraph(file: File): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const path = `${user.id}/${FILE_NAME}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  return { error: error?.message ?? null };
}

/** Download graph.json from Supabase Storage for the current user */
export async function downloadGraph(): Promise<{ data: unknown; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const path = `${user.id}/${FILE_NAME}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path);

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "No data" };

  const text = await data.text();
  return { data: JSON.parse(text), error: null };
}

/** Check if user has uploaded a brain graph */
export async function hasUploadedGraph(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.storage
    .from(BUCKET)
    .list(user.id, { limit: 1, search: FILE_NAME });

  return (data?.length ?? 0) > 0;
}
