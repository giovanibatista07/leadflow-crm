import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { LocalDateTime } from "@/components/local-date-time";
import { AppShell } from "@/components/app-shell";
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
    <AppShell user={user}>
      <main className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <form action={markAllReadForm}>
              <button type="submit" className="!px-2.5 !py-1 !text-xs">
                Mark all as read ({unreadCount})
              </button>
            </form>
          )}
        </div>

        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                n.readAt ? "border-slate-100 bg-white" : "border-brand-200 bg-brand-50"
              }`}
            >
              {!n.readAt && <span className="badge badge-brand">new</span>}
              <span className="text-slate-800">{TYPE_LABELS[n.type] ?? n.type}</span>
              {n.lead && (
                <Link href={`/leads/${n.leadId}`}>
                  {n.lead.firstName} {n.lead.lastName}
                </Link>
              )}
              <span className="text-slate-400">
                <LocalDateTime iso={n.createdAt} />
              </span>
              {!n.readAt && (
                <form action={markReadForm} className="ml-auto">
                  <input type="hidden" name="notificationId" value={n.id} />
                  <button
                    type="submit"
                    className="!bg-white !px-2.5 !py-1 !text-xs !text-slate-700 !shadow-none !ring-1 !ring-slate-300 hover:!bg-slate-50"
                  >
                    Mark read
                  </button>
                </form>
              )}
            </li>
          ))}
          {notifications.length === 0 && <p>No notifications yet.</p>}
        </ul>
      </main>
    </AppShell>
  );
}
