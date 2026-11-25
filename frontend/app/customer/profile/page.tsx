"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import CustomerShell from "@/components/layout/CustomerShell";

import {

  API_URL,

  imageUrl,

  initials,

  updateStoredUser,

  type User,

} from "@/lib/customer";

type Form = {

  name: string;

  email: string;

  phone: string;

  password: string;

  profile_photo: string | null;

  cover_photo: string | null;

};

type NearestTicket = {
  ticket_id: number;
  ticket_code: string;
  ticket_status: string;
  order_status: string;
  event_id: number;
  event_name: string;
  start_date: string;
  end_date: string | null;
  poster_url: string | null;
  venue_name: string | null;
  venue_address: string | null;
};

type Countdown = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const emptyCountdown: Countdown = {
  days: "00",
  hours: "00",
  minutes: "00",
  seconds: "00",
};

type Stats = {

  totalOrders: number;

  activeTickets: number;

  wishlistedConcerts: number;

  totalSpent: number;

};

const emptyForm: Form = {

  name: "",

  email: "",

  phone: "+62",

  password: "",

  profile_photo: null,

  cover_photo: null,

};

const emptyStats: Stats = {

  totalOrders: 0,

  activeTickets: 0,

  wishlistedConcerts: 0,

  totalSpent: 0,

};

function getAuthToken() {

  if (typeof window === "undefined") return null;

  return (

    localStorage.getItem("token") ||

    localStorage.getItem("accessToken") ||

    localStorage.getItem("authToken")

  );

}

function resolveImage(src?: string | null) {

  if (!src) return null;

  return imageUrl(src);

}

function mapUserToForm(user: User): Form {

  return {

    name: user.name || "",

    email: user.email || "",

    phone: user.phone || "+62",

    password: "",

    profile_photo: user.profile_photo || null,

    cover_photo: user.cover_photo || null,

  };

}

