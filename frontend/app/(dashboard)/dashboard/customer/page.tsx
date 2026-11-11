"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/dashboard/customer-shell";
import EventCard from "@/components/dashboard/event-card";
import {
  API_URL,
  demoConcerts,
  firstName,
  type Concert,
} from "@/lib/customer";

const genreIcons: Record<string, string> = {
  pop: "♫",
  rock: "✦",
  "hip-hop": "▤",
  hiphop: "▤",
  edm: "♬",
  kpop: "♙",
  "k-pop": "♙",
  indie: "〰",
  jazz: "♫",
  metal: "⚡",
  default: "♪",
};

export default function CustomerHomePage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed?.name) setUserName(parsed.name);
      }
    } catch {
      /* ignore */
    }

    async function loadEvents() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) throw new Error("offline");
        const result = await response.json();
        const events = Array.isArray(result.events) ? result.events : [];
        if (!active) return;
        setConcerts(events.length > 0 ? events : demoConcerts);
      } catch {
        if (!active) return;
        setConcerts(demoConcerts);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const filteredConcerts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return concerts;
    return concerts.filter((concert) =>
      [concert.name, concert.category_name, concert.venue_name, concert.venue_address]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [concerts, search]);

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

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    filteredConcerts.forEach((concert) => {
      const name = concert.category_name || "Other";
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [filteredConcerts]);

  const nearYouConcerts = filteredConcerts.filter((concert) =>
    `${concert.venue_name || ""} ${concert.venue_address || ""}`
      .toLowerCase()
      .includes("jakarta")
  );

  const list = upcomingConcerts.length > 0 ? upcomingConcerts : filteredConcerts;

  const stats = [
    { label: "Konser Tersedia", value: concerts.length, icon: "/icons/ticket.png" },
    { label: "Kategori", value: categories.length, icon: "/icons/category.png" },
    {
      label: "Di Jakarta",
      value: nearYouConcerts.length,
      icon: "/icons/location.png",
    },
    { label: "Wishlist", value: 4, icon: "/icons/wishlist.png" },
  ];

  return (
    <CustomerShell
      title={`Halo, ${firstName(userName)}`}
      subtitle="Ini yang sedang seru minggu ini di LYNORA"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Cari konser, artis, atau venue...",
      }}
    >
      {/* HERO */}
      <section className="hero-banner">
        <div className="hero-content">
          <span className="hero-label">NOW PLAYING</span>
          <h1>EXPERIENCE EVERY MOMENT</h1>
          <p>
            Temukan artis favoritmu dan pengalaman konser tak terlupakan
            berikutnya — semua di satu tempat.
          </p>
          <Link href="/dashboard/customer/explore" className="hero-button">
            Explore Concerts →
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section className="cust-section" style={{ marginTop: 22 }}>
        <div className="stat-grid">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <span className="stat-icon">
                <img src={stat.icon} alt="" />
              </span>
              <div>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* UPCOMING */}
      <section className="cust-section">
        <div className="cust-section-head">
          <h2>Upcoming Concerts</h2>
          <Link href="/dashboard/customer/explore">See All →</Link>
        </div>

        {loading ? (
          <div className="cust-empty">Memuat konser...</div>
        ) : list.length > 0 ? (
          <div className="cust-grid cust-grid-4">
            {list.slice(0, 4).map((concert) => (
              <EventCard key={concert.id} concert={concert} />
            ))}
          </div>
        ) : (
          <div className="cust-empty">Belum ada konser yang tersedia.</div>
        )}
      </section>

      {/* GENRE */}
      <section className="cust-section">
        <div className="cust-section-head">
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
                    {category.count} EVENT{category.count !== 1 ? "S" : ""}
                  </small>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="cust-empty">Belum ada kategori konser.</div>
        )}
      </section>

      {/* RECOMMENDED */}
      <section className="cust-section">
        <div className="cust-section-head">
          <h2>Recommended For You</h2>
          <Link href="/dashboard/customer/explore">See All →</Link>
        </div>
        <div className="cust-grid cust-grid-4">
          {list.slice(0, 4).map((concert) => (
            <EventCard key={`rec-${concert.id}`} concert={concert} />
          ))}
        </div>
      </section>

      {/* NEAR YOU */}
      <section className="cust-section">
        <div className="cust-section-head">
          <h2>Near You · Jakarta</h2>
          <Link href="/dashboard/customer/explore">See All →</Link>
        </div>
        {nearYouConcerts.length > 0 ? (
          <div className="cust-grid cust-grid-4">
            {nearYouConcerts.slice(0, 4).map((concert) => (
              <EventCard key={`near-${concert.id}`} concert={concert} />
            ))}
          </div>
        ) : (
          <div className="cust-empty">Belum ada konser di sekitar Jakarta.</div>
        )}
      </section>

      {/* TRENDING */}
      <section className="cust-section">
        <div className="cust-section-head">
          <h2>TRENDING NOW !</h2>
          <Link href="/dashboard/customer/explore">See All →</Link>
        </div>
        <div className="cust-grid cust-grid-4">
          {list.slice(0, 4).map((concert) => (
            <EventCard key={`trend-${concert.id}`} concert={concert} />
          ))}
        </div>
      </section>
    </CustomerShell>
  );
}
