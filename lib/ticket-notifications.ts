import type { SupabaseClient } from "@supabase/supabase-js";

// Ticket notifications shown by the bell in the shared header. The rules are
// the ones the ticket page has always used, moved here so every D3 page can
// show the same bell (QA BUG-D3-011):
// - Employee: only updates by HR/Manager on tickets the employee submitted
//   (status changes and follow-ups), worded for the reporter.
// - HR/Manager: incoming tickets from employees and tickets past their due date.
// Notification ids match the ids the ticket page used before, so tickets read
// on one page stay read on every page.

export type NotificationTicketStatus = "PENDING" | "TODO" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type NotificationRole = "EMPLOYEE" | "HR" | "MANAGER";

export type TicketNotification = {
  id: string;
  ticketId: string;
  ticketTitle: string;
  message: string;
  at: string;
  kind: "submitted" | "overdue" | "status" | "followup";
};

export type NotificationEvent = {
  // Status/created events use the d3_ticket_history row id; follow-ups use
  // `followup-<d3_ticket_followups id>`.
  id: string;
  kind: "created" | "status" | "followup" | "due";
  toStatus?: NotificationTicketStatus;
  actorEmployeeId: string | null;
  note?: string;
  at: string;
};

export type NotificationTicket = {
  dbId: string;
  ticketCode: string;
  title: string;
  employeeUuid: string;
  employeeName: string;
  department: string;
  status: NotificationTicketStatus;
  dueAt?: string;
  events: NotificationEvent[];
};

function shortText(value: string, max = 80) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function ticketNotificationCopy(language: "id" | "en") {
  if (language === "id") {
    return {
      notifications: "Notifikasi tiket",
      newNotifications: "ada notifikasi baru",
      hrNewTicket: (name: string, department: string) => `Tiket baru dari ${name}${department && department !== "-" ? ` · ${department}` : ""}.`,
      hrOverdue: "Melewati batas waktu dan belum selesai.",
      employeeStatus: (status: NotificationTicketStatus) => ({
        PENDING: "Status tiket Anda dikembalikan ke Menunggu.",
        TODO: "Tiket Anda sudah diterima HR dan masuk antrean.",
        IN_PROGRESS: "Tiket Anda sedang ditangani HR.",
        RESOLVED: "Tiket Anda sudah diselesaikan.",
        REJECTED: "Tiket Anda ditolak. Lihat riwayat tiket untuk keterangannya.",
      })[status],
      employeeFollowUp: (note: string) => `HR menambahkan tindak lanjut: "${shortText(note)}"`,
    };
  }
  return {
    notifications: "Ticket notifications",
    newNotifications: "new notifications",
    hrNewTicket: (name: string, department: string) => `New ticket from ${name}${department && department !== "-" ? ` · ${department}` : ""}.`,
    hrOverdue: "Past its due date and not finished yet.",
    employeeStatus: (status: NotificationTicketStatus) => ({
      PENDING: "Your ticket was moved back to Pending.",
      TODO: "HR received your ticket and queued it.",
      IN_PROGRESS: "HR is working on your ticket.",
      RESOLVED: "Your ticket has been resolved.",
      REJECTED: "Your ticket was rejected. Check the ticket history for details.",
    })[status],
    employeeFollowUp: (note: string) => `HR added a follow-up: "${shortText(note)}"`,
  };
}

export function buildTicketNotifications({
  role,
  viewerEmployeeId,
  tickets,
  syncedAt,
  language,
}: {
  role: NotificationRole | null;
  viewerEmployeeId: string;
  tickets: NotificationTicket[];
  syncedAt: number;
  language: "id" | "en";
}): TicketNotification[] {
  if (!role || !viewerEmployeeId) return [];
  const copy = ticketNotificationCopy(language);

  if (role === "EMPLOYEE") {
    return tickets
      .filter((ticket) => ticket.employeeUuid === viewerEmployeeId)
      .flatMap((ticket) => ticket.events.flatMap((event): TicketNotification[] => {
        if (event.actorEmployeeId === viewerEmployeeId) return [];
        if (event.kind === "status" && event.toStatus) {
          return [{ id: `status-${event.id}`, ticketId: ticket.ticketCode, ticketTitle: ticket.title, message: copy.employeeStatus(event.toStatus), at: event.at, kind: "status" }];
        }
        if (event.kind === "followup") {
          return [{ id: event.id, ticketId: ticket.ticketCode, ticketTitle: ticket.title, message: copy.employeeFollowUp(event.note ?? ""), at: event.at, kind: "followup" }];
        }
        return [];
      }))
      .sort((first, second) => second.at.localeCompare(first.at));
  }

  return tickets
    .flatMap((ticket): TicketNotification[] => {
      const items: TicketNotification[] = [];
      const created = ticket.events.find((event) => event.kind === "created");
      if (created && created.actorEmployeeId !== viewerEmployeeId) {
        const reporterName = ticket.employeeName || (language === "id" ? "Pegawai" : "Employee");
        items.push({ id: `submitted-${created.id}`, ticketId: ticket.ticketCode, ticketTitle: ticket.title, message: copy.hrNewTicket(reporterName, ticket.department), at: created.at, kind: "submitted" });
      }
      const isOpen = ticket.status !== "RESOLVED" && ticket.status !== "REJECTED";
      if (ticket.dueAt && isOpen && syncedAt && new Date(ticket.dueAt).getTime() < syncedAt) {
        items.push({ id: `overdue-${ticket.dbId}-${ticket.dueAt}`, ticketId: ticket.ticketCode, ticketTitle: ticket.title, message: copy.hrOverdue, at: ticket.dueAt, kind: "overdue" });
      }
      return items;
    })
    .sort((first, second) => second.at.localeCompare(first.at));
}