async function profileRequest(

  endpoint: string,

  options: RequestInit = {}

) {

  const token = getAuthToken();

  if (!token) {

    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");

  }

  const response = await fetch(`${API_URL}/profile${endpoint}`, {

    ...options,

    headers: {

      Authorization: `Bearer ${token}`,

      ...options.headers,

    },

  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {

    throw new Error(result.message || "Permintaan gagal.");

  }

  return result;

}

async function apiRequest(endpoint: string) {

  const token = getAuthToken();

  if (!token) {

    throw new Error("Sesi login tidak ditemukan.");

  }

  const response = await fetch(`${API_URL}${endpoint}`, {

    headers: {

      Authorization: `Bearer ${token}`,

    },

  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {

    throw new Error(result.message || "Gagal mengambil data.");

  }

  return result;

}

/* ---------- STYLES ---------- */

const card =

  "rounded-xl border border-[#383D4E] bg-[#0C1122] p-[18px]";

const label = "mb-1.5 block text-[11px] text-[#AAB0C5]";

const input =

  "min-h-10 w-full rounded-lg border border-[#383D4E] bg-[#161A25] px-3 py-2.5 text-[13px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#B7BBFF] read-only:border-transparent read-only:bg-white/[0.03]";

const btn =

  "rounded-lg border border-transparent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnPrimary = `${btn} bg-[#8B5CF6]`;

const secRow =

  "mb-2 flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-[#383D4E] bg-[#161A25] p-2.5 text-left text-white";

const EyeIcon = ({ off }: { off: boolean }) => (

  <svg

    width="16"

    height="16"

    viewBox="0 0 24 24"

    fill="none"

    stroke="currentColor"

    strokeWidth="2"

    strokeLinecap="round"

    strokeLinejoin="round"

  >

    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />

    <circle cx="12" cy="12" r="3" />

    {off && <path d="M3 3l18 18" />}

  </svg>

);

export default function ProfilePage() {

  const router = useRouter();

  const fileRef = useRef<HTMLInputElement>(null);

  const coverRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState<Form>(emptyForm);

  const [form, setForm] = useState<Form>(emptyForm);

  const [stats, setStats] = useState<Stats>(emptyStats);

  const [nearestTicket, setNearestTicket] =
    useState<NearestTicket | null>(null);
  const [countdown, setCountdown] =
    useState<Countdown>(emptyCountdown);
  const [ticketLoading, setTicketLoading] = useState(true);


  const [editing, setEditing] = useState(false);

  const [showPw, setShowPw] = useState(false);

  const [justSaved, setJustSaved] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  const [statsLoading, setStatsLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [musicOpen, setMusicOpen] = useState(false);

  const [genres, setGenres] = useState([

    "K-POP",

    "K-INDIE",

    "ROCK",

    "EDM",

    "POP",

  ]);

  const [addingGenre, setAddingGenre] = useState(false);

  const [newGenre, setNewGenre] = useState("");

  /* ---------- LOAD PROFILE ---------- */

  useEffect(() => {

    let active = true;

    async function loadProfile() {

      try {

        setLoading(true);

        setError("");

        const result = await profileRequest("/me");

        if (!active) return;

        const user = result.user as User;

        const mapped = mapUserToForm(user);

        setSaved(mapped);

        setForm(mapped);

        updateStoredUser(user);

      } catch (err) {

        if (!active) return;

        setError(

          err instanceof Error

            ? err.message

            : "Gagal mengambil data profil."

        );

      } finally {

        if (active) setLoading(false);

      }

    }

    loadProfile();

    return () => {

      active = false;

    };

  }, []);

/* ---------- LOAD REAL CUSTOMER STATISTICS ---------- */

useEffect(() => {

  let active = true;

  async function loadStatistics() {

    try {

      setStatsLoading(true);

      const [ordersResult, ticketsResult, wishlistResult] =

        await Promise.all([

          apiRequest("/orders/my-orders"),

          apiRequest("/tickets/my-tickets"),

          apiRequest("/wishlist"),

        ]);

      if (!active) return;

      const orders = Array.isArray(ordersResult.data)

        ? ordersResult.data

        : [];

      const tickets = Array.isArray(ticketsResult.data)

        ? ticketsResult.data

        : [];

      const activeTickets = tickets.filter(

        (ticket: {

          ticket_status?: string;

          order_status?: string;

        }) => {

          const ticketStatus = String(

            ticket.ticket_status || ""

          ).toLowerCase().trim();

          const orderStatus = String(

            ticket.order_status || ""

          ).toLowerCase().trim();

          return (

            ticketStatus === "valid" &&

            orderStatus === "paid"

          );

        }

      );

      setStats({

        totalOrders: Number(

          ordersResult.summary?.total_orders ?? orders.length

        ),

        activeTickets: activeTickets.length,

        wishlistedConcerts: Number(

          wishlistResult.total || 0

        ),

        totalSpent: Number(

          ordersResult.summary?.total_spent || 0

        ),

      });

    } catch (err) {

      console.error("Load customer statistics:", err);

    } finally {

      if (active) setStatsLoading(false);

    }

  }

  loadStatistics();

  return () => {

    active = false;

  };

}, []);

  /* ---------- LOAD NEAREST UPCOMING CONCERT ---------- */

  useEffect(() => {
    let active = true;

    async function loadNearestTicket() {
      try {
        setTicketLoading(true);

        const result = await apiRequest("/tickets/my-tickets");

        if (!active) return;

        const tickets: NearestTicket[] = Array.isArray(result.data)
          ? result.data
          : [];

        const now = Date.now();

        const upcomingTickets = tickets
          .filter((ticket) => {
            const ticketStatus = String(
              ticket.ticket_status || ""
            ).toLowerCase().trim();

            const orderStatus = String(
              ticket.order_status || ""
            ).toLowerCase().trim();

            const startTime = new Date(ticket.start_date).getTime();

            return (
              ticketStatus === "valid" &&
              orderStatus === "paid" &&
              Number.isFinite(startTime) &&
              startTime > now
            );
          })
          .sort(
            (a, b) =>
              new Date(a.start_date).getTime() -
              new Date(b.start_date).getTime()
          );

        setNearestTicket(upcomingTickets[0] || null);
      } catch (err) {
        console.error("Load nearest active ticket:", err);
        if (active) setNearestTicket(null);
      } finally {
        if (active) setTicketLoading(false);
      }
    }

    loadNearestTicket();

    return () => {
      active = false;
    };
  }, []);

  /* ---------- REAL-TIME COUNTDOWN ---------- */

  useEffect(() => {
    if (!nearestTicket) {
      setCountdown(emptyCountdown);
      return;
    }

    const targetTime = new Date(nearestTicket.start_date).getTime();

    function updateCountdown() {
      const difference = targetTime - Date.now();

      if (!Number.isFinite(targetTime) || difference <= 0) {
        setCountdown(emptyCountdown);
        return;
      }

      const days = Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );
      const hours = Math.floor(
        (difference / (1000 * 60 * 60)) % 24
      );
      const minutes = Math.floor(
        (difference / (1000 * 60)) % 60
      );
      const seconds = Math.floor((difference / 1000) % 60);

      setCountdown({
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [nearestTicket]);

  /* ---------- FORM HANDLERS ---------- */

  function update<K extends keyof Form>(key: K, value: Form[K]) {

    setForm((previous) => ({

      ...previous,

      [key]: value,

    }));

    setJustSaved(false);

    setError("");

  }

  function startEdit() {

    setForm(saved);

    setEditing(true);

    setJustSaved(false);

    setError("");

  }

  function cancelEdit() {

    setForm(saved);

    setEditing(false);

    setShowPw(false);

    setError("");

  }

  /* ---------- SAVE PROFILE ---------- */

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {

    e.preventDefault();

    if (!form.name.trim()) {

      setError("Nama tidak boleh kosong.");

      return;

    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {

      setError("Format email tidak valid.");

      return;

    }

    try {

      setSaving(true);

      setError("");

      const result = await profileRequest("/me", {

        method: "PUT",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          name: form.name.trim(),

          email: form.email.trim(),

          phone: form.phone.trim(),

        }),

      });

      const user = result.user as User;

      const mapped = mapUserToForm(user);

      setSaved(mapped);

      setForm(mapped);

      setEditing(false);

      setShowPw(false);

      setJustSaved(true);

      updateStoredUser(user);

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Gagal menyimpan perubahan profil."

      );

    } finally {

      setSaving(false);

    }

  }

  /* ---------- UPLOAD IMAGE ---------- */

  async function persistImage(

    key: "profile_photo" | "cover_photo",

    file: File

  ) {

    const isAvatar = key === "profile_photo";

    try {

      setError("");

      if (isAvatar) {

        setUploadingAvatar(true);

      } else {

        setUploadingBanner(true);

      }

      const formData = new FormData();

      formData.append(

        isAvatar ? "avatar" : "banner",

        file

      );

      const result = await profileRequest(

        isAvatar ? "/avatar" : "/banner",

        {

          method: "PATCH",

          body: formData,

        }

      );

      const user = result.user as User;

      const mapped = mapUserToForm(user);

      setSaved(mapped);

      setForm((previous) => ({

        ...previous,

        [key]: mapped[key],

      }));

      updateStoredUser(user);

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Gagal mengunggah gambar."

      );

    } finally {

      setUploadingAvatar(false);

      setUploadingBanner(false);

    }

  }

  async function handleImage(

    e: React.ChangeEvent<HTMLInputElement>,

    key: "profile_photo" | "cover_photo"

  ) {

    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    const allowedTypes = [

      "image/jpeg",

      "image/png",

      "image/webp",

    ];

    if (!allowedTypes.includes(file.type)) {

      setError("File harus berupa gambar JPG, PNG, atau WebP.");

      return;

    }

    const maxSize =

      key === "profile_photo"

        ? 2 * 1024 * 1024

        : 5 * 1024 * 1024;

    if (file.size > maxSize) {

      setError(

        key === "profile_photo"

          ? "Ukuran foto profil maksimal 2 MB."

          : "Ukuran banner maksimal 5 MB."

      );

      return;

    }

    await persistImage(key, file);

  }

  /* ---------- MUSIC PREFERENCES ---------- */

  function addGenre() {

    const genre = newGenre.trim().toUpperCase();

    if (genre && !genres.includes(genre)) {

      setGenres((previous) => [...previous, genre]);

    }

    setNewGenre("");

    setAddingGenre(false);

  }

  const photo = resolveImage(saved.profile_photo);

  const cover = resolveImage(saved.cover_photo);

  const shown = editing ? form : saved;

  const formattedSpent = new Intl.NumberFormat("id-ID", {

    style: "currency",

    currency: "IDR",

    maximumFractionDigits: 0,

  }).format(stats.totalSpent);

  return (

    <CustomerShell

      title="Profile"

      subtitle="Kelola informasi akun dan data pribadimu"

    >

      <style>

        {`

          @keyframes pf-in {

            from { opacity: 0; transform: translateY(-8px); }

            to { opacity: 1; transform: none; }

          }

        `}

      </style>

      <div className="grid gap-4 rounded-2xl bg-[#161A25] p-3 text-white sm:p-5">

        {/* PROFILE HEADER */}

        <div>

          <div

            className="relative h-[110px] overflow-hidden rounded-xl bg-gradient-to-br from-[#2A1550] via-[#4B2FD9] to-[#7C2FA0] bg-cover bg-center sm:h-[150px]"

            style={

              cover

                ? { backgroundImage: `url("${cover}")` }

                : undefined

            }

          >

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#161A25]/80 to-transparent" />

            <button

              type="button"

              onClick={() => coverRef.current?.click()}

              disabled={uploadingBanner}

              className="absolute right-3 top-3 rounded-lg border border-white/20 bg-[#0C1122]/70 px-3 py-1.5 text-[11px] text-white backdrop-blur"

            >

              {uploadingBanner ? "Uploading..." : "Ganti Cover"}

            </button>

            <input

              ref={coverRef}

              type="file"

              accept="image/jpeg,image/png,image/webp"

              hidden

              onChange={(e) => handleImage(e, "cover_photo")}

            />

          </div>

          <div className="-mt-10 flex flex-wrap items-end gap-4 px-1 sm:-mt-12 sm:px-4">

            <div className="relative">

              {photo ? (

                <img

                  src={photo}

                  alt="Foto profil"

                  className="size-[76px] rounded-[14px] border-[3px] border-[#161A25] object-cover sm:size-[92px]"

                />

              ) : (

                <div className="grid size-[76px] place-items-center rounded-[14px] border-[3px] border-[#161A25] bg-gradient-to-br from-[#5847E8] to-[#22D3EE] text-3xl font-extrabold sm:size-[92px]">

                  {initials(saved.name)}

                </div>

              )}

              <button

                type="button"

                aria-label="Ganti foto profil"

                onClick={() => fileRef.current?.click()}

                disabled={uploadingAvatar}

                className="absolute -bottom-1.5 -right-1.5 size-7 rounded-full border-2 border-[#161A25] bg-[#8B5CF6] text-sm text-white"

              >

                {uploadingAvatar ? "…" : "+"}

              </button>

              <input

                ref={fileRef}

                type="file"

                accept="image/jpeg,image/png,image/webp"

                hidden

                onChange={(e) => handleImage(e, "profile_photo")}

              />

            </div>

            <div className="min-w-[180px] flex-1">

              <h2 className="m-0 text-xl font-bold">

                {saved.name || "LYNORA User"}

              </h2>

              <p className="mt-0.5 break-all text-xs text-[#AAB0C5]">

                {saved.email || "—"}

              </p>

            </div>

            <div className="flex w-full gap-2 sm:w-auto">

              <button

                type="button"

                className={`${btn} flex-1 border-[#888DB6] bg-transparent !text-[#888DB6] sm:flex-none`}

                onClick={() =>

                  navigator.clipboard?.writeText(window.location.href)

                }

              >

                Share Profile

              </button>

              <button

                type="button"

                className={`${btnPrimary} flex-1 sm:flex-none`}

                onClick={startEdit}

                disabled={editing || loading}

              >

                Edit Profile

              </button>

            </div>

          </div>

        </div>

        {/* ALERTS */}

        {loading && (

          <div className="rounded-lg border border-[#383D4E] bg-[#0C1122] p-3 text-xs text-[#AAB0C5]">

            Memuat data profil...

          </div>

        )}

        {error && (

          <div

            role="alert"

            className="rounded-lg border border-[#7A2A3A] bg-[#7A2A3A]/20 p-3 text-xs text-[#FFB3C0]"

          >

            {error}

          </div>

        )}

        {/* CUSTOMER STATISTICS */}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">

          {[

            {

              value: statsLoading ? "..." : stats.totalOrders.toLocaleString("id-ID"),

              title: "Total orders",

            },

            {

              value: statsLoading ? "..." : stats.activeTickets.toLocaleString("id-ID"),

              title: "Active tickets",

            },

            {

              value: statsLoading ? "..." : stats.wishlistedConcerts.toLocaleString("id-ID"),

              title: "Wishlisted concerts",

            },

            {

              value: statsLoading ? "..." : formattedSpent,

              title: "Total spent",

            },

          ].map((item) => (

            <div

              key={item.title}

              className="min-w-0 rounded-[10px] border border-[#383D4E] bg-[#0C1122] px-3.5 py-3"

            >

              <b className="block break-words text-xl">

                {item.value}

              </b>

              <span className="text-[11px] text-[#AAB0C5]">

                {item.title}

              </span>

            </div>

          ))}

        </div>

        {/* TABS */}

        <div

          role="tablist"

          className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"

        >

          <button

            type="button"

            role="tab"

            aria-selected="true"

            className="shrink-0 whitespace-nowrap rounded-full border border-[#8B5CF6] bg-[#8B5CF6] px-4 py-2 text-xs font-extrabold text-white"

          >

            Personal Info

          </button>

          <button

            type="button"

            role="tab"

            aria-selected={musicOpen}

            onClick={() => setMusicOpen((value) => !value)}

            className={`relative shrink-0 whitespace-nowrap rounded-full border py-2 pr-4 text-xs transition-all ${

              musicOpen

                ? "border-[#8B5CF6] pl-7 text-white shadow-[0_0_18px_rgba(139,92,246,0.45)]"

                : "border-[#383D4E] pl-4 text-[#AAB0C5]"

            } bg-[#0C1122]`}

          >

            {musicOpen && (

              <span className="absolute left-3 top-1/2 size-[7px] -translate-y-1/2 rounded-full bg-[#7DFFE9] shadow-[0_0_8px\_#7DFFE9]" />

            )}

            Music &amp; Artist Preferences

          </button>

          <button

            type="button"

            disabled

            className="shrink-0 whitespace-nowrap rounded-full border border-[#383D4E] bg-[#0C1122] px-4 py-2 text-xs text-[#AAB0C5] opacity-50"

          >

            Payment Methods

          </button>

          <button

            type="button"

            onClick={() => router.push("/customer/orders")}

            className="shrink-0 whitespace-nowrap rounded-full border border-[#383D4E] bg-[#0C1122] px-4 py-2 text-xs text-[#AAB0C5] transition hover:border-[#8B5CF6] hover:text-white"

          >

            Activity History

          </button>

        </div>

        {/* MAIN BODY */}

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">

          {/* LEFT COLUMN */}

          <div className="grid min-w-0 gap-4">

            <form className={card} onSubmit={handleSave}>

              <h3 className="mb-1 text-sm font-semibold">

                Identity &amp; Ticket Information

              </h3>

              <p className="mb-3.5 text-[11px] text-[#AAB0C5]">

                Data ini dipakai otomatis untuk tiket dan verifikasi identitasmu.

              </p>

              <div className="grid gap-3.5 sm:grid-cols-2">

                <div>

                  <label htmlFor="pf-name" className={label}>

                    Full Legal Name

                  </label>

                  <input

                    id="pf-name"

                    className={input}

                    value={shown.name}

                    readOnly={!editing}

                    onChange={(e) => update("name", e.target.value)}

                  />

                </div>

                <div>

                  <label htmlFor="pf-email" className={label}>

                    Email

                  </label>

                  <input

                    id="pf-email"

                    type="email"

                    className={input}

                    value={shown.email}

                    readOnly={!editing}

                    onChange={(e) => update("email", e.target.value)}

                  />

                </div>

                <div>

                  <label htmlFor="pf-phone" className={label}>

                    Phone Number

                  </label>

                  <input

                    id="pf-phone"

                    inputMode="tel"

                    className={input}

                    value={shown.phone}

                    readOnly={!editing}

                    onChange={(e) => update("phone", e.target.value)}

                  />

                </div>

                <div>

                  <label htmlFor="pf-pw" className={label}>

                    Password ID

                  </label>

                  <div className="relative">

                    <input

                      id="pf-pw"

                      type={showPw ? "text" : "password"}

                      className={`${input} pr-10`}

                      value="LYNORA-ACCOUNT"

                      readOnly

                      autoComplete="off"

                    />

                    <button

                      type="button"

                      aria-label="Tampilkan atau sembunyikan password"

                      onClick={() => setShowPw((value) => !value)}

                      className="absolute right-2 top-1/2 grid -translate-y-1/2 p-1 text-[#AAB0C5]"

                    >

                      <EyeIcon off={showPw} />

                    </button>

                  </div>

                  <p className="mt-1 text-[10px] text-[#AAB0C5]">

                    Password tidak ditampilkan demi keamanan akun.

                  </p>

                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">

                  {justSaved && !editing && (

                    <span className="mr-auto text-xs text-[#7DFFE9]">

                      Perubahan tersimpan

                    </span>

                  )}

                  {editing && (

                    <>

                      <button

                        type="button"

                        onClick={cancelEdit}

                        disabled={saving}

                        className={`${btn} flex-1 border-[#383D4E] bg-transparent !text-[#AAB0C5] sm:flex-none`}

                      >

                        Cancel

                      </button>

                      <button

                        type="submit"

                        disabled={saving}

                        className={`${btnPrimary} flex-1 sm:flex-none`}

                      >

                        {saving ? "Saving..." : "Save Changes"}

                      </button>

                    </>

                  )}

                </div>

              </div>

            </form>

            {/* MUSIC PREFERENCES */}

            {musicOpen && (

              <div className={`${card} border-[#8B5CF6] shadow-[0_0_24px_rgba(139,92,246,0.25)] motion-safe:animate-[pf-in_0.35s_ease_both]`}>

                <h3 className="mb-1 text-sm font-semibold">

                  Music &amp; Artist Preferences

                </h3>

                <p className="mb-3.5 text-[11px] text-[#AAB0C5]">

                  Rekomendasi konser disesuaikan dengan selera musikmu.

                </p>

                <p className="mb-2 text-[10px] text-[#AAB0C5]">

                  Favorite genres

                </p>

                <div className="mb-4 flex flex-wrap gap-2">

                  {genres.map((genre) => (

                    <button

                      key={genre}

                      type="button"

                      title="Klik untuk hapus"

                      onClick={() =>

                        setGenres((previous) =>

                          previous.filter((item) => item !== genre)

                        )

                      }

                      className="rounded-md bg-[#211D3E] px-3 py-1.5 text-[11px] text-[#B7BBFF]"

                    >

                      {genre}

                    </button>

                  ))}

                  {addingGenre ? (

                    <input

                      autoFocus

                      value={newGenre}

                      placeholder="Genre"

                      onChange={(e) => setNewGenre(e.target.value)}

                      onBlur={addGenre}

                      onKeyDown={(e) => {

                        if (e.key === "Enter") addGenre();

                      }}

                      className="w-28 rounded-md border border-[#383D4E] bg-[#161A25] px-2.5 py-1.5 text-[11px] text-white outline-none"

                    />

                  ) : (

                    <button

                      type="button"

                      onClick={() => setAddingGenre(true)}

                      className="rounded-md border border-dashed border-[#383D4E] px-3 py-1.5 text-[11px] text-[#AAB0C5]"

                    >

                      + Add Genre

                    </button>

                  )}

                </div>

                <p className="mb-2 text-[10px] text-[#AAB0C5]">

                  Artists you follow

                </p>

                <div className="flex flex-wrap gap-2.5">

                  {[

                    ["BLACKPINK", "Tour Soft Pass"],

                    ["BTS", "What Tour"],

                  ].map(([name, subtitle]) => (

                    <div

                      key={name}

                      className="flex items-center gap-2 rounded-[10px] border border-[#383D4E] bg-[#161A25] px-3 py-2 text-[11px]"

                    >

                      <i className="grid size-7 place-items-center rounded-full bg-[#211D3E] font-extrabold not-italic text-[#B7BBFF]">

                        {name[0]}

                      </i>

                      <div>

                        {name}

                        <small className="block text-[10px] text-[#AAB0C5]">

                          {subtitle}

                        </small>

                      </div>

                    </div>

                  ))}

                  <button

                    type="button"

                    className="rounded-md border border-dashed border-[#383D4E] px-3 py-1.5 text-[11px] text-[#AAB0C5]"

                  >

                    + Follow New Artist

                  </button>

                </div>

              </div>

            )}

          </div>

          {/* RIGHT COLUMN */}

          <div className="grid min-w-0 gap-4">

            {/* NEAREST ACTIVE TICKET */}

            <div className={`${card} !rounded-xl !p-3`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-bold sm:text-sm">
                  Nearest Active Ticket
                </h3>

                {nearestTicket && (
                  <span className="shrink-0 rounded-full bg-[#3A2B18] px-2 py-1 text-[8px] font-bold text-[#F5C85B]">
                    Upcoming Concert
                  </span>
                )}
              </div>

              {ticketLoading ? (
                <div className="grid min-h-[230px] place-items-center text-xs text-[#AAB0C5]">
                  Loading your concert ticket...
                </div>
              ) : !nearestTicket ? (
                <div className="flex min-h-[230px] flex-col items-center justify-center rounded-lg border border-dashed border-[#383D4E] bg-[#0C1122] px-4 text-center">
                  <span className="mb-3 text-3xl">🎫</span>
                  <h4 className="text-sm font-bold text-white">
                    No Upcoming Concert
                  </h4>
                  <p className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-[#AAB0C5]">
                    Tiket konser yang sudah dibayar dan belum dimulai akan muncul di sini.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/customer/explore")}
                    className={`${btnPrimary} mt-4`}
                  >
                    Explore Concerts
                  </button>
                </div>
              ) : (
                <>
                  {/* CONCERT POSTER */}
                  <div className="relative h-[105px] overflow-hidden rounded-lg bg-[#161A25] sm:h-[115px]">
                    {nearestTicket.poster_url ? (
                      <img
                        src={imageUrl(nearestTicket.poster_url)}
                        alt={nearestTicket.event_name}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.opacity = "0";
                        }}
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-[#AAB0C5]">
                        Concert Poster Unavailable
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C1122]/90 via-[#0C1122]/10 to-transparent" />
                    <h3 className="absolute bottom-3 left-3 right-3 line-clamp-2 text-base font-black leading-tight sm:text-lg">
                      {nearestTicket.event_name}
                    </h3>
                  </div>

                  {/* REAL COUNTDOWN TO EVENT START */}
                  <div className="my-3 grid grid-cols-4 gap-2">
                    {[
                      [countdown.days, "DAYS"],
                      [countdown.hours, "HRS"],
                      [countdown.minutes, "MIN"],
                      [countdown.seconds, "SEC"],
                    ].map(([value, title]) => (
                      <div
                        key={title}
                        className="rounded-lg bg-[#0C1122] py-2 text-center"
                      >
                        <b className="block text-base font-black sm:text-lg">
                          {value}
                        </b>
                        <span className="text-[9px] font-semibold text-[#AAB0C5]">
                          {title}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* TICKET STATUS */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src="/icons/ticket (2).png"
                        alt=""
                        className="h-5 w-5 shrink-0 object-contain"
                      />
                      <span className="truncate text-[10px] text-[#AAB0C5]">
                        E-Ticket Barcode Ready
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#123D37] px-3 py-1 text-[9px] font-bold text-[#42D99A]">
                      Valid
                    </span>
                  </div>

                  {/* VENUE */}
                  <div className="relative mt-3 flex items-start gap-2">
                    <img
                      src="/icons/pin.png"
                      alt=""
                      className="mt-0.5 h-5 w-5 shrink-0 object-contain"
                    />
                    <span className="text-[10px] leading-relaxed text-[#AAB0C5]">
                      {nearestTicket.venue_name || "Venue not available"}
                      {nearestTicket.venue_address
                        ? `, ${nearestTicket.venue_address}`
                        : ""}
                    </span>
                  </div>

                  {/* EVENT DATE */}
                  <div className="mt-2 text-[10px] text-[#AAB0C5]">
                    {new Date(nearestTicket.start_date).toLocaleString(
                      "id-ID",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/customer/tickets?ticketId=${nearestTicket.ticket_id}`)}
                    className={`${btnPrimary} mt-4 flex w-full items-center justify-center gap-2 !rounded-lg !py-2.5 !text-[13px] font-extrabold`}
                  >
                    <img
                      src="/icons/flash-sale.png"
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                    OPEN QR
                  </button>
                </>
              )}
            </div>

            {/* ACCOUNT SECURITY */}

            <div className={card}>

              <h3 className="mb-1 text-sm font-semibold">

                Account Security

              </h3>

              <p className="mb-3.5 text-[11px] text-[#AAB0C5]">

                Protect access to your tickets &amp; wallet.

              </p>

              <button type="button" className={secRow}>

                <div className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-[#7A86FF]">

                  <img

                    src="/icons/encrypted.png"

                    alt=""

                    className="size-5 object-contain"

                  />

                </div>

                <span>

                  <b className="block text-xs">

                    Two-Factor Authentication

                  </b>

                  <small className="text-[10px] text-[#AAB0C5]">

                    Active via Authenticator App

                  </small>

                </span>

              </button>

              <button type="button" className={secRow}>

                <div className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-[#C7BBFF]">

                  <img

                    src="/icons/key.png"

                    alt=""

                    className="size-5 object-contain"

                  />

                </div>

                <b className="text-xs">Change Password</b>

                <img

                  src="/icons/right-arrow.png"

                  alt=""

                  className="ml-auto size-4 object-contain"

                />

              </button>

              <button type="button" className={secRow}>

                <div className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-[#F5B84E]">

                  <img

                    src="/icons/two-factor-authentication.png"

                    alt=""

                    className="size-5 object-contain"

                  />

                </div>

                <b className="text-xs">

                  Manage Device Sessions (2)

                </b>

                <img

                  src="/icons/right-arrow.png"

                  alt=""

                  className="ml-auto size-4 object-contain"

                />

              </button>

              <button

                type="button"

                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-[#7A2A3A] bg-[#7A2A3A]/35 p-2.5 text-[11px] text-[#FFB3C0]"

              >

                Sign Out of All Other Devices

              </button>

            </div>

            {/* FAN PASS */}

            <div className="rounded-xl bg-gradient-to-r from-[#2A1550] via-[#4B2FD9] to-[#7C2FA0] p-4">

              <div className="mb-2.5 flex items-center justify-between text-[10px]">

                <span className="rounded-md bg-white/15 px-2 py-1 font-bold">

                  LYNORA FAN PASS

                </span>

                <span>Level 3 • Fanatic</span>

              </div>

              <p className="mb-2 text-[11px]">

                750 / 1000 Toward VIP Presale

              </p>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">

                <i className="block h-full w-3/4 bg-gradient-to-r from-[#5B6CFF] to-[#22D3EE]" />

              </div>

              <div className="mt-2 flex justify-between text-[10px] text-[#D9D3FF]">

                <span>250 Points to go</span>

                <span>+250 pts</span>

              </div>

            </div>

          </div>

        </div>

      </div>

    </CustomerShell>

  );

}
