/**
 * Outreach Database - Supabase Backend
 *
 * Same interface as outreach-db.ts but backed by Supabase.
 * Active when STATE_BACKEND=supabase.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Contact,
  ContactSource,
  Outreach,
  OutreachStatus,
  OutreachStats,
  CompanyResearch,
  CompanyResearchData,
  CreateContactInput,
  CreateOutreachInput,
  SaveCompanyResearchInput,
} from "./outreach-db";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY required for cloud outreach-db");
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============ Contact Functions ============

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const { data, error } = await getClient()
    .from("outreach_contacts")
    .insert({
      name: input.name,
      email: input.email || null,
      linkedin_url: input.linkedinUrl || null,
      company: input.company,
      role: input.role,
      source: input.source,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create contact: ${error?.message}`);

  return mapContact(data);
}

export async function getContact(id: string): Promise<Contact | null> {
  const { data } = await getClient()
    .from("outreach_contacts")
    .select("*")
    .eq("id", id)
    .single();

  return data ? mapContact(data) : null;
}

export async function getContactsByCompany(company: string): Promise<Contact[]> {
  const { data } = await getClient()
    .from("outreach_contacts")
    .select("*")
    .eq("company", company)
    .order("created_at", { ascending: false });

  return (data || []).map(mapContact);
}

// ============ Outreach Functions ============

export async function createOutreach(input: CreateOutreachInput): Promise<Outreach> {
  const { data, error } = await getClient()
    .from("outreach_messages")
    .insert({
      job_id: input.jobId,
      contact_id: input.contactId,
      message_type: input.messageType,
      message_text: input.messageText,
      status: "draft",
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create outreach: ${error?.message}`);

  return mapOutreach(data);
}

export async function getOutreach(id: string): Promise<Outreach | null> {
  const { data } = await getClient()
    .from("outreach_messages")
    .select("*")
    .eq("id", id)
    .single();

  return data ? mapOutreach(data) : null;
}

export async function getOutreachByJob(jobId: string): Promise<Outreach[]> {
  const { data } = await getClient()
    .from("outreach_messages")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  return (data || []).map(mapOutreach);
}

export async function updateOutreachStatus(id: string, status: OutreachStatus): Promise<Outreach> {
  const updates: Record<string, unknown> = { status };
  const now = new Date().toISOString();

  if (status === "sent") updates.sent_at = now;
  if (status === "responded") updates.sent_at = updates.sent_at || now;

  const { error } = await getClient()
    .from("outreach_messages")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(`Failed to update outreach: ${error.message}`);

  return (await getOutreach(id))!;
}

export async function getPendingFollowups(daysOld: number = 5): Promise<Outreach[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const { data } = await getClient()
    .from("outreach_messages")
    .select("*")
    .eq("status", "sent")
    .lt("sent_at", cutoff.toISOString())
    .order("sent_at", { ascending: true });

  return (data || []).map(mapOutreach);
}

export async function getOutreachStats(): Promise<OutreachStats> {
  const { data } = await getClient()
    .from("outreach_messages")
    .select("status");

  const rows = data || [];
  const total = rows.length;
  const draft = rows.filter((r) => r.status === "draft").length;
  const sent = rows.filter((r) => r.status === "sent").length;
  const responded = rows.filter((r) => r.status === "responded").length;
  const noResponse = rows.filter((r) => r.status === "no_response").length;

  const nonDraft = sent + responded + noResponse;
  const responseRate = nonDraft > 0 ? (responded / nonDraft) * 100 : 0;

  return {
    total,
    draft,
    sent,
    responded,
    noResponse,
    responseRate: Math.round(responseRate * 100) / 100,
  };
}

// ============ Company Research ============

export async function saveCompanyResearch(input: SaveCompanyResearchInput): Promise<CompanyResearch> {
  const { data, error } = await getClient()
    .from("outreach_companies")
    .upsert({
      company_name: input.companyName,
      data: input.data,
      researched_at: new Date().toISOString(),
    }, { onConflict: "company_name" })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to save company research: ${error?.message}`);

  return {
    id: data.id,
    companyName: data.company_name,
    data: data.data as CompanyResearchData,
    researchedAt: data.researched_at,
  };
}

export async function getCompanyResearch(companyName: string): Promise<CompanyResearch | null> {
  const { data } = await getClient()
    .from("outreach_companies")
    .select("*")
    .eq("company_name", companyName)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    companyName: data.company_name,
    data: data.data as CompanyResearchData,
    researchedAt: data.researched_at,
  };
}

// ============ Mappers ============

function mapContact(row: any): Contact {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    linkedinUrl: row.linkedin_url,
    company: row.company,
    role: row.role,
    source: row.source as ContactSource,
    createdAt: row.created_at,
  };
}

function mapOutreach(row: any): Outreach {
  return {
    id: row.id,
    jobId: row.job_id,
    contactId: row.contact_id,
    messageType: row.message_type,
    messageText: row.message_text,
    status: row.status as OutreachStatus,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    respondedAt: null, // outreach_messages table doesn't have responded_at
  };
}
