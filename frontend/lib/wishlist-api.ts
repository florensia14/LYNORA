
import { API_URL } from "./customer";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const keys = [
    "token",
    "accessToken",
    "authToken",
    "lynora_token",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);

      if (typeof parsed === "string") return parsed;

      if (parsed?.token) return parsed.token;
      if (parsed?.accessToken) return parsed.accessToken;
    } catch {
      return value;
    }
  }

  return null;
}

async function requestWishlist(
  path = "",
  method: "GET" | "POST" | "DELETE" = "GET"
) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Token login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(`${API_URL}/wishlist${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.message || `Wishlist gagal diproses (${response.status}).`
    );
  }

  return payload;
}

export async function fetchWishlist() {
  const result = await requestWishlist();

  return Array.isArray(result?.wishlists)
    ? result.wishlists
    : [];
}

export async function addWishlist(eventId: number) {
  return requestWishlist(`/${eventId}`, "POST");
}

export async function removeWishlist(eventId: number) {
  return requestWishlist(`/${eventId}`, "DELETE");
}

export async function toggleWishlist(
  eventId: number,
  alreadySaved: boolean
) {
  if (alreadySaved) {
    return removeWishlist(eventId);
  }

  return addWishlist(eventId);
}
