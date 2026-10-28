import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { LocalDateTime } from "@/components/local-date-time";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  NEW_ASSIGNMENT: "New lead assigned to you",
  HANDOFF: "A lead was handed off to you",
  STEP_DUE: "A step is due",
  MEETING_SOON: "A meeting is about to start",
  OVERDUE: "A lead is overdue",
};

async function markAllReadForm() {
  "use server";
  await markAllNotificationsRead();
}

async function markReadForm(formData: FormData) {
  "use server";
  await markNotificationRead(formData);
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: { lead: { select: { firstName: true, lastName: true } } },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Notifications</h1>

      {unreadCount > 0 && (
        <form action={markAllReadForm}>
          <button type="submit">Mark all as read ({unreadCount})</button>
        </form>
      )}

      <ul>
        {notifications.map((n) => (
          <li key={n.id}>
            {!n.readAt && <strong>• </strong>}
            {TYPE_LABELS[n.type] ?? n.type}
            {n.lead && (
              <>
                {" — "}
                <Link href={`/leads/${n.leadId}`}>
                  {n.lead.firstName} {n.lead.lastName}
                </Link>
              </>
            )}
            {" — "}
            <LocalDateTime iso={n.createdAt} />
            {!n.readAt && (
              <form action={markReadForm} style={{ display: "inline" }}>
                <input type="hidden" name="notificationId" value={n.id} />
                <button type="submit">Mark read</button>
              </form>
            )}
          </li>
        ))}
        {notifications.length === 0 && <li>No notifications yet.</li>}
      </ul>
    </main>
  );
}
