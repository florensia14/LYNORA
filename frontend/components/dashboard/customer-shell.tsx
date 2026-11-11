"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import { imageUrl, type User } from "@/lib/customer";

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

export default function CustomerShell({
  title,
  subtitle,
  search,
  actions,
  contentClassName,
  children,
}: CustomerShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const stored = localStorage.getItem("user");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem("user");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  const avatar = user?.profile_photo
    ? imageUrl(user.profile_photo)
    : "/icons/user.png";

  return (
    <main className="cust-shell">
      <Sidebar fallbackRole="customer" />

      <div className="cust-main">
        <header className="cust-topbar">
          <div className="cust-topbar-left">
            <h2 className="cust-page-title">{title}</h2>
            {subtitle ? <p className="cust-page-sub">{subtitle}</p> : null}
          </div>

          <div className="cust-topbar-right">
            {actions}

            {search ? (
              <label className="cust-search">
                <img src="/icons/cari.png" alt="" />
                <input
                  type="search"
                  placeholder={search.placeholder || "Cari konser, artis, atau venue..."}
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                />
              </label>
            ) : null}

            <Link
              href="/dashboard/customer/notifications"
              className="cust-icon-btn"
              aria-label="Notifications"
            >
              <img src="/icons/notif.png" alt="" />
              <span className="cust-icon-dot" />
            </Link>

            <div className="cust-avatar-wrap">
              <button
                type="button"
                className="cust-avatar-btn"
                onClick={() => setShowProfileMenu((open) => !open)}
                aria-label="Profile menu"
              >
                <img
                  className="cust-avatar"
                  src={avatar}
                  alt="Profile"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/icons/user.png";
                  }}
                />
              </button>

              {showProfileMenu ? (
                <div className="cust-profile-menu">
                  <div className="cust-profile-head">
                    <strong>{user?.name || "LYNORA User"}</strong>
                    <span>{user?.email || "customer@lynora.id"}</span>
                  </div>

                  <Link href="/dashboard/customer/profile">Profil Saya</Link>
                  <Link href="/dashboard/customer/settings">Pengaturan</Link>
                  <button type="button" onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className={`cust-content ${contentClassName || ""}`}>{children}</div>
      </div>
    </main>
  );
}