const readStorageKey = (authUserId: string) => `d3-ticket-read-notifications:${authUserId}`;

export function readTicketNotificationIds(authUserId: string): string[] {
  if (!authUserId || typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(readStorageKey(authUserId));
    const ids = saved ? JSON.parse(saved) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeTicketNotificationIds(authUserId: string, ids: string[]): string[] {
  const nextIds = Array.from(new Set(ids)).slice(-200);
  if (authUserId) {
    try {
      window.localStorage.setItem(readStorageKey(authUserId), JSON.stringify(nextIds));
    } catch {
      // Storage can be unavailable (private mode); the read state still applies for this visit.
    }
  }
  return nextIds;
}

export type TicketNotificationSource = {
  authUserId: string;
  role: NotificationRole;
  viewerEmployeeId: string;
  tickets: NotificationTicket[];
};

// Loads only what the bell needs, with the same tables and RLS as the ticket
// page. Returns null when there is no session or no D3 access.
export async function loadTicketNotificationSource(supabase: SupabaseClient): Promise<TicketNotificationSource | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: access }, { data: viewerEmployeeId }] = await Promise.all([
    supabase.from("b2_register").select("app_role").eq("auth_user_id", user.id).eq("is_active", true).maybeSingle(),
    supabase.rpc("d3_current_legacy_employee_uuid"),
  ]);
  const role = access?.app_role as NotificationRole | undefined;
  if (!role || typeof viewerEmployeeId !== "string" || !viewerEmployeeId) return null;

  const { data: ticketRows, error } = await supabase
    .from("d3_tickets")
    .select("id, ticket_code, employee_id, reporter_name, reporter_department, title, status, due_at")
    .order("created_at", { ascending: false });
  if (error || !ticketRows) return { authUserId: user.id, role, viewerEmployeeId, tickets: [] };

  const ticketIds = ticketRows.map((ticket) => ticket.id);
  const [historyResult, followUpResult] = ticketIds.length
    ? await Promise.all([
        supabase.from("d3_ticket_history").select("id, ticket_id, actor_employee_id, event_type, to_status, created_at").in("ticket_id", ticketIds).order("created_at"),
        supabase.from("d3_ticket_followups").select("id, ticket_id, actor_employee_id, note, follow_up_at, created_at").in("ticket_id", ticketIds).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const eventsByTicket = new Map<string, NotificationEvent[]>();
  const push = (ticketId: string, event: NotificationEvent) => {
    const current = eventsByTicket.get(ticketId) ?? [];
    current.push(event);
    eventsByTicket.set(ticketId, current);
  };
  for (const history of historyResult.data ?? []) {
    if (history.event_type === "CREATED") {
      push(history.ticket_id, { id: history.id, kind: "created", actorEmployeeId: history.actor_employee_id, at: history.created_at });
    } else if (history.event_type === "STATUS_CHANGED" && history.to_status) {
      push(history.ticket_id, { id: history.id, kind: "status", toStatus: history.to_status as NotificationTicketStatus, actorEmployeeId: history.actor_employee_id, at: history.created_at });
    }
  }
  for (const followUp of followUpResult.data ?? []) {
    push(followUp.ticket_id, { id: `followup-${followUp.id}`, kind: "followup", note: followUp.note, actorEmployeeId: followUp.actor_employee_id, at: followUp.follow_up_at ?? followUp.created_at });
  }

  return {
    authUserId: user.id,
    role,
    viewerEmployeeId,
    tickets: ticketRows.map((ticket) => ({
      dbId: ticket.id,
      ticketCode: ticket.ticket_code,
      title: ticket.title,
      employeeUuid: ticket.employee_id,
      employeeName: ticket.reporter_name ?? "",
      department: ticket.reporter_department ?? "-",
      status: ticket.status as NotificationTicketStatus,
      dueAt: ticket.due_at ?? undefined,
      events: (eventsByTicket.get(ticket.id) ?? []).sort((a, b) => a.at.localeCompare(b.at)),
    })),
  };
}
