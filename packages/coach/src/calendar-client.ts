/**
 * Google Calendar Client for CoachGolem
 *
 * Reuses the same OAuth2 credentials as Gmail (with calendar.events scope).
 * Env vars: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 */

import { google, type calendar_v3 } from "googleapis";

const TIMEZONE = "Asia/Jerusalem";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  description?: string;
  status: "confirmed" | "tentative" | "cancelled";
}

let calendarClient: calendar_v3.Calendar | null = null;

export function createCalendarClient(): calendar_v3.Calendar {
  if (calendarClient) return calendarClient;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google credentials. Required: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN"
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  calendarClient = google.calendar({ version: "v3", auth: oauth2Client });
  return calendarClient;
}

export function _resetCalendarClient(): void {
  calendarClient = null;
}

export async function getEvents(
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const calendar = createCalendarClient();

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    timeZone: TIMEZONE,
  });

  return (response.data.items ?? [])
    .filter((item) => item.status !== "cancelled")
    .map(parseEvent);
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const now = new Date();
  // Build midnight in target timezone using Intl parts (avoids server-TZ mismatch)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value])
  );
  const startOfDay = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00`);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  return getEvents(startOfDay, endOfDay);
}

export async function getUpcomingEvents(
  days: number
): Promise<CalendarEvent[]> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return getEvents(now, end);
}

function parseEvent(item: calendar_v3.Schema$Event): CalendarEvent {
  const allDay = !item.start?.dateTime;
  const start = allDay
    ? new Date(item.start?.date ?? "")
    : new Date(item.start?.dateTime ?? "");
  const end = allDay
    ? new Date(item.end?.date ?? "")
    : new Date(item.end?.dateTime ?? "");

  return {
    id: item.id ?? "",
    summary: item.summary ?? "(No title)",
    start,
    end,
    allDay,
    location: item.location ?? undefined,
    description: item.description ?? undefined,
    status: (item.status as CalendarEvent["status"]) ?? "confirmed",
  };
}
