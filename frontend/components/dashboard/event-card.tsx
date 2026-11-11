"use client";

import Link from "next/link";
import {
  formatCurrency,
  formatDateRange,
  imageUrl,
  type Concert,
} from "@/lib/customer";

type EventCardProps = {
  concert: Concert;
  href?: string;
  showWishlist?: boolean;
  onWishlist?: (concert: Concert) => void;
  wishlisted?: boolean;
};

export default function EventCard({
  concert,
  href,
  showWishlist = true,
  onWishlist,
  wishlisted = false,
}: EventCardProps) {
  const target = href ?? `/events/${concert.id}`;

  return (
    <Link href={target} className="event-card">
      <div className="event-card-image">
        <img
          src={imageUrl(concert.poster_url)}
          alt={concert.name}
          onError={(event) => {
            event.currentTarget.src = "/images/hero/home.jpg";
          }}
        />

        <span className="event-status">ON SALE</span>

        {showWishlist ? (
          <button
            type="button"
            className={`event-bookmark ${wishlisted ? "is-active" : ""}`}
            aria-label="Wishlist"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onWishlist?.(concert);
            }}
          >
            <img src="/icons/wishlist.png" alt="" />
          </button>
        ) : null}
      </div>

      <div className="event-card-content">
        <h3>{concert.name}</h3>

        <p className="event-category">{concert.category_name || "Concert"}</p>

        <div className="event-info">
          <span className="info-icon">
            <img src="/icons/calendar.png" alt="" />
          </span>
          <span>{formatDateRange(concert.start_date, concert.end_date)}</span>
        </div>

        <div className="event-info">
          <span className="info-icon">
            <img src="/icons/location.png" alt="" />
          </span>
          <span>{concert.venue_name || "Venue belum tersedia"}</span>
        </div>

        <div className="event-card-foot">
          <span className="event-price">
            {concert.price
              ? `Mulai ${formatCurrency(concert.price)}`
              : "Harga menyusul"}
          </span>
          <span className="event-cta">Detail →</span>
        </div>
      </div>
    </Link>
  );
}
