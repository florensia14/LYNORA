
"use client";

import { useEffect, useState } from "react";
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

const API_ORIGIN = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
)
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

function getProfilePhoto(user: OrganizerUser | null) {
    if (!user?.profile_photo) return "/icons/user.png";

    const photo = user.profile_photo;

    if (photo.startsWith("data:")) return photo;

    const url = photo.startsWith("http")
        ? photo
        : `${API_ORIGIN}${photo.startsWith("/") ? "" : "/"}${photo}`;

    return `${url}${url.includes("?") ? "&" : "?"}v=${user.photo_version || 0}`;
}

function SearchIcon() {
    return (
        <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
        </svg>
    );
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
    }, [pathname]);

    const profilePhoto = getProfilePhoto(user);

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
            <div className="min-h-screen lg:pl-[205px]">
              {/* TOPBAR */}
<header className="sticky top-0 z-30 flex h-[140px] items-center border-b border-white/[0.06] bg-[linear-gradient(110deg,#111A35_0%,#19264A_55%,#10172D_100%)] px-6 sm:px-8 lg:px-10 xl:px-[45px]">

  <div className="flex w-full items-center justify-between gap-5">

    {/* GREETING */}
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
        Halo, {user?.name || "EO"} 👋
      </h1>

      <p className="mt-2 text-[13px] text-[#8994B0] sm:text-[16px]">
        Kelola konser dan pantau performa event kamu di LYNORA.
      </p>
    </div>

    {/* SEARCH */}
    <form
      onSubmit={handleSearch}
      className="hidden h-[52px] w-full max-w-[340px] shrink-0 items-center gap-3 rounded-lg border border-[#8B5CF6] bg-[#10172D]/80 px-4 lg:flex xl:max-w-[340px]"
    >
      <span className="shrink-0 text-white">
        <SearchIcon />
      </span>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search concerts, artists, or venues..."
        aria-label="Search concerts"
        className="w-full min-w-0 bg-transparent text-[14px] text-white outline-none placeholder:text-[#A0A5B5]"
      />
    </form>

    {/* RIGHT ACTIONS */}
    <div className="flex shrink-0 items-center gap-5 sm:gap-6">

      {/* NOTIFICATION */}
      <Link
        href="/organizer/notifications"
        aria-label="Notifications"
        className="relative grid h-11 w-11 shrink-0 place-items-center text-white transition hover:text-[#C4B5FD]"
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 22a2.3 2.3 0 0 0 2.25-1.8h-4.5A2.3 2.3 0 0 0 12 22Zm7-5.2-1.4-1.8V10a5.6 5.6 0 0 0-4.5-5.5V3.4a1.1 1.1 0 0 0-2.2 0v1.1A5.6 5.6 0 0 0 6.4 10v5l-1.4 1.8v1.1h14v-1.1Z" />
        </svg>

        <span className="absolute right-[5px] top-[5px] h-2 w-2 rounded-full bg-[#C30437]" />
      </Link>

      {/* PROFILE AVATAR */}
      <Link
        href="/organizer/profile"
        aria-label="Organizer profile"
        className="grid h-[48px] w-[48px] shrink-0 place-items-center overflow-hidden rounded-full border-[2px] border-[#8B5CF6] bg-[#151D35] p-[3px] transition hover:border-[#22D3EE] sm:h-[50px] sm:w-[50px]"
      >
        <img
          src={profilePhoto}
          alt="Organizer profile"
          className="h-full w-full rounded-full object-cover"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/icons/user.png";
          }}
        />
      </Link>

    </div>
  </div>
</header>

                {/* MOBILE SPACING FOR SIDEBAR MOBILE BAR */}
                <main className="min-h-screen px-4 pb-10 pt-[78px] sm:px-6 lg:px-7 lg:pt-7 xl:px-9">
                    {children}
                </main>
            </div>
        </div>
    );
}
