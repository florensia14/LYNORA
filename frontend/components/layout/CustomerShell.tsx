
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { imageUrl, type User } from "@/lib/customer";

type CustomerUser = User & {
  photo_version?: number;
};

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

function getProfilePhoto(
  photo?: string | null,
  photoVersion?: number
) {
  if (!photo) return "/icons/user.png";

  // Base64 harus digunakan langsung.
  if (photo.startsWith("data:")) return photo;

  // URL lengkap tidak perlu diproses dengan imageUrl.
  const photoBase = photo.startsWith("http")
    ? photo
    : imageUrl(photo);

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
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(new Event("lynora:user-updated"));

    router.replace("/login");
  }

  const avatar = getProfilePhoto(
    user?.profile_photo,
    user?.photo_version
  );

  return (
    <main className="cust-shell min-h-screen w-full overflow-x-clip bg-[#0b1020] text-white">
      <Sidebar fallbackRole="customer" />

      <div className="cust-main min-h-screen min-w-0 w-full pt-14 lg:ml-[205px] lg:w-[calc(100%-205px)] lg:pt-0">
        {/* HEADER */}
        <header
          data-page={title.toLowerCase()}
          className="sticky top-14 z-30 w-full border-b border-white/[0.07] bg-[#111a34]/95 px-3 py-3 backdrop-blur-xl sm:px-5 lg:top-0 lg:px-6 lg:py-3 xl:px-8"
        >
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 lg:grid-cols-[minmax(130px,1fr)_minmax(180px,380px)_auto] lg:gap-x-4 lg:gap-y-0 xl:grid-cols-[minmax(160px,1fr)_minmax(220px,400px)_auto] xl:gap-x-5">
            {/* GREETING */}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-white sm:text-base lg:text-lg">
                Hello, {user?.name?.split(" ")[0] || "Customer"}
              </h1>

              <p className="mt-0.5 hidden max-w-full truncate text-[11px] text-slate-400 xl:block">
                {subtitle ||
                  "Discover your next unforgettable experience."}
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3 lg:col-start-3 lg:row-start-1 lg:gap-3 xl:gap-4">
              {actions && (
                <div className="flex min-w-0 shrink items-center gap-2">
                  {actions}
                </div>
              )}

              {/* PROFILE AVATAR */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setShowProfileMenu((open) => !open)
                  }
                  aria-label="Open profile menu"
                  aria-expanded={showProfileMenu}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#7667e8] bg-[#222e4c] transition hover:scale-105 sm:h-10 sm:w-10"
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
                      aria-label="Close profile menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowProfileMenu(false)}
                    />

                    <div className="absolute right-0 top-12 z-50 w-[min(224px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/10 bg-[#17213c] p-2 shadow-2xl">
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

            {/* SEARCH */}
            <label className="col-span-2 flex h-10 w-full min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#222e4c] px-3 transition focus-within:border-[#7770ef] lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:h-10 xl:h-11">
              <img
                src="/icons/cari.png"
                alt=""
                className="h-4 w-4 shrink-0 object-contain opacity-70"
              />

              <input
                type="search"
                value={search?.value || ""}
                onChange={(event) =>
                  search?.onChange(event.target.value)
                }
                placeholder={
                  search?.placeholder ||
                  "Search concerts, artists, or venues..."
                }
                className="w-full min-w-0 bg-transparent text-[11px] text-white outline-none placeholder:text-slate-400 sm:text-xs lg:text-[11px] xl:text-sm"
              />
            </label>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div
          className={`cust-content min-h-[calc(100vh-56px)] w-full min-w-0 ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
