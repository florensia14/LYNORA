"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/dashboard/customer-shell";
import EventCard from "@/components/dashboard/event-card";
import { demoWishlist, type Concert } from "@/lib/customer";

const STORAGE_KEY = "lynora_wishlist";

export default function WishlistPage() {
  const [items, setItems] = useState<Concert[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(JSON.parse(stored));
        return;
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(demoWishlist);
  }, []);

  function persist(next: Concert[]) {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function removeItem(id: number) {
    persist(items.filter((item) => item.id !== id));
  }

  return (
    <CustomerShell
      title="Wishlist"
      subtitle="Konser yang kamu simpan untuk nanti"
    >
      {items.length > 0 ? (
        <>
          <div className="cust-section-head" style={{ marginTop: 0 }}>
            <h2>{items.length} Konser Tersimpan</h2>
            <button
              type="button"
              className="cust-btn cust-btn-ghost cust-btn-sm"
              onClick={() => persist([])}
            >
              Hapus Semua
            </button>
          </div>

          <div className="cust-grid cust-grid-4">
            {items.map((concert) => (
              <div key={concert.id} style={{ position: "relative" }}>
                <EventCard
                  concert={concert}
                  showWishlist
                  wishlisted
                  onWishlist={() => removeItem(concert.id)}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="cust-empty">
          <img src="/icons/wishlist.png" alt="" />
          <h3>Wishlist kamu masih kosong</h3>
          <p>
            Simpan konser favoritmu dengan menekan ikon hati pada kartu konser,
            lalu temukan kembali di sini.
          </p>
          <Link href="/dashboard/customer/explore" className="cust-btn cust-btn-primary">
            Jelajahi Konser
          </Link>
        </div>
      )}
    </CustomerShell>
  );
}
