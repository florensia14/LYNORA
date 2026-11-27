import { API_URL, imageUrl, type Concert } from "./customer";

type ApiEvent = Record<string, unknown> & {
  id: number | string;
  name: string;
  start_date: string;
  end_date: string;
};

type EventsResponse = {
  message?: string;
  total?: number;
  events?: ApiEvent[];
};

type EventDetailResponse = {
  message?: string;
  event?: ApiEvent;
};

export type ApiMyTicket = {
  ticket_id: number;
  ticket_code: string;
  ticket_status: "valid" | "used" | "cancelled" | "refunded";
  issued_at: string;
  order_id: number;
  order_code: string;
  order_status: string;
  quantity: number;
  price_at_purchase: number | string;
  ticket_category_id: number;
  category_name: string;
  event_id: number;
  event_name: string;
  start_date: string;
  end_date: string;
  poster_url: string | null;
  venue_name: string | null;
  venue_address: string | null;
};

type MyTicketsResponse = {
  success: boolean;
  message: string;
  data: ApiMyTicket[];
};

function numeric(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeEvent(event: ApiEvent): Concert {
  const artists = Array.isArray(event.artists) ? event.artists : [];
  const poster =
    typeof event.poster_url === "string" && event.poster_url
      ? imageUrl(event.poster_url)
      : null;

  return {
    ...event,
    id: Number(event.id),
    name: String(event.name || "Untitled event"),
    description:
      typeof event.description === "string" ? event.description : null,
    poster_url: poster,
    start_date: String(event.start_date),
    end_date: String(event.end_date),
    category_id: numeric(event.category_id),
    category_name:
      typeof event.category_name === "string"
        ? event.category_name
        : undefined,
    venue_id: numeric(event.venue_id),
    venue_name:
      typeof event.venue_name === "string" ? event.venue_name : undefined,
    venue_address:
      typeof event.venue_address === "string"
        ? event.venue_address
        : undefined,
    organizer_id: numeric(event.organizer_id),
    organizer_name:
      typeof event.organizer_name === "string"
        ? event.organizer_name
        : undefined,
    price: numeric(event.starting_price) ?? numeric(event.price),
    sales_status:
      typeof event.sales_status === "string" ? event.sales_status : undefined,
    lifecycle_status:
      typeof event.lifecycle_status === "string"
        ? (event.lifecycle_status as Concert["lifecycle_status"])
        : undefined,
    remaining_tickets: numeric(event.remaining_tickets),
    total_quota: numeric(event.total_quota),
    total_sold: numeric(event.total_sold),
    ticket_categories: Array.isArray(event.ticket_categories)
      ? event.ticket_categories
      : [],
    artists,
    artist: artists
      .map((artist: { name?: string }) => artist.name)
      .filter(Boolean)
      .join(", "),
    artist_country: artists
      .map((artist: { country?: string }) => artist.country)
      .filter(Boolean)
      .join(", "),
  } as Concert;
}

/** Loads only real, publicly listed events from GET /api/events. */
export async function fetchConcerts(): Promise<Concert[]> {
  const response = await fetch(`${API_URL}/events`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  let payload: EventsResponse;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Respons server konser tidak valid.");
  }

  if (!response.ok) {
    throw new Error(
      payload.message || `Gagal mengambil konser (HTTP ${response.status}).`,
    );
  }

  if (!Array.isArray(payload.events)) {
    throw new Error(
      "Format respons GET /api/events tidak sesuai. Server harus mengirim { events: [] }.",
    );
  }

  return payload.events.map(normalizeEvent);
}

/**
 * Loads one published event by ID.
 * GET /api/events/:id
 */
export async function fetchConcertById(
  id: string | number,
): Promise<Concert> {
  if (!String(id).trim() || !Number.isFinite(Number(id))) {
    throw new Error("ID konser tidak valid.");
  }

  const response = await fetch(
    `${API_URL}/events/${encodeURIComponent(String(id))}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  let payload: EventDetailResponse;

  try {
    payload = await response.json();
  } catch {
    throw new Error("Respons server detail konser tidak valid.");
  }

  if (!response.ok) {
    throw new Error(
      payload.message ||
        `Gagal mengambil detail konser (HTTP ${response.status}).`,
    );
  }

  if (!payload.event) {
    throw new Error("Data detail konser tidak ditemukan.");
  }

  return normalizeEvent(payload.event);
}

/**
 * Loads tickets belonging to the currently authenticated customer.
 * GET /api/tickets/my-tickets
 */
export async function fetchMyTickets(): Promise<ApiMyTicket[]> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(`${API_URL}/tickets/my-tickets`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  let payload: MyTicketsResponse;

  try {
    payload = await response.json();
  } catch {
    throw new Error("Respons server tiket tidak valid.");
  }

  if (!response.ok) {
    throw new Error(
      payload.message || `Gagal mengambil tiket (HTTP ${response.status}).`,
    );
  }

  if (!Array.isArray(payload.data)) {
    throw new Error(
      "Format respons GET /api/tickets/my-tickets tidak sesuai.",
    );
  }

  return payload.data.map((ticket) => ({
    ...ticket,
    poster_url: ticket.poster_url ? imageUrl(ticket.poster_url) : null,
  }));
}

export function matchesQuery(concert: Concert, query: string): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;

  const artists = Array.isArray(
    (concert as Concert & { artists?: { name?: string }[] }).artists,
  )
    ? (concert as Concert & { artists?: { name?: string }[] })
        .artists!.map((artist) => artist.name)
        .join(" ")
    : "";

  return [
    concert.name,
    concert.description,
    concert.artist,
    artists,
    concert.category_name,
    concert.venue_name,
    concert.venue_address,
    concert.organizer_name,
  ].some((value) => String(value ?? "").toLowerCase().includes(keyword));
}

export function isInCity(concert: Concert, city: string): boolean {
  const keyword = city.trim().toLowerCase();
  if (!keyword) return true;
  return `${concert.venue_name ?? ""} ${concert.venue_address ?? ""}`
    .toLowerCase()
    .includes(keyword);
}

export type CheckoutItem = {
  ticket_category_id: number;
  quantity: number;
  attendees: {
    full_name: string;
    email: string | null;
    phone: string | null;
  }[];
};

export type CreateOrderResponse = {
  message: string;
  order: {
    id: number;
    order_code: string;
    total_amount: number;
    status: string;
    expires_at: string;
    items: {
      ticketId: number;
      quantity: number;
      price: number;
      subtotal: number;
    }[];
  };
};

export type CreatePaymentResponse = {
  message: string;
  payment: {
    snap_token: string;
    redirect_url: string | null;
  };
};

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function createCheckoutOrder(
  items: CheckoutItem[],
): Promise<CreateOrderResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(`${API_URL}/orders/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Gagal membuat pesanan.");
  }

  return payload;
}

export async function createOrderPayment(
  orderId: number,
): Promise<CreatePaymentResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(
    `${API_URL}/payments/orders/${orderId}/payment`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Gagal membuat pembayaran.");
  }

  return payload;
}

export type CheckPaymentStatusResponse = {
  message: string;
  payment_status: string;
  order_status: string;
};

/**
 * Checks the latest Midtrans payment status.
 * GET /api/payments/orders/:id/status
 */
export async function checkPaymentStatus(
  orderId: number,
): Promise<CheckPaymentStatusResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(
    `${API_URL}/payments/orders/${orderId}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload.message || "Gagal memeriksa status pembayaran.",
    );
  }

  return payload;
}

export type ApiMyOrder = {
  id: string;
  order_id: number;
  event_name: string;
  poster_url: string | null;
  date: string;
  quantity: number;
  total: number;
  status: "paid" | "pending" | "cancelled" | "refunded";
  method: string;
  payment_status: string;
};

export async function fetchMyOrders(): Promise<ApiMyOrder[]> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(`${API_URL}/orders/my-orders`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Gagal mengambil data pesanan.");
  }

  return result.data;
}