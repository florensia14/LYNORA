"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";
import { API_URL, imageUrl } from "@/lib/customer";

// ==========================================
// CONFIGURATION
// ==========================================


type NotificationKind = "ticket" | "promo" | "reminder" | "system";

type Notification = {
  id: number;
  title: string;
  message: string;
  time: string;
  created_at: string;
  type: NotificationKind;
  read: boolean;
  event_id: number | null;
  event_name?: string | null;
  poster_url?: string | null;
  start_date?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
};

type TicketRow = {
  ticket_id: number;
  ticket_code: string;
  ticket_status: string;
  order_status: string;
  event_id: number;
  event_name: string;
  start_date: string;
  end_date: string | null;
  poster_url: string | null;
  venue_name: string | null;
  venue_address: string | null;
};

type Countdown = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const EMPTY_COUNTDOWN: Countdown = {
  days: "00",
  hours: "00",
  minutes: "00",
  seconds: "00",
};

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

async function customerApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  if (!token) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Permintaan ke server gagal.");
  }
  return result as T;
}

function mapNotificationType(type: string): NotificationKind {
  switch (type) {
    case "ticket":
      return "ticket";
    case "payment":
      return "system";
    case "schedule":
    case "cancellation":
      return "reminder";
    case "announcement":
    default:
      return "promo";
  }
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "-";

  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getGroup(createdAt: string) {
  const date = new Date(createdAt);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday && date < startOfToday) return "yesterday";
  return "week";
}

type FilterType =
  | "all"
  | "unread"
  | "transactions"
  | "schedule"
  | "promo";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "transactions", label: "Transactions & Payments" },
  { key: "schedule", label: "Schedule & Venue" },
  { key: "promo", label: "Promo & Profile" },
];

const TYPE_CONFIG: Record<
  Notification["type"],
  {
    icon: string;
    label: string;
    color: string;
    iconBg: string;
  }
> = {
  ticket: {
    icon: "/icons/ticket (2).png",
    label: "TICKET ISSUED",
    color: "#FF7777",
    iconBg: "#211D3E",
  },
  promo: {
    icon: "/icons/notification (3).png",
    label: "ANNOUNCEMENT",
    color: "#FF7777",
    iconBg: "#211D3E",
  },
  reminder: {
    icon: "/icons/spotlight (1).png",
    label: "STAGE SCHEDULE",
    color: "#F5C85B",
    iconBg: "#211D3E",
  },
  system: {
    icon: "/icons/star (1).png",
    label: "PAYMENT CONFIRMED",
    color: "#42D99A",
    iconBg: "#211D3E",
  },
};

// ==========================================
// GROUPING
// ==========================================

function getGroupFromDate(createdAt: string) {
  const date = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date >= today) return "today";
  if (date >= yesterday && date < today) return "yesterday";
  return "week";
}

function getGroups(items: Notification[]) {
  const config = [
    {
      key: "today",
      title: "TODAY",
      subtitle: "important notifications",
    },
    {
      key: "yesterday",
      title: "YESTERDAY",
      subtitle: "update",
    },
    {
      key: "week",
      title: "THIS WEEK",
      subtitle: "Announcements & Venue Updates",
    },
  ];

  return config
    .map((group) => ({
      ...group,
      items: items.filter(
        (item) => getGroupFromDate(item.created_at) === group.key
      ),
    }))
    .filter((group) => group.items.length > 0);
}

// ==========================================
// ICONS
// ==========================================

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ==========================================
// ACTION BUTTON
// ==========================================

function NotificationAction({
  type,
}: {
  type: Notification["type"];
}) {
  const actions = {
    ticket: {
      label: "View Ticket",
      href: "/customer/tickets",
    },
    reminder: {
      label: "View Event",
      href: "/customer/explore",
    },
    promo: {
      label: "Buy Now",
      href: "/customer/explore",
    },
    system: {
      label: "View Transaction",
      href: "/customer/my-orders",
    },
  };

  const action = actions[type];

  return (
    <Link
      href={action.href}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#8B5CF6] px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#7543E8]"
    >
      {action.label}
    </Link>
  );
}

// ==========================================
// NOTIFICATION CARD
// ==========================================

