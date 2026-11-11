/* -------------------------------------------------------------------------- */
/*                       LYNORA Customer Dashboard — shared                   */
/* -------------------------------------------------------------------------- */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/* --------------------------------- Types ---------------------------------- */

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  profile_photo?: string | null;
  created_at?: string;
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

export type OrderStatus = "paid" | "pending" | "failed" | "refunded";

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

/* -------------------------------- Helpers --------------------------------- */

export function imageUrl(path?: string | null) {
  if (!path) return "/images/hero/home.jpg";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function formatDate(date?: string) {
  if (!date) return "Tanggal belum tersedia";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Tanggal belum tersedia";
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateRange(start?: string, end?: string) {
  const first = formatDate(start);
  const last = formatDate(end);
  return first === last ? first : `${first} – ${last}`;
}

export function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "Customer";
}

export function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) || [];
  if (parts.length === 0) return "LY";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/* ------------------------------ Demo content ------------------------------ */
/* Used as a graceful fallback when the API is unreachable (frontend-only).   */

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
    date: "05 Des 2026",
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
    date: "12 Des 2026",
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
    date: "20 Okt 2026",
    quantity: 1,
    total: 1100000,
    status: "refunded",
    method: "Credit Card",
  },
];

export const demoNotifications: Notification[] = [
  {
    id: 1,
    title: "Pembayaran berhasil",
    message:
      "Tiket Coldplay: Music of the Spheres kamu sudah aktif. Tunjukkan e-ticket saat masuk venue.",
    time: "2 jam yang lalu",
    type: "ticket",
    read: false,
  },
  {
    id: 2,
    title: "Pengingat konser",
    message:
      "NIKI: Buzz World Tour berlangsung 7 hari lagi di Istora Senayan. Siapkan dirimu!",
    time: "1 hari yang lalu",
    type: "reminder",
    read: false,
  },
  {
    id: 3,
    title: "Promo spesial untukmu",
    message:
      "Diskon 15% tiket Taylor Swift: The Eras Tour dengan kode LYNORA15. Berlaku sampai 30 Nov.",
    time: "3 hari yang lalu",
    type: "promo",
    read: true,
  },
  {
    id: 4,
    title: "Perubahan jadwal",
    message:
      "Waktu pembukaan gate The Weeknd: After Hours Til Dawn diubah menjadi 17:30 WIB.",
    time: "5 hari yang lalu",
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

/* ----------------------------- Status helpers ----------------------------- */

export const orderStatusLabel: Record<OrderStatus, string> = {
  paid: "Dibayar",
  pending: "Menunggu",
  failed: "Gagal",
  refunded: "Refund",
};

export const ticketStatusLabel: Record<TicketStatus, string> = {
  active: "Aktif",
  used: "Terpakai",
  expired: "Kedaluwarsa",
};
