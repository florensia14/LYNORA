"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

const genreIcons: Record<string, string> = {
  pop: "♫",
  rock: "✦",
  "hip-hop": "▤",
  hiphop: "▤",
  edm: "♬",
  kpop: "♙",
  indie: "〰",
  jazz: "♫",
  default: "♪",
};

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_photo?: string | null;
};

type Concert = {
  id: number;
  name: string;
  description?: string | null;
  poster_url?: string | null;
  start_date: string;
  end_date: string;
  status?: string;
  category_id?: number;
  category_name?: string;
  venue_id?: number;
  venue_name?: string;
  venue_address?: string;
};

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function imageUrl(path?: string | null) {
  if (!path) return "/images/hero/home.jpg";

  if (/^https?:\/\//i.test(path)) return path;

  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatDate(date?: string) {
  if (!date) return "Tanggal belum tersedia";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Tanggal belum tersedia";
  }

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(start?: string, end?: string) {
  const first = formatDate(start);
  const last = formatDate(end);

  return first === last ? first : `${first} – ${last}`;
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "Customer";
}

/* -------------------------------------------------------------------------- */
/*                             Reusable Components                            */
/* -------------------------------------------------------------------------- */

/* EVENT CARD */
function EventCard({ concert }: { concert: Concert }) {
  return (
    <Link href={`/events/${concert.id}`} className="event-card">
      <div className="event-card-image">
        <img
          src={imageUrl(concert.poster_url)}
          alt={concert.name}
          onError={(event) => {
            event.currentTarget.src = "/images/hero/home.jpg";
          }}
        />

        <span className="event-status">ON SALE</span>

        <span className="event-bookmark" aria-label="Wishlist">
          <img src="/icons/wishlist.png" alt="" />
        </span>
      </div>

      <div className="event-card-content">
        <h3>{concert.name}</h3>

        <p className="event-category">{concert.category_name || "Concert"}</p>

        <div className="event-info">
          <span className="info-icon">▣</span>
          <span>{formatDateRange(concert.start_date, concert.end_date)}</span>
        </div>

        <div className="event-info">
          <span className="info-icon">⌖</span>
          <span>{concert.venue_name || "Venue belum tersedia"}</span>
        </div>

        <div className="event-info">
          <span className="info-icon">⌖</span>
          <span>{concert.venue_address || "Lokasi belum tersedia"}</span>
        </div>
      </div>
    </Link>
  );
}

/* CONCERT SECTION */
function ConcertSection({
  title,
  data,
}: {
  title: string;
  data: Concert[];
}) {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2>{title}</h2>

        <Link href="/dashboard/customer/explore">See All →</Link>
      </div>

      {data.length > 0 ? (
        <div className="event-grid">
          {data.map((concert) => (
            <EventCard key={concert.id} concert={concert} />
          ))}
        </div>
      ) : (
        <div className="empty-events">Belum ada konser yang tersedia.</div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function CustomerHomePage() {
  const router = useRouter();

  /* -------------------------------- State ---------------------------------- */
  const [user, setUser] = useState<User | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  /* ------------------------ Load user + events (API) ------------------------ */
  useEffect(() => {
    let active = true;

    async function loadHome() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [profileResponse, concertsResponse] = await Promise.all([
          fetch(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/events`),
        ]);

        if (profileResponse.status === 401 || profileResponse.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/login");
          return;
        }

        if (!profileResponse.ok) {
          throw new Error("Gagal mengambil data akun.");
        }

        if (!concertsResponse.ok) {
          throw new Error("Gagal mengambil daftar konser.");
        }

        const profileResult = await profileResponse.json();
        const concertsResult = await concertsResponse.json();

        if (!active) return;

        const currentUser: User = profileResult.user;

        if (currentUser.role !== "customer") {
          if (currentUser.role === "super_admin") {
            router.replace("/dashboard/admin");
          } else if (currentUser.role === "organizer") {
            router.replace("/dashboard/organizer");
          } else {
            router.replace("/login");
          }

          return;
        }

        setUser(currentUser);

        setConcerts(
          Array.isArray(concertsResult.events) ? concertsResult.events : []
        );

        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat halaman."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHome();

    return () => {
      active = false;
    };
  }, [router]);

  /* -------------------------------- Search --------------------------------- */
  const filteredConcerts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return concerts;

    return concerts.filter((concert) =>
      [
        concert.name,
        concert.category_name,
        concert.venue_name,
        concert.venue_address,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [concerts, search]);

  /* --------------------------- Upcoming concerts --------------------------- */
  const upcomingConcerts = useMemo(() => {
    const now = new Date();

    return filteredConcerts
      .filter((concert) => {
        const date = new Date(concert.start_date);

        return !Number.isNaN(date.getTime()) && date >= now;
      })
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
  }, [filteredConcerts]);

  /* ----------------------------- Browse by genre ---------------------------- */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();

    filteredConcerts.forEach((concert) => {
      const name = concert.category_name || "Other";

      counts.set(name, (counts.get(name) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [filteredConcerts]);

  /* -------------------------------- Near you -------------------------------- */
  const nearYouConcerts = filteredConcerts.filter((concert) =>
    `${concert.venue_name || ""} ${concert.venue_address || ""}`
      .toLowerCase()
      .includes("jakarta")
  );

  const recommendedConcerts = upcomingConcerts.slice(0, 4);
  const trendingConcerts = upcomingConcerts.slice(0, 4);

  /* ------------------------------- Handlers -------------------------------- */
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  /* ------------------------------- Loading UI ------------------------------ */
  if (loading) {
    return (
      <main className="home-loading">
        <div className="loading-spinner" />
        <p>Preparing your LYNORA experience...</p>

        <style jsx global>{`
          .home-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            background: #0b1021;
            color: #b4bcd4;
            font-size: 13px;
          }

          .loading-spinner {
            width: 35px;
            height: 35px;
            border: 3px solid #34345d;
            border-top-color: #8d6cff;
            border-radius: 50%;
            animation: home-spin 0.8s linear infinite;
          }

          @keyframes home-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  /* -------------------------------- Main UI -------------------------------- */
  return (
    <main className="customer-home">
      {/* REUSABLE SIDEBAR */}
      <Sidebar fallbackRole="customer" />

      {/* MAIN CONTENT */}
      <div className="home-main">
        {/* TOPBAR */}
        <header className="home-topbar">
          <div className="welcome-text">
            <h2>Halo, {firstName(user?.name)}</h2>
            <p>Ini yang sedang seru minggu ini di LYNORA</p>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <img src="/icons/cari.png" alt="Search" />

              <input
                type="search"
                placeholder="Search concerts, artists, or venues..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <Link
              href="/dashboard/customer/notifications"
              className="top-icon-button"
              aria-label="Notifications"
            >
              <img src="/icons/notif.png" alt="Notifications" />
            </Link>

            <button
              type="button"
              className="top-icon-button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="Profile menu"
            >
              <img
                className="top-avatar"
                src={
                  user?.profile_photo
                    ? imageUrl(user.profile_photo)
                    : "/icons/user.png"
                }
                alt="Profile"
                onError={(event) => {
                  event.currentTarget.src = "/icons/user.png";
                }}
              />
            </button>
          </div>

          {showProfileMenu && (
            <div className="profile-menu">
              <Link href="/dashboard/customer/profile">My Profile</Link>

              <button onClick={handleLogout}>Log Out</button>
            </div>
          )}
        </header>

        <div className="home-content">
          {error && <div className="home-error">{error}</div>}

          {/* HERO */}
          <section className="hero-banner">
            <div className="hero-content">
              <span className="hero-label">NOW PLAYING</span>

              <h1>EXPERIENCE EVERY MOMENT</h1>

              <p>
                Discover your favorite artists and find your next unforgettable
                concert experience.
              </p>

              <Link
                href="/dashboard/customer/explore"
                className="hero-button"
              >
                Explore Concerts →
              </Link>
            </div>
          </section>

          {/* UPCOMING CONCERTS */}
          <ConcertSection
            title="Upcoming Concerts"
            data={upcomingConcerts.slice(0, 4)}
          />

          {/* BROWSE BY GENRE */}
          <section className="home-section">
            <div className="section-heading">
              <h2>Browse by Genre</h2>

              <Link href="/dashboard/customer/explore">See All →</Link>
            </div>

            {categories.length > 0 ? (
              <div className="genre-grid">
                {categories.slice(0, 6).map((category) => {
                  const key = category.name.toLowerCase().replace(/\s+/g, "");

                  const symbol = genreIcons[key] || genreIcons.default;

                  return (
                    <Link
                      href={`/dashboard/customer/explore?category=${encodeURIComponent(
                        category.name
                      )}`}
                      className="genre-card"
                      key={category.name}
                    >
                      <strong>{symbol}</strong>
                      <span>{category.name}</span>
                      <small>
                        {category.count} EVENT
                        {category.count !== 1 ? "S" : ""}
                      </small>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="empty-events">Belum ada kategori konser.</div>
            )}
          </section>

          {/* RECOMMENDED */}
          <ConcertSection
            title="Recommended For You"
            data={recommendedConcerts}
          />

          {/* NEAR YOU */}
          <ConcertSection
            title="Near You · Jakarta"
            data={nearYouConcerts.slice(0, 4)}
          />

          {/* TRENDING */}
          <ConcertSection title="TRENDING NOW !" data={trendingConcerts} />
        </div>
      </div>

      {/* HOME STYLES */}
      <style jsx global>{`
        /* ------------------------------ Base ------------------------------- */
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          background: #0b1021;
          color: #f8f9ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input {
          font: inherit;
        }

        .customer-home {
          min-height: 100vh;
          background: #0b1021;
          color: #f8f9ff;
        }

        /* --------------------------- Main + Topbar -------------------------- */
        .home-main {
          min-height: 100vh;
          margin-left: 205px;
        }

        .home-topbar {
          height: 75px;
          position: sticky;
          top: 0;
          z-index: 10;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          padding: 0 26px;

          background: #111936;
          border-bottom: 1px solid #222b4a;
        }

        .welcome-text h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .welcome-text p {
          margin: 7px 0 0;
          color: #7d89a9;
          font-size: 11px;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .search-box {
          width: 270px;
          height: 42px;

          display: flex;
          align-items: center;
          gap: 10px;

          padding: 0 13px;

          background: #28314f;
          border: 1px solid #384361;
          border-radius: 7px;
        }

        .search-box img {
          width: 21px;
          height: 21px;
          object-fit: contain;
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
          font-size: 11px;
        }

        .search-box input::placeholder {
          color: #929bb3;
        }

        .top-icon-button {
          padding: 0;
          display: flex;
          align-items: center;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .top-icon-button img {
          width: 27px;
          height: 27px;
          object-fit: contain;
        }

        .top-avatar {
          width: 37px !important;
          height: 37px !important;
          border: 2px solid #7160ce;
          border-radius: 50%;
          object-fit: cover;
        }

        /* ------------------------------ Content ----------------------------- */
        .home-content {
          padding: 14px 26px 45px;
        }

        /* ------------------------------- Hero ------------------------------- */
        .hero-banner {
          height: 215px;
          position: relative;

          display: flex;
          align-items: center;

          overflow: hidden;
          padding: 26px;
          border-radius: 10px;

          background-color: #17152d;
          background-image:
            linear-gradient(90deg, rgba(7, 9, 24, 0.88), rgba(7, 9, 24, 0.1)),
            url("/images/hero/home.jpg");

          background-position: center;
          background-size: cover;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 75%;
        }

        .hero-label {
          display: inline-block;
          margin-bottom: 18px;
          padding: 8px 18px;

          border-radius: 30px;
          background: #e60046;
          color: #fff;

          font-size: 11px;
          font-weight: 800;
        }

        .hero-content h1 {
          margin: 0;
          font-size: clamp(22px, 3vw, 31px);
          font-weight: 900;
          line-height: 1.15;
        }

        .hero-content p {
          margin: 12px 0 20px;
          color: #e1d9ef;
          font-size: 13px;
        }

        .hero-button {
          display: inline-flex;
          padding: 11px 17px;

          border-radius: 7px;
          background: linear-gradient(90deg, #5847e8, #7657ef);

          color: #fff;
          font-size: 11px;
          font-weight: 700;
        }

        /* ----------------------------- Sections ----------------------------- */
        .home-section {
          margin-top: 27px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .section-heading h2 {
          position: relative;
          margin: 0;
          padding: 5px 0 5px 17px;
          font-size: 17px;
          font-weight: 700;
        }

        .section-heading h2::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;

          width: 8px;
          height: 30px;

          transform: translateY(-50%);
          border-radius: 3px;

          background: linear-gradient(180deg, #22d3ee 0%, #332d87 100%);
        }

        .section-heading a {
          color: #ff3769;
          font-size: 10px;
          font-weight: 700;
        }

        /* ---------------------------- Event grid ---------------------------- */
        .event-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .event-card {
          min-width: 0;
          overflow: hidden;

          border: 1px solid #3a377b;
          border-radius: 8px;
          background: #202b50;

          transition:
            transform 0.2s,
            border-color 0.2s;
        }

        .event-card:hover {
          transform: translateY(-3px);
          border-color: #7667e9;
        }

        .event-card-image {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 9;
          background: #171d37;
        }

        .event-card-image > img:first-child {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .event-status {
          position: absolute;
          top: 8px;
          left: 8px;

          padding: 4px 9px;
          border-radius: 20px;

          background: #087d79;
          color: #a9fff0;

          font-size: 8px;
          font-weight: 800;
        }

        .event-bookmark {
          position: absolute;
          top: 7px;
          right: 8px;

          width: 25px;
          height: 25px;

          display: grid;
          place-items: center;

          border-radius: 50%;
          background: rgba(5, 9, 25, 0.75);
        }

        .event-bookmark img {
          width: 14px;
          height: 14px;
          object-fit: contain;
        }

        .event-card-content {
          padding: 10px;
        }

        .event-card-content h3 {
          min-height: 31px;
          margin: 0;
          font-size: 11px;
          line-height: 1.4;
        }

        .event-category {
          margin: 5px 0 10px;
          color: #a68bff;
          font-size: 10px;
        }

        .event-info {
          display: flex;
          gap: 7px;
          margin-top: 7px;

          color: #c5cce0;
          font-size: 9px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .info-icon {
          flex-shrink: 0;
          color: #65d5fb;
        }

        .empty-events {
          padding: 28px;

          border: 1px dashed #42476c;
          border-radius: 8px;

          text-align: center;
          color: #8993af;
          font-size: 13px;
        }

        /* ------------------------------- Genre ------------------------------ */
        .genre-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        .genre-card {
          min-height: 85px;
          padding: 13px 7px;

          background: #171d35;
          border: 1px solid #242b4b;
          border-radius: 7px;

          text-align: center;
          transition: 0.2s;
        }

        .genre-card:hover {
          background: #27244f;
          border-color: #7062d6;
        }

        .genre-card strong {
          display: block;
          margin-bottom: 5px;
          color: #a58bff;
          font-size: 21px;
        }

        .genre-card span {
          display: block;
          color: #f3f4ff;
          font-size: 11px;
          font-weight: 700;
        }

        .genre-card small {
          display: block;
          margin-top: 5px;
          color: #818ba7;
          font-size: 9px;
        }

        /* ------------------------------- Error ------------------------------ */
        .home-error {
          margin-bottom: 18px;
          padding: 13px;

          background: #351d32;
          border: 1px solid #853b65;
          border-radius: 7px;

          color: #ffb4c7;
          font-size: 13px;
        }

        /* ---------------------------- Profile menu -------------------------- */
        .profile-menu {
          position: absolute;
          top: 65px;
          right: 25px;
          z-index: 30;

          min-width: 145px;
          padding: 12px;

          background: #202849;
          border: 1px solid #424a70;
          border-radius: 8px;

          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .profile-menu a,
        .profile-menu button {
          display: block;
          width: 100%;
          padding: 9px;

          border: 0;
          background: transparent;

          color: #fff;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
        }

        .profile-menu button {
          color: #ff8b9e;
        }

        /* ------------------------------ Tablet ------------------------------ */
        @media (max-width: 1100px) {
          .event-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .genre-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        /* ------------------------------ Mobile ------------------------------ */
        @media (max-width: 760px) {
          .home-main {
            margin-left: 65px;
          }

          .home-topbar {
            padding: 0 13px;
          }

          .welcome-text h2 {
            font-size: 15px;
          }

          .welcome-text p {
            display: none;
          }

          .search-box {
            width: min(38vw, 200px);
          }

          .topbar-actions {
            gap: 10px;
          }

          .home-content {
            padding: 13px;
          }

          .hero-banner {
            height: 190px;
            padding: 17px;
          }

          .hero-content {
            max-width: 90%;
          }

          .event-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .genre-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        /* ---------------------------- Small mobile -------------------------- */
        @media (max-width: 430px) {
          .welcome-text h2 {
            font-size: 13px;
          }

          .search-box {
            width: 115px;
          }

          .top-icon-button img {
            width: 21px;
            height: 21px;
          }

          .top-avatar {
            width: 29px !important;
            height: 29px !important;
          }

          .hero-content h1 {
            font-size: 20px;
          }

          .event-card-content {
            padding: 7px;
          }

          .event-card-content h3 {
            font-size: 10px;
          }

          .event-info {
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}