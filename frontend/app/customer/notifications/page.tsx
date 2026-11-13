
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";
import {
  demoNotifications,
  type Notification,
} from "@/lib/customer";

// ==========================================
// CONFIGURATION
// ==========================================

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
    label: "VOUCHER PROMO",
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
    label: "VERIFICATION COMPLETE",
    color: "#42D99A",
    iconBg: "#211D3E",
  },
};

// ==========================================
// GROUPING
// ==========================================

function getGroup(time: string) {
  const value = time.toLowerCase();

  if (
    value.includes("yesterday") ||
    value.includes("1 day ago")
  ) {
    return "yesterday";
  }

  if (
    value.includes("week") ||
    value.includes("month") ||
    value.includes("days ago") ||
    value.includes("day ago")
  ) {
    return "week";
  }

  return "today";
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
        (item) => getGroup(item.time) === group.key
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
                src="/images/hero/home.jpg"
                alt=""
                className="h-10 w-12 shrink-0 rounded object-cover sm:h-12 sm:w-16"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold text-white sm:text-[11px]">
                  LYNORA WORLD TOUR — New York
                </p>

                <p className="mt-1 text-[9px] text-[#AAB0C5]">
                  Concert Ticket · E-Ticket
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
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#171B26]">

      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <h3 className="text-[11px] font-bold text-white">
          Your Upcoming Concert
        </h3>

        <span className="shrink-0 rounded-full bg-[#482039] px-2 py-1 text-[8px] font-bold text-[#FF8CA7]">
          Live Soon
        </span>
      </div>

      {/* POSTER */}
      <div className="relative h-32 overflow-hidden sm:h-36">
        <img
          src="/images/hero/home.jpg"
          alt="Upcoming concert"
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0C1122] via-transparent to-transparent" />

        <h3 className="absolute bottom-3 left-3 text-base font-black leading-tight text-white">
          LYNORA WORLD
          <br />
          TOUR
        </h3>
      </div>

      {/* COUNTDOWN */}
      <div className="grid grid-cols-4 gap-1.5 px-3 py-3">
        {[
          ["03", "DAYS"],
          ["14", "HRS"],
          ["22", "MIN"],
          ["09", "SEC"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-md bg-[#0C1122] py-2 text-center"
          >
            <p className="text-base font-black text-white">
              {value}
            </p>

            <p className="text-[8px] font-bold text-[#AAB0C5]">
              {label}
            </p>
          </div>
        ))}
      </div>
      {/* DETAILS */}
      <div className="space-y-3 px-3 pb-3">

        {/* TICKET STATUS */}
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

        {/* VENUE */}
        <div className="flex items-center gap-2">
          <img
            src="/icons/pin.png"
            alt=""
            className="h-4 w-4 object-contain"
          />

          <span className="text-[10px] text-[#AAB0C5]">
            Main Concert Venue
          </span>
        </div>

        {/* BUTTON */}
        <Link
          href="/customer/my-tickets"
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
      await navigator.clipboard.writeText("LYN-VIP2025");
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
        15% Off Festival Asia Tour 2025 Tickets
      </h3>

      <p className="mt-2 text-[10px] leading-relaxed text-[#C9C6E3]">
        Use this exclusive promo code and enjoy special benefits for LYNORA Global VIP members.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">

        <span className="flex-1 rounded-md bg-[#3A23A1] px-2 py-2 text-center text-[10px] font-extrabold text-white">
          LYN-VIP2025
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
  const [items, setItems] =
    useState<Notification[]>(demoNotifications);

  const [filter, setFilter] =
    useState<FilterType>("all");

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
          (item) => item.type === "ticket"
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

  // MARK ALL READ
  function markAllRead() {
    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        read: true,
      }))
    );
  }

  // TOGGLE READ
  function toggleRead(id: number) {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, read: !item.read }
          : item
      )
    );
  }

  return (
    <CustomerShell
      title="Notifications"
      subtitle="Latest updates about your tickets and concerts"
      actions={
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
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

            {groups.length > 0 ? (
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
