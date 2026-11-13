export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  profile_photo?: string | null;
  photo_version?: number;
  created_at?: string;
  unreadNotifications?: number;
};

export type Concert = {
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

  price?: number;

  artist?: string;
  artist_country?: string;

  organizer_name?: string;
};

export type TicketStatus = "active" | "used" | "expired";

export type Ticket = {
  id: string;
  code: string;
  event_name: string;
  poster_url: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  seat: string;
  type: string;
  status: TicketStatus;
};

export type OrderStatus =
  | "paid"
  | "pending"
  | "failed"
  | "refunded";

export type Order = {
  id: string;
  event_name: string;
  poster_url: string;
  date: string;
  quantity: number;
  total: number;
  status: OrderStatus;
  method: string;
};

export type Notification = {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "ticket" | "promo" | "reminder" | "system";
  read: boolean;
};

/* ------------------------------------------------------------------ */
/* USER SYNC (sidebar ikut berubah saat profile diupdate)              */
/* ------------------------------------------------------------------ */

export const USER_UPDATED_EVENT = "lynora:user-updated";

export function updateStoredUser(patch: Partial<User>): User {
  let current = {} as User;

  try {
    current = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    /* abaikan data rusak */
  }

  const next: User = {
    ...current,
    ...patch,
    // kalau foto diganti, paksa browser ambil gambar baru (anti-cache)
    ...(patch.profile_photo !== undefined
      ? { photo_version: Date.now() }
      : {}),
  };

  localStorage.setItem("user", JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(USER_UPDATED_EVENT, { detail: next })
  );

  return next;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

export function imageUrl(path?: string | null): string {
  if (!path) return "/images/hero/home.jpg";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/images/") || path.startsWith("/icons/")) {
    return path;
  }

  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function formatDate(date?: string): string {
  if (!date) return "Date not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not available";
  }

  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateRange(
  start?: string,
  end?: string
): string {
  const first = formatDate(start);
  const last = formatDate(end);

  return first === last ? first : `${first} – ${last}`;
}

export function formatCurrency(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function firstName(name?: string): string {
  return name?.trim().split(/\s+/)[0] || "Customer";
}

export function initials(name?: string): string {
  const parts =
    name?.trim().split(/\s+/).filter(Boolean) || [];

  if (parts.length === 0) return "LY";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/* ------------------------------------------------------------------ */
/* DEMO DATA                                                           */
/* ------------------------------------------------------------------ */

export const demoConcerts: Concert[] = [
  {
    id: 1,
    name: "The Weeknd: After Hours Til Dawn",
    category_name: "Pop",
    poster_url: "/images/concerts/the-weeknd.jpg",
    start_date: "2026-12-12T19:30:00",
    end_date: "2026-12-12T22:30:00",
    venue_name: "Gelora Bung Karno",
    venue_address: "Jakarta Pusat, DKI Jakarta",
    price: 1250000,
    artist: "The Weeknd",
    artist_country: "Canada",
    organizer_name: "LYNORA Events",
    description:
      "Experience an unforgettable night with The Weeknd on his spectacular world tour.",
  },
  {
    id: 2,
    name: "Coldplay: Music of the Spheres",
    category_name: "Rock",
    poster_url: "/images/concerts/coldplay.jpg",
    start_date: "2026-11-25T20:00:00",
    end_date: "2026-11-25T23:00:00",
    venue_name: "Jakarta International Stadium",
    venue_address: "Jakarta Utara, DKI Jakarta",
    price: 1500000,
    artist: "Coldplay",
    artist_country: "United Kingdom",
    organizer_name: "LYNORA Events",
    description:
      "Join Coldplay for an extraordinary musical journey filled with lights, energy, and unforgettable moments.",
  },
  {
    id: 3,
    name: "BTS World Tour: Yet To Come",
    category_name: "K-Pop",
    poster_url: "/images/concerts/bts.jpg",
    start_date: "2027-01-18T18:00:00",
    end_date: "2027-01-18T21:00:00",
    venue_name: "Indonesia Arena",
    venue_address: "Jakarta Pusat, DKI Jakarta",
    price: 1750000,
    artist: "BTS",
    artist_country: "South Korea",
    organizer_name: "LYNORA Events",
    description:
      "Celebrate an incredible night of music and performances with BTS.",
  },
  {
    id: 4,
    name: "NIKI: Buzz World Tour",
    category_name: "Indie",
    poster_url: "/images/concerts/niki.jpg",
    start_date: "2026-12-05T19:00:00",
    end_date: "2026-12-05T21:30:00",
    venue_name: "Istora Senayan",
    venue_address: "Jakarta Pusat, DKI Jakarta",
    price: 850000,
    artist: "NIKI",
    artist_country: "Indonesia",
    organizer_name: "LYNORA Events",
    description:
      "Enjoy an intimate and memorable live performance with NIKI.",
  },
  {
    id: 5,
    name: "Avenged Sevenfold: Life Is But A Dream",
    category_name: "Metal",
    poster_url: "/images/concerts/avenged.jpg",
    start_date: "2026-11-30T19:00:00",
    end_date: "2026-11-30T22:00:00",
    venue_name: "ICE BSD",
    venue_address: "Tangerang, Banten",
    price: 1100000,
    artist: "Avenged Sevenfold",
    artist_country: "United States",
    organizer_name: "LYNORA Events",
    description:
      "Get ready for a powerful night of live rock and metal performances.",
  },
  {
    id: 6,
    name: "Taylor Swift: The Eras Tour",
    category_name: "Pop",
    poster_url: "/images/concerts/taylor-red.jpg",
    start_date: "2027-02-14T18:30:00",
    end_date: "2027-02-14T22:00:00",
    venue_name: "Gelora Bung Karno",
    venue_address: "Jakarta Pusat, DKI Jakarta",
    price: 2000000,
    artist: "Taylor Swift",
    artist_country: "United States",
    organizer_name: "LYNORA Events",
    description:
      "Experience a spectacular celebration of music and unforgettable performances.",
  },
];

export const demoTickets: Ticket[] = [
  {
    id: "TKT-90231",
    code: "LYN-90231-A1",
    event_name: "Coldplay: Music of the Spheres",
    poster_url: "/images/concerts/coldplay.jpg",
    category: "Rock",
    date: "25 Nov 2026",
    time: "20:00 WIB",
    venue: "Jakarta International Stadium",
    city: "Jakarta Utara",
    seat: "CAT 1 · Blok A · Row 12 · Seat 08",
    type: "VIP Festival",
    status: "active",
  },
  {
    id: "TKT-90118",
    code: "LYN-90118-B4",
    event_name: "NIKI: Buzz World Tour",
    poster_url: "/images/concerts/niki.jpg",
    category: "Indie",
    date: "05 Dec 2026",
    time: "19:00 WIB",
    venue: "Istora Senayan",
    city: "Jakarta Pusat",
    seat: "Festival · Standing · Zone B",
    type: "Regular",
    status: "active",
  },
  {
    id: "TKT-88402",
    code: "LYN-88402-C9",
    event_name: "The Weeknd: After Hours Til Dawn",
    poster_url: "/images/concerts/the-weeknd.jpg",
    category: "Pop",
    date: "12 Dec 2026",
    time: "19:30 WIB",
    venue: "Gelora Bung Karno",
    city: "Jakarta Pusat",
    seat: "CAT 2 · Blok C · Row 04 · Seat 21",
    type: "Tribune",
    status: "active",
  },
  {
    id: "TKT-77190",
    code: "LYN-77190-D2",
    event_name: "Avenged Sevenfold: Life Is But A Dream",
    poster_url: "/images/concerts/avenged.jpg",
    category: "Metal",
    date: "30 Nov 2025",
    time: "19:00 WIB",
    venue: "ICE BSD",
    city: "Tangerang",
    seat: "Festival · Standing · Zone A",
    type: "Regular",
    status: "used",
  },
];

export const demoOrders: Order[] = [
  {
    id: "ORD-2026-0091",
    event_name: "Coldplay: Music of the Spheres",
    poster_url: "/images/concerts/coldplay.jpg",
    date: "18 Nov 2026",
    quantity: 2,
    total: 3000000,
    status: "paid",
    method: "Bank Transfer BCA",
  },
  {
    id: "ORD-2026-0084",
    event_name: "NIKI: Buzz World Tour",
    poster_url: "/images/concerts/niki.jpg",
    date: "10 Nov 2026",
    quantity: 1,
    total: 850000,
    status: "paid",
    method: "Virtual Account",
  },
  {
    id: "ORD-2026-0079",
    event_name: "The Weeknd: After Hours Til Dawn",
    poster_url: "/images/concerts/the-weeknd.jpg",
    date: "02 Nov 2026",
    quantity: 2,
    total: 2500000,
    status: "pending",
    method: "Bank Transfer Mandiri",
  },
  {
    id: "ORD-2026-0061",
    event_name: "Avenged Sevenfold: Life Is But A Dream",
    poster_url: "/images/concerts/avenged.jpg",
    date: "20 Oct 2026",
    quantity: 1,
    total: 1100000,
    status: "refunded",
    method: "Credit Card",
  },
];

export const demoNotifications: Notification[] = [
  {
    id: 1,
    title: "Payment successful",
    message:
      "Ticket Coldplay: Music of the Spheres is now active. Show your e-ticket when entering the venue.",
    time: "2 hours ago",
    type: "ticket",
    read: false,
  },
  {
    id: 2,
    title: "Concert reminder",
    message:
      "NIKI: Buzz World Tour in 7 days at Istora Senayan. Get ready!",
    time: "1 day ago",
    type: "reminder",
    read: false,
  },
  {
    id: 3,
    title: "Special promo for you",
    message:
      "15% discount on Taylor Swift: The Eras Tour tickets with LYNORA15 code. Valid until Nov 30.",
    time: "3 days ago",
    type: "promo",
    read: true,
  },
  {
    id: 4,
    title: "Schedule change",
    message:
      "The opening time for The Weeknd: After Hours Til Dawn has been changed to 17:30 WIB.",
    time: "5 days ago",
    type: "system",
    read: true,
  },
];

export const demoWishlist: Concert[] = [
  demoConcerts[5],
  demoConcerts[2],
  demoConcerts[4],
  demoConcerts[1],
];

export const orderStatusLabel: Record<OrderStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refund",
};

export const ticketStatusLabel: Record<TicketStatus, string> = {
  active: "Active",
  used: "Used",
  expired: "Expired",
};