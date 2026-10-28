import "server-only";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { createOAuthClient } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/token";
import { decideCalendarAction, type ActivityOutcomeForCalendar } from "@/lib/calendar/engine";

const EVENT_DURATION_MS = 30 * 60 * 1000;

function calendarClient(accessToken: string) {
  const auth = createOAuthClient();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

/**
 * Syncs the lead's one current calendar event to match a logged outcome
 * (SPEC.md: "Meetings and call-backs booked in the CRM are created as
 * calendar events... Rescheduling or cancelling in the CRM updates the
 * event"). Silently does nothing if the advisor hasn't connected Google,
 * or if the Calendar API call fails (an expired/narrower-scope token from
 * before this feature shipped, a transient error) -- calendar sync is a
 * side effect, never something that should block logging the activity.
 */
export async function syncLeadCalendarEvent(
  userId: string,
  companyId: string,
  leadId: string,
  outcome: ActivityOutcomeForCalendar,
  scheduledAt: Date | undefined,
): Promise<void> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId },
    select: { calendarEventId: true, firstName: true, lastName: true },
  });
  if (!lead) return;

  const action = decideCalendarAction(outcome, scheduledAt, lead.calendarEventId != null);
  if (action.kind === "none") return;

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return;

  const calendar = calendarClient(accessToken);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  try {
    if (action.kind === "cancel") {
      if (lead.calendarEventId) {
        await calendar.events.delete({ calendarId: "primary", eventId: lead.calendarEventId });
      }
      await prisma.lead.update({ where: { id: leadId }, data: { calendarEventId: null } });
      return;
    }

    const requestBody = {
      summary: `Call back: ${lead.firstName} ${lead.lastName}`,
      description: appUrl ? `LeadFlow CRM lead: ${appUrl}/leads/${leadId}` : `LeadFlow CRM lead ${leadId}`,
      start: { dateTime: action.start.toISOString() },
      end: { dateTime: new Date(action.start.getTime() + EVENT_DURATION_MS).toISOString() },
    };

    const eventId = lead.calendarEventId
      ? (await calendar.events.update({ calendarId: "primary", eventId: lead.calendarEventId, requestBody }))
          .data.id
      : (await calendar.events.insert({ calendarId: "primary", requestBody })).data.id;

    if (eventId) {
      await prisma.lead.update({ where: { id: leadId }, data: { calendarEventId: eventId } });
    }
  } catch {
    // Side effect only -- the activity log / outcome itself already succeeded.
  }
}