function NotificationCard({
  item,
  onRead,
}: {
  item: Notification;
  onRead: () => void;
}) {
  const config = TYPE_CONFIG[item.type];

  return (
    <article
      className="relative overflow-hidden rounded-lg border border-white/[0.06] transition hover:border-[#8B5CF6]/50"
      style={{
        background:
          "linear-gradient(90deg, #8B5CF6 0%, #171B26 1.5%, #171B26 100%)",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onRead}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRead();
          }
        }}
        className="flex cursor-pointer gap-3 p-3 sm:p-4"
      >
        {/* ICON */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
          style={{ background: config.iconBg }}
        >
          <img
            src={config.icon}
            alt=""
            className="h-7 w-7 object-contain"
          />
        </div>

        {/* CONTENT */}
        <div className="min-w-0 flex-1">

          {/* LABEL + TIME */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-extrabold tracking-wide sm:text-[10px]"
                style={{ color: config.color }}
              >
                {config.label}
              </span>

              {!item.read && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
              )}
            </div>

            <span className="shrink-0 text-[9px] text-[#85899B]">
              {item.time}
            </span>
          </div>

          {/* TITLE */}
          <h3 className="mt-1.5 text-[12px] font-bold leading-snug text-white sm:text-[13px]">
            {item.title}
          </h3>

          {/* DESCRIPTION */}
          <p className="mt-1 text-[10px] leading-relaxed text-[#AAB0C5] sm:text-[11px]">
            {item.message}
          </p>

          {/* TICKET PREVIEW */}
          {item.type === "ticket" && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-white/5 bg-[#0C1122] p-2">
              <img
                src={item.poster_url ? imageUrl(item.poster_url) : "/images/hero/home.jpg"}
                alt=""
                className="h-10 w-12 shrink-0 rounded object-cover sm:h-12 sm:w-16"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold text-white sm:text-[11px]">
                  {item.event_name || "Concert ticket"}
                </p>

                <p className="mt-1 text-[9px] text-[#AAB0C5]">
                  {item.start_date ? new Date(item.start_date).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Concert Ticket"} · E-Ticket
                </p>
              </div>

              <NotificationAction type={item.type} />
            </div>
          )}

          {/* OTHER ACTIONS */}
          {item.type !== "ticket" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">

              {item.type === "reminder" && (
                <>
                  <span className="rounded-full border border-[#908FA0]/40 px-3 py-1 text-[9px] text-[#AAB0C5]">
                    View Event Details
                  </span>

                  <span className="rounded-full border border-[#908FA0]/40 px-3 py-1 text-[9px] text-[#AAB0C5]">
                    Get Location
                  </span>
                </>
              )}

              {item.type === "promo" && (
                <NotificationAction type={item.type} />
              )}

              {item.type === "system" && (
                <span className="rounded-full border border-[#908FA0]/40 px-3 py-1 text-[9px] text-[#AAB0C5]">
                  View Transaction Receipt
                </span>
              )}

            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ==========================================
// GROUP HEADER
// ==========================================

function GroupHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-5 w-1 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#22D3EE]" />

      <h3 className="text-[11px] font-extrabold text-white sm:text-xs">
        {title}
      </h3>

      <span className="text-[10px] font-semibold text-[#8B5CF6]">
        · {count} {subtitle}
      </span>
    </div>
  );
}

// ==========================================
// UPCOMING CONCERT
// ==========================================

function UpcomingConcert() {
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<Countdown>(EMPTY_COUNTDOWN);

  useEffect(() => {
    let active = true;

    async function loadUpcomingConcert() {
      try {
        setLoading(true);
        const result = await customerApi<{ success?: boolean; data?: TicketRow[] }>(
          "/tickets/my-tickets"
        );
        if (!active) return;

        const now = Date.now();
        const upcoming = (Array.isArray(result.data) ? result.data : [])
          .filter((row) => {
            const ticketStatus = String(row.ticket_status || "").toLowerCase().trim();
            const orderStatus = String(row.order_status || "").toLowerCase().trim();
            const start = new Date(row.start_date).getTime();

            return (
              ticketStatus === "valid" &&
              orderStatus === "paid" &&
              Number.isFinite(start) &&
              start > now
            );
          })
          .sort(
            (a, b) =>
              new Date(a.start_date).getTime() -
              new Date(b.start_date).getTime()
          );

        // Group tickets by event so multiple tickets for one concert do not duplicate the card.
        const nearestEvent = upcoming[0];
        setTicket(nearestEvent || null);
      } catch (error) {
        console.error("Load upcoming concert:", error);
        if (active) setTicket(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUpcomingConcert();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ticket) {
      setCountdown(EMPTY_COUNTDOWN);
      return;
    }

    const target = new Date(ticket.start_date).getTime();

    function updateCountdown() {
      const diff = target - Date.now();
      if (!Number.isFinite(target) || diff <= 0) {
        setCountdown(EMPTY_COUNTDOWN);
        return;
      }

      setCountdown({
        days: String(Math.floor(diff / 86400000)).padStart(2, "0"),
        hours: String(Math.floor((diff / 3600000) % 24)).padStart(2, "0"),
        minutes: String(Math.floor((diff / 60000) % 60)).padStart(2, "0"),
        seconds: String(Math.floor((diff / 1000) % 60)).padStart(2, "0"),
      });
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [ticket]);

  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#171B26]">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <h3 className="text-[11px] font-bold text-white">
          Your Upcoming Concert
        </h3>
        {ticket && (
          <span className="shrink-0 rounded-full bg-[#482039] px-2 py-1 text-[8px] font-bold text-[#FF8CA7]">
            Live Soon
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid min-h-[250px] place-items-center px-3 text-[10px] text-[#AAB0C5]">
          Loading your upcoming concert...
        </div>
      ) : !ticket ? (
        <div className="px-4 pb-5 pt-3 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#211D3E] text-xl">
            🎫
          </div>
          <h4 className="mt-3 text-[11px] font-bold text-white">
            No Upcoming Concert
          </h4>
          <p className="mt-1 text-[9px] leading-relaxed text-[#AAB0C5]">
            Konser yang sudah dibayar dan belum dimulai akan muncul di sini.
          </p>
          <Link
            href="/customer/explore"
            className="mt-3 inline-flex rounded-md bg-[#8B5CF6] px-3 py-2 text-[9px] font-bold text-white transition hover:bg-[#7543E8]"
          >
            Explore Concerts
          </Link>
        </div>
      ) : (
        <>
          {/* POSTER */}
          <div className="relative h-32 overflow-hidden sm:h-36">
            {ticket.poster_url ? (
              <img
                src={imageUrl(ticket.poster_url)}
                alt={ticket.event_name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.opacity = "0";
                }}
              />
            ) : (
              <div className="grid h-full place-items-center bg-[#0C1122] text-[10px] text-[#AAB0C5]">
                Concert poster unavailable
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1122] via-transparent to-transparent" />
            <h3 className="absolute bottom-3 left-3 right-3 line-clamp-2 text-base font-black leading-tight text-white">
              {ticket.event_name}
            </h3>
          </div>

          {/* REAL COUNTDOWN */}
          <div className="grid grid-cols-4 gap-1.5 px-3 py-3">
            {[
              [countdown.days, "DAYS"],
              [countdown.hours, "HRS"],
              [countdown.minutes, "MIN"],
              [countdown.seconds, "SEC"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-md bg-[#0C1122] py-2 text-center"
              >
                <p className="text-base font-black text-white">{value}</p>
                <p className="text-[8px] font-bold text-[#AAB0C5]">{label}</p>
              </div>
            ))}
          </div>

          {/* DETAILS */}
          <div className="space-y-3 px-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/ticket (2).png"
                  alt=""
                  className="h-4 w-4 object-contain"
                />
                <span className="text-[10px] text-[#AAB0C5]">
                  Event Ticket Status
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#42D99A]">
                Valid
              </span>
            </div>

            <div className="flex items-start gap-2">
              <img
                src="/icons/pin.png"
                alt=""
                className="mt-0.5 h-4 w-4 object-contain"
              />
              <span className="text-[10px] leading-relaxed text-[#AAB0C5]">
                {ticket.venue_name || "Venue not available"}
                {ticket.venue_address ? `, ${ticket.venue_address}` : ""}
              </span>
            </div>

            <p className="pl-6 text-[9px] text-[#AAB0C5]">
              {new Date(ticket.start_date).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>

            <Link
              href="/customer/tickets"
              className="mt-2 flex items-center justify-center gap-2 rounded-md bg-[#8B5CF6] py-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#7543E8]"
            >
              <img
                src="/icons/flash-sale.png"
                alt=""
                className="h-5 w-5 object-contain"
              />
              Open Fast Track Ticket
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

// ==========================================
// PROMO CARD
// ==========================================

function PromoCard() {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText("EXPLORE-LYNORA");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-white/10 p-3 sm:p-4"
      style={{
        background:
          "linear-gradient(110deg, #2A1550 0%, #4B2FD9 60%, #7C2FA0 100%)",
      }}
    >
      <span className="inline-flex rounded-md bg-[#5B479A] px-2 py-1.5 text-[8px] font-extrabold text-white">
        VIP CARD · LYNORA Black Card
      </span>

      <h3 className="mt-3 text-[12px] font-black leading-relaxed text-white">
        Discover the latest LYNORA concert offers
      </h3>

      <p className="mt-2 text-[10px] leading-relaxed text-[#C9C6E3]">
        Check the Explore page for available concert promotions and ticket offers.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">

        <span className="flex-1 rounded-md bg-[#3A23A1] px-2 py-2 text-center text-[10px] font-extrabold text-white">
          EXPLORE-LYNORA
        </span>

        <button
          type="button"
          onClick={copyCode}
          className="rounded-md bg-white px-3 py-2 text-[9px] font-extrabold text-[#30204F] transition hover:bg-[#EDE9FE]"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>

      </div>
    </section>
  );
}

// ==========================================
// SUPPORT CARD
// ==========================================

function SupportCard() {
  return (
    <a
      href="mailto:support@lynora.com"
      className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#171B26] p-3 transition hover:border-[#8B5CF6]/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#211D3E] text-[#C7BBFF]">
        <BellIcon />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[10px] font-bold text-white">
          Notification or Ticket Issues?
        </h3>

        <p className="mt-1 text-[9px] leading-relaxed text-[#AAB0C5]">
          Live chat support available 24/7
        </p>
      </div>

      <ArrowIcon />
    </a>
  );
}

// ==========================================
// EMPTY STATE
// ==========================================

function EmptyNotifications() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#171B26] px-4 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#211D3E] text-[#C7BBFF]">
        <BellIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-white">
        No Notifications
      </h3>

      <p className="mt-2 text-sm text-[#AAB0C5]">
        Your latest updates will appear here.
      </p>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [filter, setFilter] =
    useState<FilterType>("all");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        setLoading(true);
        setError("");
        const result = await customerApi<{ notifications?: Array<{
          id: number;
          event_id: number | null;
          title: string;
          message: string;
          type: string;
          is_read: boolean | number;
          created_at: string;
          event_name?: string | null;
          poster_url?: string | null;
          start_date?: string | null;
          venue_name?: string | null;
          venue_address?: string | null;
        }> }>("/notifications");

        if (!active) return;

        const mapped: Notification[] = (result.notifications || []).map((row) => ({
          id: Number(row.id),
          title: row.title,
          message: row.message,
          created_at: row.created_at,
          time: formatRelativeTime(row.created_at),
          type: mapNotificationType(row.type),
          read: Boolean(row.is_read),
          event_id: row.event_id,
          event_name: row.event_name,
          poster_url: row.poster_url,
          start_date: row.start_date,
          venue_name: row.venue_name,
          venue_address: row.venue_address,
        }));

        setItems(mapped);
      } catch (err) {
        console.error("Load notifications:", err);
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal mengambil notifikasi.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  // UNREAD COUNT
  const unreadCount = items.filter(
    (item) => !item.read
  ).length;

  // FILTER DATA
  const visible = useMemo(() => {
    switch (filter) {
      case "unread":
        return items.filter((item) => !item.read);

      case "transactions":
        return items.filter(
          (item) => item.type === "ticket" || item.type === "system"
        );

      case "schedule":
        return items.filter(
          (item) => item.type === "reminder"
        );

      case "promo":
        return items.filter(
          (item) =>
            item.type === "promo" ||
            item.type === "system"
        );

      default:
        return items;
    }
  }, [items, filter]);

  // GROUP DATA
  const groups = useMemo(
    () => getGroups(visible),
    [visible]
  );

  // MARK ALL READ — persist to backend first.
  async function markAllRead() {
    if (unreadCount === 0 || actionLoading) return;

    try {
      setActionLoading(true);
      await customerApi("/notifications/read-all", { method: "PATCH" });
      setItems((previous) =>
        previous.map((item) => ({ ...item, read: true }))
      );
    } catch (err) {
      console.error("Mark all notifications read:", err);
      setError(err instanceof Error ? err.message : "Gagal memperbarui notifikasi.");
    } finally {
      setActionLoading(false);
    }
  }

  // Mark one notification as read — only this signed-in user's row can be updated.
  async function toggleRead(id: number) {
    const selected = items.find((item) => item.id === id);
    if (!selected || selected.read || actionLoading) return;

    try {
      await customerApi(`/notifications/${id}/read`, { method: "PATCH" });
      setItems((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, read: true } : item
        )
      );
    } catch (err) {
      console.error("Mark notification read:", err);
      setError(err instanceof Error ? err.message : "Gagal memperbarui notifikasi.");
    }
  }

  return (
    <CustomerShell
      title="Notifications"
      subtitle="Latest updates about your tickets and concerts"
      actions={
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0 || actionLoading}
          className="rounded-lg border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-2 text-[10px] font-bold text-[#C7BBFF] transition hover:bg-[#8B5CF6] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
        >
          Mark all as read
        </button>
      }
    >
      <main className="w-full space-y-5 pb-8">

        {/* =====================================
            HEADER
        ===================================== */}

        <section>
          <div className="flex flex-wrap items-center gap-2">

            <span className="rounded-full bg-[#123D37] px-2.5 py-1 text-[9px] font-extrabold text-[#55E5B4]">
              ● LIVE UPDATES
            </span>

            <span className="rounded-full bg-[#1B1633] px-2.5 py-1 text-[9px] font-extrabold text-[#C7BBF2]">
              {items.length} CONCERT ACTIVITIES
            </span>

          </div>

          <h1 className="mt-3 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
            Notification Center
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#AAB0C5] sm:text-sm">
            Latest updates on ticket purchases, payment confirmations,
            concert schedule changes, and exclusive promos curated
            just for you.
          </p>
        </section>

        {/* =====================================
            FILTER
        ===================================== */}

        <section className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-full border px-3 py-2 text-[10px] font-bold transition sm:text-[11px] ${
                filter === tab.key
                  ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                  : "border-[#908FA0]/40 bg-transparent text-[#AAB0C5] hover:border-[#8B5CF6] hover:text-white"
              }`}
            >
              {tab.label}

              {tab.key === "unread" && (
                <span> ({unreadCount})</span>
              )}
            </button>
          ))}
        </section>

        {/* =====================================
            MAIN GRID
        ===================================== */}

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_230px] lg:grid-cols-[minmax(0,1fr)_250px] xl:grid-cols-[minmax(0,1fr)_270px]">

          {/* LEFT COLUMN */}
          <section className="min-w-0 space-y-5">

            {loading ? (
              <div className="rounded-xl border border-white/10 bg-[#171B26] px-4 py-12 text-center text-xs text-[#AAB0C5]">Loading notifications...</div>
            ) : error ? (
              <div className="rounded-xl border border-[#FF7777]/20 bg-[#171B26] px-4 py-8 text-center">
                <p className="text-xs text-[#FF9999]">{error}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-md bg-[#8B5CF6] px-3 py-2 text-[10px] font-bold text-white">Try Again</button>
              </div>
            ) : groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.key}>

                  <GroupHeader
                    title={group.title}
                    subtitle={group.subtitle}
                    count={group.items.length}
                  />

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <NotificationCard
                        key={item.id}
                        item={item}
                        onRead={() => toggleRead(item.id)}
                      />
                    ))}
                  </div>

                </div>
              ))
            ) : (
              <EmptyNotifications />
            )}

          </section>

          {/* RIGHT COLUMN */}
          <aside className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">

            <UpcomingConcert />

            <PromoCard />

            <div className="sm:col-span-2 md:col-span-1">
              <SupportCard />
            </div>

          </aside>

        </div>
      </main>
    </CustomerShell>
  );
}
