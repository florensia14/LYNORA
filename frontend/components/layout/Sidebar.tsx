
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Role = "customer" | "organizer" | "super_admin";
type Lang = "EN" | "ID";
type Theme = "Dark" | "Light";

type SidebarUser = {
  name?: string;
  email?: string;
  role?: Role;
  profile_photo?: string | null;
  photo_version?: number;
};

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const icon = (name: string) => `/icons/${name}.png`;
const iconActive = (name: string) => `/icons/${name}%20(1).png`;

const menus: Record<Role, MenuGroup[]> = {
  customer: [
    {
      title: "Main Menu",
      items: [
        { label: "Home", href: "/customer/home", icon: "home" },
        { label: "Explore Concerts", href: "/customer/explore", icon: "cari" },
      ],
    },
    {
      title: "My Activity",
      items: [
        { label: "Wishlist", href: "/customer/wishlist", icon: "wishlist" },
        { label: "My Tickets", href: "/customer/tickets", icon: "ticket" },
        { label: "My Orders", href: "/customer/orders", icon: "clipboard" },
        { label: "Notifications", href: "/customer/notifications", icon: "notif" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Profile", href: "/customer/profile", icon: "user" },
        { label: "Settings", href: "/customer/settings", icon: "setting" },
      ],
    },
  ],

  organizer: [
    {
      title: "Main Menu",
      items: [
        { label: "Dashboard", href: "/dashboard/organizer", icon: "home" },
        { label: "My Events", href: "/dashboard/organizer/events", icon: "ticket" },
        { label: "Create Event", href: "/dashboard/organizer/events/create", icon: "clipboard" },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Ticket Management", href: "/dashboard/organizer/tickets", icon: "ticket" },
        { label: "Orders & Sales", href: "/dashboard/organizer/orders", icon: "clipboard" },
        { label: "Analytics", href: "/dashboard/organizer/analytics", icon: "cari" },
        { label: "Notifications", href: "/dashboard/organizer/notifications", icon: "notif" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Profile", href: "/dashboard/organizer/profile", icon: "user" },
        { label: "Settings", href: "/dashboard/organizer/settings", icon: "setting" },
      ],
    },
  ],

  super_admin: [
    {
      title: "Main Menu",
      items: [
        { label: "Dashboard", href: "/dashboard/admin", icon: "home" },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "User Management", href: "/dashboard/admin/users", icon: "user" },
        { label: "Event Management", href: "/dashboard/admin/events", icon: "ticket" },
        { label: "Category Management", href: "/dashboard/admin/categories", icon: "clipboard" },
        { label: "Organizer Management", href: "/dashboard/admin/organizers", icon: "wishlist" },
        { label: "Transaction Management", href: "/dashboard/admin/transactions", icon: "ticket" },
        { label: "Reports", href: "/dashboard/admin/reports", icon: "cari" },
        { label: "Notifications", href: "/dashboard/admin/notifications", icon: "notif" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Profile", href: "/dashboard/admin/profile", icon: "user" },
        { label: "Settings", href: "/dashboard/admin/settings", icon: "setting" },
      ],
    },
  ],
};

const roleLabels: Record<Role, string> = {
  customer: "User",
  organizer: "Event Organizer",
  super_admin: "Super Admin",
};

const dashboardHome: Record<Role, string> = {
  customer: "/customer/home",
  organizer: "/dashboard/organizer",
  super_admin: "/dashboard/admin",
};

const profileHref: Record<Role, string> = {
  customer: "/customer/profile",
  organizer: "/dashboard/organizer/profile",
  super_admin: "/dashboard/admin/profile",
};

const settingsHref: Record<Role, string> = {
  customer: "/customer/settings",
  organizer: "/dashboard/organizer/settings",
  super_admin: "/dashboard/admin/settings",
};

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const UserIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const GearIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

const LangIcon = () => (
  <svg {...svgProps}>
    <path d="M4 5h9M8.5 3v2M6 5c.5 4 3 7 6 8M12 5c-.5 4-3 7-7 9" />
    <path d="m13 21 4-9 4 9M14.5 18h5" />
  </svg>
);

const MoonIcon = ({ small }: { small?: boolean }) => (
  <svg {...svgProps} {...(small ? { width: 14, height: 14 } : {})}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

const SunIcon = ({ small }: { small?: boolean }) => (
  <svg {...svgProps} {...(small ? { width: 14, height: 14 } : {})}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const LogoutIcon = () => (
  <svg {...svgProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

const Chevron = ({ up }: { up: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={`transition-transform duration-200 ${up ? "rotate-180" : ""}`}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; content: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-lg border border-white/10 bg-black/40 p-0.5">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`grid h-7 min-w-[28px] place-items-center rounded-md px-2 font-mono text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] ${
              selected
                ? "bg-gradient-to-r from-[#8B5CF6] to-[#6d4fe0] text-white"
                : "text-[#a8a29e] hover:text-white"
            }`}
          >
            {option.content}
          </button>
        );
      })}
    </div>
  );
}

// FOTO PROFIL
function getSidebarProfilePhoto(
  photo?: string | null,
  photoVersion?: number
) {
  if (!photo) return "/icons/user.png";

  // Base64 tidak boleh ditambahkan API URL atau query cache.
  if (photo.startsWith("data:")) return photo;

  // URL eksternal digunakan langsung.
  const photoBase = photo.startsWith("http")
    ? photo
    : `${API_ORIGIN}${photo.startsWith("/") ? "" : "/"}${photo}`;

  return `${photoBase}${photoBase.includes("?") ? "&" : "?"}v=${
    photoVersion || 0
  }`;
}

export default function Sidebar({
  fallbackRole = "customer",
}: {
  fallbackRole?: Role;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<SidebarUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("EN");
  const [theme, setTheme] = useState<Theme>("Dark");

  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const readUser = () => {
      try {
        const stored = localStorage.getItem("user");

        if (!stored) {
          setUser(null);
          return;
        }

        const parsed = JSON.parse(stored);

        if (["customer", "organizer", "super_admin"].includes(parsed.role)) {
          setUser(parsed);
        } else {
          setUser(null);
        }
      } catch {
        localStorage.removeItem("user");
        setUser(null);
      }
    };

    readUser();

    const savedLang = localStorage.getItem("lang") as Lang | null;
    const savedTheme = localStorage.getItem("theme") as Theme | null;

    if (savedLang === "EN" || savedLang === "ID") setLang(savedLang);
    if (savedTheme === "Dark" || savedTheme === "Light") setTheme(savedTheme);

    window.addEventListener("lynora:user-updated", readUser);

    const onStorage = (event: StorageEvent) => {
      if (event.key === "user") readUser();
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("lynora:user-updated", readUser);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "Dark");
    root.classList.toggle("light", theme === "Light");
  }, [theme]);

  useEffect(() => {
    setMobileOpen(false);
    setPopupOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!popupOpen) return;

    const onDown = (event: MouseEvent | TouchEvent) => {
      if (
        footerRef.current &&
        !footerRef.current.contains(event.target as Node)
      ) {
        setPopupOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopupOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [popupOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const role: Role = user?.role || fallbackRole;
  const menuGroups = menus[role];

  const isActive = useCallback(
    (href: string) =>
      pathname === href ||
      (href !== dashboardHome[role] && pathname.startsWith(`${href}/`)),
    [pathname, role]
  );

  function chooseLang(value: Lang) {
    setLang(value);
    localStorage.setItem("lang", value);
    window.dispatchEvent(new CustomEvent("lynora:lang", { detail: value }));
  }

  function chooseTheme(value: Theme) {
    setTheme(value);
    localStorage.setItem("theme", value);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(new Event("lynora:user-updated"));

    router.replace("/login");
  }

  const profilePhoto = getSidebarProfilePhoto(
    user?.profile_photo,
    user?.photo_version
  );

  const row =
    "group flex w-full min-w-0 items-center gap-2.5 rounded-xl p-1.5 text-left text-[13px] font-medium text-[#d6d3d1] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]";

  const tile =
    "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[#a8a29e] transition-colors group-hover:bg-[#8B5CF6]/20 group-hover:text-[#c4b5fd]";

  return (
    <>
      {/* MOBILE TOP BAR */}
      <header className="fixed inset-x-0 top-0 z-[60] flex h-14 items-center justify-between border-b border-[#8B5CF6]/40 bg-[#0B1122] px-4 lg:hidden">
        <Link
          href={dashboardHome[role]}
          className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-2xl font-black tracking-tight text-transparent"
        >
          LYNORA
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {/* MOBILE OVERLAY */}
      <button
        type="button"
        onClick={() => setMobileOpen(false)}
        aria-label="Close navigation overlay"
        className={`fixed inset-0 z-[65] bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(280px,85vw)] flex-col border-r border-[#8B5CF6]/70 bg-[#0B1122] text-[#f8f9ff] shadow-2xl transition-transform duration-300 ease-out lg:z-40 lg:w-[205px] lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* SIDEBAR HEADER */}
        <div className="flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 px-3">
          <Link
            href={dashboardHome[role]}
            className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-[25px] font-black leading-none tracking-tight text-transparent"
          >
            LYNORA
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] lg:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <span className="hidden h-9 w-9 place-items-center lg:grid">
            <img
              src="/icons/grid.png"
              alt=""
              className="h-[23px] w-[23px] object-contain"
            />
          </span>
        </div>

        {/* NAVIGATION */}
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <h3 className="mb-3 mt-2 px-1 text-[12px] font-bold text-[#727b96]">
                {group.title}
              </h3>

              <div className="grid gap-1.5">
                {group.items.map((item) => {
                  const selected = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={selected ? "page" : undefined}
                      className={`group flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] ${
                        selected
                          ? "bg-[linear-gradient(90deg,#22D3EE_0%,#332D87_3%,#332D87_100%)] font-bold text-white shadow-[0_4px_10px_rgba(34,211,238,0.16)]"
                          : "text-[#858da5] hover:bg-[#191e3a] hover:text-white"
                      }`}
                    >
                      <img
                        src={selected ? iconActive(item.icon) : icon(item.icon)}
                        alt=""
                        className="h-6 w-6 shrink-0 object-contain"
                      />

                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* FOOTER + PROFILE SETTINGS */}
        <div
          ref={footerRef}
          className="relative shrink-0 border-t border-white/10 bg-[#0B1122]"
        >
          {popupOpen && (
            <div
              role="menu"
              className="absolute inset-x-2 bottom-full z-10 mb-2 overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-[#141312] shadow-[0_16px_48px_rgba(0,0,0,0.65)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent" />

              <div className="relative max-h-[70vh] overflow-y-auto p-2">
                <div className="flex items-center gap-2.5 px-1.5 pb-2.5 pt-1.5">
                  <img
                    key={`${profilePhoto}-${user?.photo_version || 0}`}
                    src={profilePhoto}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#8B5CF6]/60"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/icons/user.png";
                    }}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-white">
                      {user?.name || "LYNORA User"}
                    </p>

                    <span className="mt-0.5 inline-block rounded-full bg-[#ff174f]/10 px-2 py-px text-[10px] font-semibold text-[#ff4d79]">
                      {roleLabels[role]}
                    </span>
                  </div>
                </div>

                <div className="mx-1 mb-1.5 h-px bg-white/10" />

                <Link href={profileHref[role]} role="menuitem" className={row}>
                  <span className={tile}>
                    <UserIcon />
                  </span>
                  Profile
                </Link>

                <Link href={settingsHref[role]} role="menuitem" className={row}>
                  <span className={tile}>
                    <GearIcon />
                  </span>
                  Settings
                </Link>

                <div role="group" aria-label="Language" className={row}>
                  <span className={tile}>
                    <LangIcon />
                  </span>

                  <span className="flex-1">Language</span>

                  <Segmented<Lang>
                    value={lang}
                    onChange={chooseLang}
                    options={[
                      { value: "EN", label: "English", content: "EN" },
                      { value: "ID", label: "Bahasa", content: "ID" },
                    ]}
                  />
                </div>

                <div role="group" aria-label="Theme" className={row}>
                  <span className={tile}>
                    {theme === "Dark" ? <MoonIcon /> : <SunIcon />}
                  </span>

                  <span className="flex-1">Theme</span>

                  <Segmented<Theme>
                    value={theme}
                    onChange={chooseTheme}
                    options={[
                      { value: "Dark", label: "Dark", content: <MoonIcon small /> },
                      { value: "Light", label: "Light", content: <SunIcon small /> },
                    ]}
                  />
                </div>

                <div className="mx-1 my-1.5 h-px bg-white/10" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-[13px] font-semibold text-[#f87171] transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <LogoutIcon />
                  Log Out
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPopupOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={popupOpen}
            className="flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8B5CF6]"
          >
            <img
              key={`${profilePhoto}-${user?.photo_version || 0}`}
              src={profilePhoto}
              alt="Profile"
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/icons/user.png";
              }}
            />

            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[12px] font-bold text-[#f8f9ff]">
                {user?.name || "LYNORA User"}
              </strong>

              <span className="mt-0.5 block text-[11px] text-[#ff174f]">
                {roleLabels[role]}
              </span>
            </div>

            <span className="shrink-0 text-[#6b7280]">
              <Chevron up={popupOpen} />
            </span>
          </button>

          <div className="h-px bg-[#41445b]" />

          <div className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text pb-2 pt-1.5 text-center text-[20px] font-medium leading-tight tracking-[3px] text-transparent">
            LYNORA
          </div>
        </div>
      </aside>
    </>
  );
}
