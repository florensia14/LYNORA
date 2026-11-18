"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { imageUrl, type User } from "@/lib/customer";

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

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    category: "transaction",
    title: "Pembayaran Berhasil",
    description:
      "Pembayaran untuk pesanan ORD-20261118-042 berhasil dikonfirmasi.",
    time: "5 menit lalu",
    icon: "✓",
    tone: "success",
    read: false,
  },
  {
    id: 2,
    category: "transaction",
    title: "E-Ticket Diterbitkan",
    description:
      "E-Ticket untuk konser BLACKPINK WORLD TOUR sudah tersedia. Lihat di menu My Tickets.",
    time: "10 menit lalu",
    icon: "▰",
    tone: "purple",
    read: false,
  },
  {
    id: 3,
    category: "concert",
    title: "Perubahan Jadwal Konser",
    description:
      "Jadwal konser LANY — Soft World Tour diubah menjadi 25 Jan 2027.",
    time: "2 jam lalu",
    icon: "▦",
    tone: "blue",
    read: false,
  },
  {
    id: 4,
    category: "system",
    title: "Pengumuman Sistem",
    description:
      "Akan ada maintenance sistem pada 20 Nov 2026 pukul 01:00 – 03:00 WIB.",
    time: "6 jam lalu",
    icon: "⚑",
    tone: "pink",
    read: false,
  },
  {
    id: 5,
    category: "concert",
    title: "Konser Baru Ditambahkan",
    description:
      "Konser Avenged Sevenfold kini tersedia di LYNORA. Cek dan amankan tiketnya sekarang!",
    time: "8 jam lalu",
    icon: "☆",
    tone: "yellow",
    read: false,
  },
];

const notificationTabs = [
  { id: "all", label: "Semua" },
  { id: "transaction", label: "Transaksi" },
  { id: "concert", label: "Konser" },
  { id: "system", label: "Sistem" },
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
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

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

  function markAllNotificationsRead() {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }

  function openNotification(item: NotificationItem) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === item.id
          ? { ...notification, read: true }
          : notification,
      ),
    );

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
                        className="absolute right-[-54px] top-[calc(100%+17px)] z-50 w-[min(540px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#7650C8]/70 bg-[linear-gradient(145deg,#111827_0%,#10182B_55%,#11172A_100%)] shadow-[0_22px_70px_rgba(0,0,0,0.58)] sm:right-[-58px] lg:right-[-52px]"
                        aria-label="Panel notifikasi"
                      >
                        <div className="absolute -top-[7px] right-[72px] h-3.5 w-3.5 rotate-45 border-l border-t border-[#7650C8]/70 bg-[#111827]" />

                        <div className="relative flex items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-6">
                          <div>
                            <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                              Notifikasi
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {unreadCount > 0
                                ? `${unreadCount} notifikasi belum dibaca`
                                : "Semua notifikasi sudah dibaca"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            disabled={unreadCount === 0}
                            className="shrink-0 text-xs font-semibold text-[#C084FC] transition hover:text-[#22D3EE] disabled:cursor-default disabled:opacity-45 sm:text-sm"
                          >
                            ✓{" "}
                            <span className="hidden sm:inline">
                              Tandai semua dibaca
                            </span>
                            <span className="sm:hidden">Baca semua</span>
                          </button>
                        </div>

                        <div className="flex gap-1.5 overflow-x-auto px-4 pb-4 sm:gap-2 sm:px-6">
                          {notificationTabs.map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() =>
                                setActiveNotificationTab(tab.id)
                              }
                              className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-medium transition sm:px-4 sm:text-sm ${
                                activeNotificationTab === tab.id
                                  ? "border-[#8B5CF6] bg-[linear-gradient(100deg,#8B5CF6_0%,#6539D5_100%)] text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)]"
                                  : "border-[#51416F]/70 bg-[#171D30] text-slate-300 hover:border-[#8B5CF6]/70 hover:text-white"
                              }`}
                            >
                              {tab.label} ({categoryCounts[tab.id]})
                            </button>
                          ))}
                        </div>

                        <div className="max-h-[min(470px,60vh)] overflow-y-auto px-4 sm:px-6">
                          {filteredNotifications.length > 0 ? (
                            filteredNotifications.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => openNotification(item)}
                                className="group flex w-full items-start gap-3 border-t border-white/[0.07] py-4 text-left transition hover:bg-white/[0.035] sm:gap-4"
                              >
                                <span
                                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl font-semibold ${
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
                                      className={`text-sm font-bold ${
                                        item.read
                                          ? "text-slate-300"
                                          : "text-white"
                                      }`}
                                    >
                                      {item.title}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-[10px] text-slate-400 sm:text-xs">
                                      {item.time}
                                    </span>
                                  </span>
                                  <span className="mt-1 block text-xs leading-relaxed text-slate-300 sm:text-[13px]">
                                    {item.description}
                                  </span>
                                </span>

                                {!item.read && (
                                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C084FC] shadow-[0_0_10px_rgba(192,132,252,0.55)]" />
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="border-t border-white/[0.07] py-10 text-center">
                              <p className="text-sm font-semibold text-slate-300">
                                Belum ada notifikasi
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Notifikasi kategori ini akan muncul di sini.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-white/[0.08] px-5 py-4 text-center sm:px-6">
                          <Link
                            href="/customer/notifications"
                            onClick={() =>
                              setShowNotificationsPanel(false)
                            }
                            className="inline-flex items-center gap-2 text-sm font-bold text-[#D879F7] transition hover:text-[#22D3EE]"
                          >
                            Lihat Semua Notifikasi{" "}
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
