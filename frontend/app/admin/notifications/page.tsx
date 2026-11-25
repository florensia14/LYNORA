"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";

// ======================================================
// TYPES
// ======================================================

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean | number;
  created_at: string;
  event_name?: string | null;
};

type Filter = "all" | "unread" | "read";

// ======================================================
// CONSTANTS
// ======================================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

// ======================================================
// API HELPERS
// ======================================================

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

async function notificationApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Gagal memproses notifikasi."
    );
  }

  return result as T;
}

// ======================================================
// FORMAT HELPERS
// ======================================================

function relativeTime(value: string): string {
  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) return "Baru saja";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - time) / 60000)
  );

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} hari lalu`;

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function iconFor(type: string): string {
  const normalized = String(type || "").toLowerCase();

  if (
    normalized.includes("payment") ||
    normalized.includes("order") ||
    normalized.includes("ticket") ||
    normalized.includes("transaction") ||
    normalized.includes("refund")
  ) {
    return "/icons/ticket.png";
  }

  if (
    normalized.includes("event") ||
    normalized.includes("concert") ||
    normalized.includes("schedule") ||
    normalized.includes("approval") ||
    normalized.includes("publish")
  ) {
    return "/icons/spotlight.png";
  }

  if (
    normalized.includes("user") ||
    normalized.includes("customer") ||
    normalized.includes("organizer") ||
    normalized.includes("account")
  ) {
    return "/icons/user (1).png";
  }

  if (
    normalized.includes("promo") ||
    normalized.includes("announcement")
  ) {
    return "/icons/flash-sale.png";
  }

  return "/icons/notification (3).png";
}

// ======================================================
// REUSABLE COMPONENTS
// ======================================================

function NotificationIcon({
  type,
  isRead,
}: {
  type: string;
  isRead: boolean;
}) {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#8B5CF6]/20 bg-[#29204D]">
      <img
        src={iconFor(type)}
        alt=""
        className="h-5 w-5 object-contain"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />

      {!isRead && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#11182B] bg-[#22D3EE]" />
      )}
    </div>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (value: Filter) => void;
}) {
  return (
    <div className="flex rounded-xl border border-white/10 bg-[#0B1122] p-1">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
            value === filter.id
              ? "bg-[#35266A] text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

// ======================================================
// MAIN PAGE
// ======================================================

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ====================================================
  // FETCH NOTIFICATIONS
  // ====================================================

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await notificationApi<{
        success: boolean;
        notifications?: NotificationItem[];
      }>("/notifications");

      setItems(
        (result.notifications || []).map((item) => ({
          ...item,
          id: Number(item.id),
          is_read: Boolean(item.is_read),
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil notifikasi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // ====================================================
  // NOTIFICATION COUNTS
  // ====================================================

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items]
  );

  const readCount = useMemo(
    () => items.filter((item) => Boolean(item.is_read)).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread") return !item.is_read;
      if (filter === "read") return Boolean(item.is_read);

      return true;
    });
  }, [items, filter]);

  // ====================================================
  // MARK ONE AS READ
  // ====================================================

  async function markOneRead(id: number) {
    const selected = items.find((item) => item.id === id);

    if (!selected || selected.is_read || busy) return;

    try {
      setBusy(true);
      setError("");

      await notificationApi(
        `/notifications/${id}/read`,
        { method: "PATCH" }
      );

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui notifikasi."
      );
    } finally {
      setBusy(false);
    }
  }

  // ====================================================
  // MARK ALL AS READ
  // ====================================================

  async function markAllRead() {
    if (!unreadCount || busy) return;

    try {
      setBusy(true);
      setError("");

      await notificationApi(
        "/notifications/read-all",
        { method: "PATCH" }
      );

      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui notifikasi."
      );
    } finally {
      setBusy(false);
    }
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="min-h-full w-full space-y-6 pb-10 text-white">

      {/* ==============================================
          PAGE HERO
      ============================================== */}

      <AdminPageHero
        eyebrow="SUPER ADMIN CENTER"
        title="Notifications"
        description="Stay informed about platform activities, organizer updates, concert approvals, transactions, and system announcements."
      >
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Unread
          </p>

          <p className="mt-0.5 text-xl font-extrabold text-[#C4B5FD]">
            {unreadCount}
          </p>
        </div>

        <button
          type="button"
          onClick={markAllRead}
          disabled={!unreadCount || busy}
          className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-purple-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Processing..." : "Mark all as read"}
        </button>
      </AdminPageHero>

      {/* ==============================================
          NOTIFICATION STATISTICS
      ============================================== */}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-[#11182B] p-3.5">
          <p className="text-[10px] font-medium text-slate-400">
            Total Notifications
          </p>

          <p className="mt-2 text-xl font-extrabold text-white">
            {items.length.toLocaleString("id-ID")}
          </p>

          <p className="mt-1 text-[9px] text-slate-500">
            All received notifications
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#11182B] p-3.5">
          <p className="text-[10px] font-medium text-slate-400">
            Unread Notifications
          </p>

          <p className="mt-2 text-xl font-extrabold text-[#22D3EE]">
            {unreadCount.toLocaleString("id-ID")}
          </p>

          <p className="mt-1 text-[9px] text-slate-500">
            Require your attention
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-white/[0.07] bg-[#11182B] p-3.5 sm:col-span-1">
          <p className="text-[10px] font-medium text-slate-400">
            Read Notifications
          </p>

          <p className="mt-2 text-xl font-extrabold text-[#A78BFA]">
            {readCount.toLocaleString("id-ID")}
          </p>

          <p className="mt-1 text-[9px] text-slate-500">
            Already reviewed
          </p>
        </div>
      </section>

      {/* ==============================================
          NOTIFICATION CONTENT
      ============================================== */}

      <section className="rounded-2xl border border-white/[0.08] bg-[#11182B] p-4 sm:p-5">

        {/* HEADER */}

        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold">
              All Notifications
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {items.length} notifications received
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            {/* FILTER */}

            <FilterTabs
              value={filter}
              onChange={setFilter}
            />

            {/* REFRESH */}

            <button
              type="button"
              onClick={() => void loadNotifications()}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh notifications"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0B1122] text-slate-300 transition hover:border-[#8B5CF6]/50 hover:text-white disabled:opacity-40"
            >
              <span className="text-lg">↻</span>
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-amber-200">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="text-[10px] font-bold text-white underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />

            <p className="mt-3 text-xs text-slate-400">
              Loading notifications...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (

          /* EMPTY STATE */

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0B1122]/60 px-5 py-14 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#30235A]">
              <img
                src="/icons/notification (3).png"
                alt=""
                className="h-7 w-7 object-contain"
              />
            </div>

            <p className="text-sm font-bold text-slate-200">
              {filter === "unread"
                ? "No new notifications"
                : filter === "read"
                  ? "No read notifications yet"
                  : "No notifications yet"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Your platform activity notifications will appear here.
            </p>
          </div>
        ) : (

          /* NOTIFICATION LIST */

          <div className="divide-y divide-white/[0.06]">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className={`group flex gap-3 rounded-xl px-3 py-4 transition hover:bg-white/[0.025] sm:gap-4 ${
                  !item.is_read
                    ? "bg-[#8B5CF6]/[0.045]"
                    : ""
                }`}
              >

                {/* ICON */}

                <NotificationIcon
                  type={item.type}
                  isRead={Boolean(item.is_read)}
                />

                {/* CONTENT */}

                <div className="min-w-0 flex-1">

                  <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">

                    <div className="min-w-0">

                      <h3
                        className={`text-sm ${
                          item.is_read
                            ? "font-semibold text-slate-300"
                            : "font-bold text-white"
                        }`}
                      >
                        {item.title}
                      </h3>

                      <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-400">
                        {item.message}
                      </p>

                      {item.event_name && (
                        <p className="mt-2 inline-flex rounded-md bg-[#202A4F] px-2 py-1 text-[10px] font-semibold text-[#B9C7FF]">
                          {item.event_name}
                        </p>
                      )}

                    </div>

                    <span className="shrink-0 text-[10px] text-slate-500">
                      {relativeTime(item.created_at)}
                    </span>

                  </div>

                  {/* MARK AS READ */}

                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => void markOneRead(item.id)}
                      disabled={busy}
                      className="mt-3 text-[10px] font-bold text-[#B9A5FF] transition hover:text-white disabled:opacity-50"
                    >
                      Mark as read
                    </button>
                  )}

                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
