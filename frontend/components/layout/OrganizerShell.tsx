"use client";

import { useEffect, useMemo, useState } from "react";

import type { ReactNode } from "react";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import Sidebar from "./Sidebar";

type OrganizerUser = {
  name?: string;
  email?: string;
  profile_photo?: string | null;
  photo_version?: number;
};

type ApiNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean | number;
  created_at: string;
};

type NotificationItem = {
  id: string | number;
  title: string;
  description: string;
  time: string;
  read: boolean;
  icon: string;
  tone?: "success" | "purple" | "blue" | "pink" | "warning";
  href?: string;
};

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
)
  .replace(/\/api\/?$/, "").replace(/\/$/, "");

const notificationTabs = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
] as const;

type NotificationTab = (typeof notificationTabs)[number]["id"];


function mapNotification(row: ApiNotification): NotificationItem {
  const type = String(row.type || "").toLowerCase();
  const style = type === "payment"
    ? { icon: "💳", tone: "success" as const }
    : type === "ticket"
      ? { icon: "🎫", tone: "blue" as const }
      : type === "schedule"
        ? { icon: "🗓", tone: "warning" as const }
        : type === "cancellation"
          ? { icon: "⚠", tone: "pink" as const }
          : { icon: "📢", tone: "purple" as const };
  const date = new Date(row.created_at);
  const time = Number.isNaN(date.getTime()) ? "Baru saja" : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  return {
    id: row.id,
    title: row.title,
    description: row.message,
    time,
    read: Boolean(row.is_read),
    ...style,
  };
}

function getProfilePhoto(user: OrganizerUser | null) {
  if (!user?.profile_photo) return "/icons/user.png";
  const photo = user.profile_photo;
  if (photo.startsWith("data:")) return photo;
  const url = photo.startsWith("http")
    ? photo
    : `${API_ORIGIN}${photo.startsWith("/") ? "" : "/"}${photo}`;
  return `${url}${url.includes("?") ? "&" : "?"}v=${user.photo_version || 0}`;
}

