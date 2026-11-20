"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { API_URL, imageUrl, type User } from "@/lib/customer";

type CustomerUser = User & { photo_version?: number };
type SearchConfig = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type CustomerShellProps = {
  title: string;
  subtitle?: string;
  search?: SearchConfig;
  actions?: React.ReactNode;
  contentClassName?: string;
  children: React.ReactNode;
};

type NotificationCategory = "transaction" | "concert" | "system";

type NotificationItem = {
  id: number;
  category: NotificationCategory;
  title: string;
  description: string;
  time: string;
  icon: string;
  tone: "success" | "purple" | "blue" | "pink" | "yellow";
  read: boolean;
};

type ApiNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean | number;
  created_at: string;
};

function relativeTime(value: string) {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) return "-";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function mapApiNotification(row: ApiNotification): NotificationItem {
  const type = String(row.type || "").toLowerCase();

  if (type === "payment") {
    return {
      id: Number(row.id),
      category: "transaction",
      title: row.title,
      description: row.message,
      time: relativeTime(row.created_at),
      icon: "✓",
      tone: "success",
      read: Boolean(row.is_read),
    };
  }

  if (type === "ticket") {
    return {
      id: Number(row.id),
      category: "transaction",
      title: row.title,
      description: row.message,
      time: relativeTime(row.created_at),
      icon: "▰",
      tone: "purple",
      read: Boolean(row.is_read),
    };
  }

  if (type === "schedule" || type === "cancellation") {
    return {
      id: Number(row.id),
      category: "concert",
      title: row.title,
      description: row.message,
      time: relativeTime(row.created_at),
      icon: "▦",
      tone: "blue",
      read: Boolean(row.is_read),
    };
  }

  return {
    id: Number(row.id),
    category: "system",
    title: row.title,
    description: row.message,
    time: relativeTime(row.created_at),
    icon: "⚑",
    tone: "pink",
    read: Boolean(row.is_read),
  };
}

async function notificationRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Sesi login tidak ditemukan.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Failed to process notification");
  }

  return result as T;
}

const notificationTabs = [
  { id: "all", label: "All" },
  { id: "transaction", label: "Transaction" },
  { id: "concert", label: "Concert" },
  { id: "system", label: "System" },
] as const;

function getProfilePhoto(
  photo?: string | null,
  photoVersion?: number,
) {
  if (!photo) return "/icons/user.png";
  if (photo.startsWith("data:")) return photo;

  const photoBase = photo.startsWith("http") ? photo : imageUrl(photo);
  return `${photoBase}${photoBase.includes("?") ? "&" : "?"}v=${
    photoVersion || 0
  }`;
}

