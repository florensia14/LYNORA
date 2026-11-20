"use client";

import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

import { useCallback, useEffect, useMemo, useState } from "react";

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

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("authToken");
}

async function notificationApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Failed to process notification.");
  return result as T;
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Baru saja";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function iconFor(type: string) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("payment") || normalized.includes("order") || normalized.includes("ticket")) return "/icons/ticket.png";
  if (normalized.includes("event") || normalized.includes("concert") || normalized.includes("schedule")) return "/icons/spotlight.png";
  if (normalized.includes("promo") || normalized.includes("announcement")) return "/icons/flash-sale.png";
  return "/icons/notification (3).png";
}

export default function OrganizerNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await notificationApi<{ notifications?: NotificationItem[] }>("/notifications");
      setItems((result.notifications || []).map((item) => ({ ...item, id: Number(item.id), is_read: Boolean(item.is_read) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotifications(); }, [loadNotifications]);

  const unreadCount = items.filter((item) => !item.is_read).length;
  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter === "unread") return !item.is_read;
    if (filter === "read") return Boolean(item.is_read);
    return true;
  }), [items, filter]);

  async function markOneRead(id: number) {
    const selected = items.find((item) => item.id === id);
    if (!selected || selected.is_read || busy) return;
    try {
      setBusy(true);
      await notificationApi(`/notifications/${id}/read`, { method: "PATCH" });
      setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notifications.");
    } finally { setBusy(false); }
  }

  async function markAllRead() {
    if (!unreadCount || busy) return;
    try {
      setBusy(true);
      await notificationApi("/notifications/read-all", { method: "PATCH" });
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notifications.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-full w-full space-y-6 pb-10 text-white">
      <OrganizerPageHero eyebrow="ORGANIZER CENTER" title="Notifications" description="Stay up to date with concerts, orders, and event activity.">
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unread</p>
          <p className="mt-0.5 text-xl font-extrabold text-[#C4B5FD]">{unreadCount}</p>
        </div>
        <button onClick={markAllRead} disabled={!unreadCount || busy} className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#5456DE] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-purple-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Mark all as read</button>
      </OrganizerPageHero>

      <section className="rounded-2xl border border-white/[0.08] bg-[#11182B] p-4 sm:p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold">All Notifications</h2>
            <p className="mt-1 text-xs text-slate-500">{items.length} notifications received</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-[#0B1122] p-1">
              {(["all", "unread", "read"] as Filter[]).map((value) => (
                <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold capitalize transition ${filter === value ? "bg-[#35266A] text-white shadow" : "text-slate-400 hover:text-white"}`}>{value === "all" ? "All" : value === "unread" ? "Unread" : "Read"}</button>
              ))}
            </div>
            <button onClick={() => void loadNotifications()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0B1122] text-slate-300 transition hover:border-[#8B5CF6]/50 hover:text-white" title="Refresh" aria-label="Refresh notifications"><span className="text-lg">↻</span></button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">{error}</div>}
        {loading ? <div className="py-16 text-center text-sm text-slate-400">Loading notifications...</div> : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0B1122]/60 px-5 py-14 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#30235A]"><img src="/icons/notification (3).png" alt="" className="h-7 w-7 object-contain" /></div>
            <p className="text-sm font-bold text-slate-200">{filter === "unread" ? "Tidak ada notifikasi baru" : filter === "read" ? "No read notifications yet" : "No notifications yet"}</p>
            <p className="mt-1 text-xs text-slate-500">Organizer activity notifications will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredItems.map((item) => (
              <article key={item.id} className={`group flex gap-3 rounded-xl px-3 py-4 transition hover:bg-white/[0.025] sm:gap-4 ${!item.is_read ? "bg-[#8B5CF6]/[0.045]" : ""}`}>
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#8B5CF6]/20 bg-[#29204D]">
                  <img src={iconFor(item.type)} alt="" className="h-5 w-5 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  {!item.is_read && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#11182B] bg-[#22D3EE]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h3 className={`text-sm ${item.is_read ? "font-semibold text-slate-300" : "font-bold text-white"}`}>{item.title}</h3>
                      <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-400">{item.message}</p>
                      {item.event_name && <p className="mt-2 inline-flex rounded-md bg-[#202A4F] px-2 py-1 text-[10px] font-semibold text-[#B9C7FF]">{item.event_name}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-500">{relativeTime(item.created_at)}</span>
                  </div>
                  {!item.is_read && <button onClick={() => void markOneRead(item.id)} disabled={busy} className="mt-3 text-[10px] font-bold text-[#B9A5FF] transition hover:text-white disabled:opacity-50">Mark as read</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