export default function OrganizerShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<OrganizerUser | null>(null);
  const [search, setSearch] = useState("");
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] =
    useState<NotificationTab>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationActionLoading, setNotificationActionLoading] =
    useState(false);
  useEffect(() => {
    const readUser = () => {
      try {
        const stored = localStorage.getItem("user");
        setUser(stored ? JSON.parse(stored) : null);
      } catch {
        setUser(null);
      }
    };
    readUser();
    window.addEventListener("lynora:user-updated", readUser);
    window.addEventListener("storage", readUser);
    return () => {
      window.removeEventListener("lynora:user-updated", readUser);
      window.removeEventListener("storage", readUser);
    };
  }, []);
  useEffect(() => {
    setSearch("");
    setShowNotificationsPanel(false);
    setShowProfileMenu(false);
  }, [pathname]);
  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      setNotificationsLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API_ORIGIN}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load notifications");
        const data = await res.json();
        const rows: ApiNotification[] = Array.isArray(data.notifications) ? data.notifications : [];
        if (!cancelled) setNotifications(rows.map(mapNotification));
      } catch (error) {
        console.error("Load organizer notifications:", error);
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    }
    loadNotifications();
    const refresh = () => loadNotifications();
    const notificationPoll = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.clearInterval(notificationPoll);
    };
  }, []);
  const profilePhoto = getProfilePhoto(user);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );
  const categoryCounts: Record<NotificationTab, number> = {
    all: notifications.length,
    unread: unreadCount,
  };
  const filteredNotifications = useMemo(
    () =>
      activeNotificationTab === "unread"
        ? notifications.filter((item) => !item.read)
        : notifications,
    [notifications, activeNotificationTab]
  );
  async function markAllNotificationsRead() {
    if (unreadCount === 0 || notificationActionLoading) return;
    setNotificationActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ORIGIN}/api/notifications/read-all`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Gagal menandai notifikasi.");
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    } catch (error) {
      console.error("Mark all organizer notifications read:", error);
    } finally {
      setNotificationActionLoading(false);
    }
  }
  async function openNotification(item: NotificationItem) {
    if (!item.read) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_ORIGIN}/api/notifications/${item.id}/read`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Gagal memperbarui notifikasi.");
        setNotifications((items) => items.map((i) => i.id === item.id ? { ...i, read: true } : i));
      } catch (error) {
        console.error("Mark organizer notification read:", error);
      }
    }
    setShowNotificationsPanel(false);
    router.push(item.href || "/organizer/notifications");
  }
  function handleLogout() {
    // TODO: sesuaikan key storage & halaman login dengan project kamu
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setShowProfileMenu(false);
    router.push("/login");
  }
  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = search.trim();
    if (!keyword) return;
    router.push(
      `/organizer/manage-concert?search=${encodeURIComponent(keyword)}`
    );
  }
  return (
    <div className="min-h-screen bg-[#0B1122] text-white">
      <Sidebar fallbackRole="organizer" />
      {/* MAIN CONTENT */}
      <div
        className="min-h-screen pt-14 transition-[padding] duration-300 lg:pt-0 lg:pl-[var(--organizer-sidebar-width,205px)]"
      >
        {/* TOPBAR */}
        <header className="sticky top-14 z-30 w-full border-b border-white/[0.07] bg-[linear-gradient(90deg,#0D1328_0%,#162140_25%,#1E2B54_50%,#141C3D_70%,#0B1122_100%)] px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:top-0 lg:px-5 lg:py-2.5 xl:px-6">
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 lg:grid-cols-[minmax(130px,1fr)_minmax(180px,340px)_auto] lg:gap-x-3 lg:gap-y-0 xl:grid-cols-[minmax(160px,1fr)_minmax(220px,360px)_auto] xl:gap-x-4">
            {/* GREETING */}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-white sm:text-base lg:text-lg">
                Halo, {user?.name?.split(" ")[0] || "EO"} 👋
              </h1>
              <p className="mt-0.5 hidden max-w-full truncate text-[11px] text-slate-400 xl:block">
                Manage concerts and monitor your event's performance on LYNORA.
              </p>
            </div>
            {/* RIGHT ACTIONS */}
            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3 lg:col-start-3 lg:row-start-1 lg:gap-3 xl:gap-4">
              {/* NOTIFICATION */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationsPanel((open) => !open);
                    setShowProfileMenu(false);
                  }}
                  aria-label="Buka notifikasi"
                  aria-expanded={showNotificationsPanel}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition duration-200 sm:h-11 sm:w-11 ${
                    showNotificationsPanel
                      ? "border-[#8B5CF6] bg-[#28214B] shadow-[0_0_22px_rgba(139,92,246,0.22)]"
                      : "border-transparent bg-transparent hover:border-[#8B5CF6]/60 hover:bg-white/[0.06]"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-white sm:h-7 sm:w-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                    <path d="M12 2v1" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#111A34] bg-[#C30437] px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotificationsPanel && (
                  <>
                    <button
                      type="button"
                      aria-label="Tutup notifikasi"
                      onClick={() => setShowNotificationsPanel(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <section
                      className="absolute right-[-48px] top-[calc(100%+12px)] z-50 w-[min(370px,calc(100vw-20px))] overflow-hidden rounded-xl border border-[#7650C8]/70 bg-[linear-gradient(145deg,#111827_0%,#10182B_55%,#11172A_100%)] shadow-[0_18px_55px_rgba(0,0,0,0.58)] sm:right-[-48px] lg:right-[-42px]"
                      aria-label="Panel notifikasi"
                    >
                      <div className="absolute -top-[7px] right-[60px] h-3.5 w-3.5 rotate-45 border-l border-t border-[#7650C8]/70 bg-[#111827]" />
                      <div className="relative flex items-center justify-between gap-3 px-4 pb-3 pt-4">
                        <div>
                          <h2 className="text-base font-bold tracking-tight text-white">
                            Notifikasi
                          </h2>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {unreadCount > 0
                              ? `${unreadCount} unread notifications`
                              : "All notifications have been read"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          disabled={unreadCount === 0 || notificationActionLoading}
                          className="shrink-0 text-[11px] font-semibold text-[#C084FC] transition hover:text-[#22D3EE] disabled:cursor-default disabled:opacity-45 sm:text-sm"
                        >
                          ✓{" "}
                          <span className="hidden sm:inline">
                            Mark all as read
                          </span>
                          <span className="sm:hidden">See all</span>
                        </button>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
                        {notificationTabs.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveNotificationTab(tab.id)}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium transition ${
                              activeNotificationTab === tab.id
                                ? "border-[#8B5CF6] bg-[linear-gradient(100deg,#8B5CF6_0%,#6539D5_100%)] text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)]"
                                : "border-[#51416F]/70 bg-[#171D30] text-slate-300 hover:border-[#8B5CF6]/70 hover:text-white"
                            }`}
                          >
                            {tab.label} ({categoryCounts[tab.id]})
                          </button>
                        ))}
                      </div>
                      <div className="max-h-[min(330px,55vh)] overflow-y-auto px-4">
                        {notificationsLoading ? (
                          <div className="border-t border-white/[0.07] py-8 text-center text-[11px] text-slate-400">
                            Memuat notifikasi...
                          </div>
                        ) : filteredNotifications.length > 0 ? (
                          filteredNotifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openNotification(item)}
                              className="group flex w-full items-start gap-3 border-t border-white/[0.07] py-3 text-left transition hover:bg-white/[0.035] sm:gap-4"
                            >
                              <span
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl font-semibold ${
                                  item.tone === "success"
                                    ? "bg-[#063D35] text-[#00D68F]"
                                    : item.tone === "purple"
                                      ? "bg-[#39245E] text-[#C084FC]"
                                      : item.tone === "blue"
                                        ? "bg-[#17365B] text-[#38BDF8]"
                                        : item.tone === "pink"
                                          ? "bg-[#54213F] text-[#F472B6]"
                                          : "bg-[#4A3A17] text-[#FBBF24]"
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                  <span
                                    className={`text-[12px] font-bold ${
                                      item.read ? "text-slate-300" : "text-white"
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                  <span className="shrink-0 whitespace-nowrap text-[9px] text-slate-400">
                                    {item.time}
                                  </span>
                                </span>
                                <span className="mt-1 block text-[11px] leading-relaxed text-slate-300">
                                  {item.description}
                                </span>
                              </span>
                              {!item.read && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#C084FC] shadow-[0_0_10px_rgba(192,132,252,0.55)]" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="border-t border-white/[0.07] py-10 text-center">
                            <p className="text-sm font-semibold text-slate-300">
                              No notifications yet
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Notifications for this category will appear here.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-white/[0.08] px-4 py-3 text-center">
                        <Link
                          href="/organizer/notifications"
                          onClick={() => setShowNotificationsPanel(false)}
                          className="inline-flex items-center gap-2 text-xs font-bold text-[#D879F7] transition hover:text-[#22D3EE]"
                        >
                          See All Notifications{" "}
                          <span className="text-lg">→</span>
                        </Link>
                      </div>
                    </section>
                  </>
                )}
              </div>
              {/* PROFILE MENU */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu((open) => !open);
                    setShowNotificationsPanel(false);
                  }}
                  aria-label="Buka menu profil"
                  aria-expanded={showProfileMenu}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#7667E8] bg-[#222E4C] transition hover:scale-105 sm:h-10 sm:w-10"
                >
                  <img
                    key={`${profilePhoto}-${user?.photo_version || 0}`}
                    src={profilePhoto}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/icons/user.png";
                    }}
                  />
                </button>
                {showProfileMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Tutup menu profil"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 top-12 z-50 w-[min(224px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/10 bg-[#17213C] p-2 shadow-2xl">
                      <div className="border-b border-white/10 px-3 py-3">
                        <p className="truncate text-sm font-semibold text-white">
                          {user?.name || "LYNORA Organizer"}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {user?.email || ""}
                        </p>
                      </div>
                      <Link
                        href="/organizer/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="mt-1 block rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/organizer/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-400 transition hover:bg-rose-500/10"
                      >
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* SEARCH */}
            <form
              onSubmit={handleSearch}
              className="col-span-2 flex h-10 w-full min-w-0 items-center gap-2.5 rounded-xl border border-[#7E54DF] bg-[#161A25] px-3 transition focus-within:border-[#A78BFA] focus-within:ring-2 focus-within:ring-[#8B5CF6]/20 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:h-10 xl:h-11"
            >
              <img
                src="/icons/cari.png"
                alt=""
                className="h-4 w-4 shrink-0 object-contain opacity-80"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search concerts, artists, or venues..."
                aria-label="Search concerts"
                className="w-full min-w-0 bg-transparent text-[11px] text-white outline-none placeholder:text-[#A5A9B8] sm:text-xs lg:text-[11px] xl:text-sm"
              />
            </form>
          </div>
        </header>
        <main className="min-h-screen px-4 pb-10 pt-5 sm:px-6 lg:px-7 lg:pt-7 xl:px-9">
          {children}
        </main>
      </div>
    </div>
  );
}