export default function CustomerShell({
  title,
  subtitle,
  search,
  actions,
  contentClassName = "",
  children,
}: CustomerShellProps) {
  const router = useRouter();

  const [user, setUser] = useState<CustomerUser | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] =
    useState<(typeof notificationTabs)[number]["id"]>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationActionLoading, setNotificationActionLoading] = useState(false);

  useEffect(() => {
    function loadUser() {
      try {
        const stored = localStorage.getItem("user");

        if (!stored) {
          setUser(null);
          return;
        }

        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("user");
        setUser(null);
      }
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    loadUser();

    window.addEventListener("lynora:user-updated", loadUser);
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("lynora:user-updated", loadUser);
      window.removeEventListener("storage", loadUser);
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        setNotificationsLoading(true);

        const result = await notificationRequest<{
          success: boolean;
          notifications: ApiNotification[];
        }>("/notifications");

        if (!active) return;

        const rows = Array.isArray(result.notifications)
          ? result.notifications
          : [];

        setNotifications(rows.map(mapApiNotification));
      } catch (error) {
        console.error("Load customer notifications:", error);
        if (active) setNotifications([]);
      } finally {
        if (active) setNotificationsLoading(false);
      }
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowProfileMenu(false);
        setShowNotificationsPanel(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("lynora:user-updated"));
    router.replace("/login");
  }

  async function markAllNotificationsRead() {
    if (unreadCount === 0 || notificationActionLoading) return;

    try {
      setNotificationActionLoading(true);

      await notificationRequest("/notifications/read-all", {
        method: "PATCH",
      });

      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      );
    } catch (error) {
      console.error("Mark all notifications read:", error);
    } finally {
      setNotificationActionLoading(false);
    }
  }

  async function openNotification(item: NotificationItem) {
    if (!item.read) {
      try {
        await notificationRequest(`/notifications/${item.id}/read`, {
          method: "PATCH",
        });

        setNotifications((current) =>
          current.map((notification) =>
            notification.id === item.id
              ? { ...notification, read: true }
              : notification,
          ),
        );
      } catch (error) {
        console.error("Mark notification read:", error);
      }
    }

    setShowNotificationsPanel(false);
    router.push("/customer/notifications");
  }

  const avatar = getProfilePhoto(
    user?.profile_photo,
    user?.photo_version,
  );

  const unreadCount = notifications.filter((item) => !item.read).length;

  const filteredNotifications = notifications.filter(
    (item) =>
      activeNotificationTab === "all" ||
      item.category === activeNotificationTab,
  );

  const categoryCounts = {
    all: notifications.length,
    transaction: notifications.filter(
      (item) => item.category === "transaction",
    ).length,
    concert: notifications.filter((item) => item.category === "concert")
      .length,
    system: notifications.filter((item) => item.category === "system").length,
  };

  return (
    <main className="cust-shell min-h-screen w-full overflow-x-clip bg-[#0B1122] text-white">
      <Sidebar fallbackRole="customer" />

      <div className="cust-main min-h-screen min-w-0 w-full pt-14 lg:ml-[205px] lg:w-[calc(100%-205px)] lg:pt-0">
        <header
          data-page={title.toLowerCase()}
          className="sticky top-14 z-30 w-full border-b border-white/[0.07] bg-[linear-gradient(90deg,#0D1328_0%,#162140_25%,#1E2B54_50%,#141C3D_70%,#0B1122_100%)] px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:top-0 lg:px-5 lg:py-2.5 xl:px-6"
        >
          <div
            className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 lg:gap-x-3 lg:gap-y-0 xl:gap-x-4 ${
              search
                ? "lg:grid-cols-[minmax(130px,1fr)_minmax(180px,340px)_auto] xl:grid-cols-[minmax(160px,1fr)_minmax(220px,360px)_auto]"
                : "lg:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_auto]"
            }`}
          >
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-white sm:text-base lg:text-lg">
                Halo, {user?.name?.split(" ")[0] || "Customer"} 👋
              </h1>
              <p className="mt-0.5 hidden max-w-full truncate text-[11px] text-slate-400 xl:block">
                {subtitle || "Ini yang sedang seru minggu ini di LYNORA"}
              </p>
            </div>

            <div
              className={`flex min-w-0 items-center justify-end gap-2 sm:gap-3 lg:row-start-1 lg:gap-3 xl:gap-4 ${
                search ? "lg:col-start-3" : "lg:col-start-2"
              }`}
            >
              {actions && (
                <div className="flex min-w-0 shrink items-center gap-2">
                  {actions}
                </div>
              )}

              {/* Notification bell and panel are visible on every customer page */}
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
                              onClick={() =>
                                setActiveNotificationTab(tab.id)
                              }
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
                                        item.read
                                          ? "text-slate-300"
                                          : "text-white"
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
                            href="/customer/notifications"
                            onClick={() =>
                              setShowNotificationsPanel(false)
                            }
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

              {/* Profile menu remains visible on every customer page */}
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
                    key={`${avatar}-${user?.photo_version || 0}`}
                    src={avatar}
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
                          {user?.name || "LYNORA User"}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {user?.email || ""}
                        </p>
                      </div>

                      <Link
                        href="/customer/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="mt-1 block rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        My Profile
                      </Link>

                      <Link
                        href="/customer/settings"
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

            {/* Shared header search is only rendered on pages that pass search props (Home). */}
            {search && (
              <label className="col-span-2 flex h-10 w-full min-w-0 items-center gap-2.5 rounded-xl border border-[#7E54DF] bg-[#161A25] px-3 transition focus-within:border-[#A78BFA] focus-within:ring-2 focus-within:ring-[#8B5CF6]/20 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:h-10 xl:h-11">
                <img
                  src="/icons/cari.png"
                  alt=""
                  className="h-4 w-4 shrink-0 object-contain opacity-80"
                />
                <input
                  type="search"
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={
                    search.placeholder ||
                    "Search concerts, artists, or venues..."
                  }
                  className="w-full min-w-0 bg-transparent text-[11px] text-white outline-none placeholder:text-[#A5A9B8] sm:text-xs lg:text-[11px] xl:text-sm"
                />
              </label>
            )}
          </div>
        </header>

        <div
          className={`cust-content min-h-[calc(100vh-56px)] w-full min-w-0 ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
