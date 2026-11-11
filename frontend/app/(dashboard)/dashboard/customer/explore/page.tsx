"use client";

import { useEffect, useMemo, useState } from "react";
import CustomerShell from "@/components/dashboard/customer-shell";
import EventCard from "@/components/dashboard/event-card";
import { API_URL, demoConcerts, type Concert } from "@/lib/customer";

export default function ExplorePage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams(window.location.search);
    const initial = params.get("category");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial) setCategory(initial);

    async function load() {
      try {
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) throw new Error("offline");
        const result = await response.json();
        const events = Array.isArray(result.events) ? result.events : [];
        if (!active) return;
        setConcerts(events.length > 0 ? events : demoConcerts);
      } catch {
        if (active) setConcerts(demoConcerts);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    concerts.forEach((concert) => set.add(concert.category_name || "Other"));
    return ["All", ...Array.from(set)];
  }, [concerts]);

  const results = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return concerts.filter((concert) => {
      const matchesCategory =
        category === "All" || (concert.category_name || "Other") === category;
      const matchesKeyword =
        !keyword ||
        [concert.name, concert.category_name, concert.venue_name, concert.artist]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return matchesCategory && matchesKeyword;
    });
  }, [concerts, category, search]);

  return (
    <CustomerShell
      title="Explore Concerts"
      subtitle="Jelajahi semua konser yang tersedia di LYNORA"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Cari konser, artis, atau venue...",
      }}
    >
      <div className="cust-card">
        <div className="cust-card-head">
          <div>
            <h3 className="cust-card-title">Filter by Genre</h3>
            <p className="cust-card-sub">
              {results.length} konser ditemukan
            </p>
          </div>
          <img
            src="/icons/filter.png"
            alt=""
            style={{ width: 20, height: 20, objectFit: "contain" }}
          />
        </div>

        <div className="cust-chips">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`cust-chip ${category === item ? "active" : ""}`}
              onClick={() => setCategory(item)}
            >
              {item === "All" ? "Semua" : item}
            </button>
          ))}
        </div>
      </div>

      <section className="cust-section">
        <div className="cust-section-head">
          <h2>{category === "All" ? "Semua Konser" : category}</h2>
        </div>

        {loading ? (
          <div className="cust-empty">Memuat konser...</div>
        ) : results.length > 0 ? (
          <div className="cust-grid cust-grid-4">
            {results.map((concert) => (
              <EventCard key={concert.id} concert={concert} />
            ))}
          </div>
        ) : (
          <div className="cust-empty">
            <img src="/icons/cari.png" alt="" />
            <h3>Konser tidak ditemukan</h3>
            <p>
              Coba ubah kata kunci pencarian atau pilih genre lain untuk
              menemukan konser yang kamu cari.
            </p>
          </div>
        )}
      </section>
    </CustomerShell>
  );
}
