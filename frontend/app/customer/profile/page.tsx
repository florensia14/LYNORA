"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerShell from "@/components/layout/CustomerShell";
import { imageUrl, initials } from "@/lib/customer";

type Form = {
  name: string;
  email: string;
  phone: string;
  password: string;
  profile_photo: string | null;
  cover_photo: string | null;
};

const DEFAULT_PHONE = "+62";
const emptyForm: Form = {
  name: "",
  email: "",
  phone: DEFAULT_PHONE,
  password: "",
  profile_photo: null,
  cover_photo: null,
};

/** Perkecil gambar sebelum disimpan supaya tidak melebihi kuota localStorage (~5MB). */
function compressImage(file: File, maxW: number, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function resolveImage(src: string | null) {
  if (!src) return null;
  return src.startsWith("data:") ? src : imageUrl(src);
}

function readUser(): Form {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      return {
        name: u.name || u.username || "",
        email: u.email || "",
        phone: u.phone || DEFAULT_PHONE,
        password: u.password || "",
        profile_photo: u.profile_photo || null,
        cover_photo: u.cover_photo || null,
      };
    }
  } catch {
    /* ignore */
  }
  return emptyForm;
}

/* ---------- class helpers (Tailwind) ---------- */
const card = "rounded-xl border border-[#383D4E] bg-[#0C1122] p-[18px]";
const label = "mb-1.5 block text-[11px] text-[#AAB0C5]";
const input =
  "min-h-10 w-full rounded-lg border border-[#383D4E] bg-[#161A25] px-3 py-2.5 text-[13px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#B7BBFF] read-only:border-transparent read-only:bg-white/[0.03]";
const btn =
  "rounded-lg border border-transparent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7BBFF] disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary = `${btn} bg-[#8B5CF6]`;
const secRow =
  "mb-2 flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-[#383D4E] bg-[#161A25] p-2.5 text-left text-white";

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
    {off ? <path d="M3 3l18 18" /> : null}
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState<Form>(emptyForm); // data tersimpan
  const [form, setForm] = useState<Form>(emptyForm); // data yang sedang diedit
  const [editing, setEditing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  const [musicOpen, setMusicOpen] = useState(false);
  const [genres, setGenres] = useState(["K-POP", "K-INDIE", "ROCK", "EDM", "POP"]);
  const [addingGenre, setAddingGenre] = useState(false);
  const [newGenre, setNewGenre] = useState("");

  useEffect(() => {
    const u = readUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(u);
    setForm(u);
  }, []);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((p) => ({ ...p, [key]: value }));
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

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      return setError("Nama tidak boleh kosong.");
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return setError("Format email tidak valid.");
    }

    try {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : {};

      const updatedUser = {
        ...user,
        ...form,
        photo_version: Date.now(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      window.dispatchEvent(new Event("lynora:user-updated"));
    } catch {
      setError("Gagal menyimpan perubahan profil.");
      return;
    }

    setSaved(form);
    setEditing(false);
    setShowPw(false);
    setJustSaved(true);
  }

  /** Simpan satu field gambar (foto profil / cover) langsung, tanpa harus klik Edit Profile. */
  function persistImage(
    key: "profile_photo" | "cover_photo",
    value: string | null
  ) {
    setSaved((previous) => ({ ...previous, [key]: value }));
    setForm((previous) => ({ ...previous, [key]: value }));

    try {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : {};

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          [key]: value,
          photo_version: Date.now(),
        })
      );

      window.dispatchEvent(new Event("lynora:user-updated"));
      setError("");
    } catch {
      setError("Gambar terlalu besar untuk disimpan. Coba gambar lain.");
    }
  }
  async function handleImage(
    e: React.ChangeEvent<HTMLInputElement>,
    key: "profile_photo" | "cover_photo",
    maxW: number,
  ) {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya file yang sama bisa dipilih ulang
    if (!file) return;
    try {
      persistImage(key, await compressImage(file, maxW));
    } catch {
      setError("File harus berupa gambar (JPG/PNG/WebP).");
    }
  }

  function addGenre() {
    const g = newGenre.trim().toUpperCase();
    if (g && !genres.includes(g)) setGenres([...genres, g]);
    setNewGenre("");
    setAddingGenre(false);
  }

  const photo = resolveImage(saved.profile_photo);
  const cover = resolveImage(saved.cover_photo);

  const shown = editing ? form : saved;

  return (
    <CustomerShell title="Profile" subtitle="Kelola informasi akun dan data pribadimu">
      {/* keyframes untuk animasi section Music & Artist */}
      <style>{`@keyframes pf-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>

      <div className="grid gap-4 rounded-2xl bg-[#161A25] p-3 text-white sm:p-5">
        {/* ---------- HEADER ---------- */}
        <div>
          <div
            className="relative h-[110px] overflow-hidden rounded-xl bg-gradient-to-br from-[#2A1550] via-[#4B2FD9] to-[#7C2FA0] bg-cover bg-center sm:h-[150px]"
            style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
          >
            {/* gradasi bawah supaya transisi ke card tetap halus */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#161A25]/80 to-transparent" />

            <div className="absolute right-2 top-2 flex gap-1.5 sm:right-3 sm:top-3">
              {cover ? (
                <button
                  type="button"
                  onClick={() => persistImage("cover_photo", null)}
                  className="rounded-lg border border-white/20 bg-[#0C1122]/70 px-3 py-1.5 text-[11px] text-white backdrop-blur transition hover:bg-[#0C1122]"
                >
                  Hapus
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="rounded-lg border border-white/20 bg-[#0C1122]/70 px-3 py-1.5 text-[11px] text-white backdrop-blur transition hover:bg-[#0C1122]"
              >
                Ganti Cover
              </button>
            </div>

            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleImage(e, "cover_photo", 1400)}
            />
          </div>

          <div className="-mt-10 flex flex-wrap items-end gap-4 px-1 sm:-mt-12 sm:px-4">
            <div className="relative">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
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
                className="absolute -bottom-1.5 -right-1.5 size-7 cursor-pointer rounded-full border-2 border-[#161A25] bg-[#8B5CF6] text-sm text-white"
              >
                +
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleImage(e, "profile_photo", 400)}
              />
            </div>

            <div className="min-w-[180px] flex-1">
              <h2 className="m-0 text-xl font-bold">{saved.name || "LYNORA User"}</h2>
              <p className="mt-0.5 break-all text-xs text-[#AAB0C5]">{saved.email || "—"}</p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                className={`${btn} flex-1 border-[#888DB6] bg-transparent !text-[#888DB6] sm:flex-none`}
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
              >
                Share Profile
              </button>
              <button type="button" className={`${btnPrimary} flex-1 sm:flex-none`} onClick={startEdit} disabled={editing}>
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* ---------- STATS ---------- */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            ["0", "Total orders"],
            ["0", "Active tickets"],
            ["0", "Wishlisted concerts"],
            ["Rp0", "Total spent"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-[10px] border border-[#383D4E] bg-[#0C1122] px-3.5 py-3">
              <b className="block text-xl">{v}</b>
              <span className="text-[11px] text-[#AAB0C5]">{l}</span>
            </div>
          ))}
        </div>

        {/* ---------- TABS ---------- */}
        <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
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
            onClick={() => setMusicOpen((v) => !v)}
            className={`relative shrink-0 whitespace-nowrap rounded-full border py-2 pr-4 text-xs transition-all duration-300 ${musicOpen
                ? "border-[#8B5CF6] pl-7 text-white shadow-[0_0_0_3px_rgba(139,92,246,0.22),0_0_18px_rgba(139,92,246,0.45)]"
                : "border-[#383D4E] pl-4 text-[#AAB0C5]"
              } bg-[#0C1122]`}
          >
            {musicOpen ? (
              <span className="absolute left-3 top-1/2 size-[7px] -translate-y-1/2 rounded-full bg-[#7DFFE9] shadow-[0_0_8px_#7DFFE9]" />
            ) : null}
            Music &amp; Artist Preferences
          </button>

          <button
            type="button"
            disabled
            title="Segera hadir"
            className="shrink-0 cursor-not-allowed whitespace-nowrap rounded-full border border-[#383D4E] bg-[#0C1122] px-4 py-2 text-xs text-[#AAB0C5] opacity-50"
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

        {/* ---------- BODY ---------- */}
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
          {/* KIRI */}
          <div className="grid min-w-0 gap-4">
            <form className={card} onSubmit={handleSave}>
              <h3 className="mb-1 text-sm font-semibold">Identity &amp; Ticket Information</h3>
              <p className="mb-3.5 text-[11px] text-[#AAB0C5]">
                Data ini dipakai otomatis untuk tiket dan verifikasi identitasmu.
              </p>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="pf-name" className={label}>Full Legal Name</label>
                  <input
                    id="pf-name"
                    className={input}
                    value={shown.name}
                    readOnly={!editing}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="pf-email" className={label}>Email</label>
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
                  <label htmlFor="pf-phone" className={label}>Phone Number</label>
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
                  <label htmlFor="pf-pw" className={label}>Password ID</label>
                  <div className="relative">
                    {editing ? (
                      <>
                        <input
                          id="pf-pw"
                          type={showPw ? "text" : "password"}
                          className={`${input} pr-10`}
                          value={form.password}
                          placeholder="Password baru"
                          autoComplete="new-password"
                          onChange={(e) => update("password", e.target.value)}
                        />
                        <button
                          type="button"
                          aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-2 top-1/2 grid -translate-y-1/2 cursor-pointer p-1 text-[#AAB0C5]"
                        >
                          <EyeIcon off={showPw} />
                        </button>
                      </>
                    ) : (
                      <input id="pf-pw" className={input} value="---" readOnly />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
                  {error ? <span className="mr-auto text-xs text-[#FF8A9B]">{error}</span> : null}
                  {justSaved && !editing ? (
                    <span className="mr-auto text-xs text-[#7DFFE9]">Perubahan tersimpan</span>
                  ) : null}
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className={`${btn} flex-1 border-[#383D4E] bg-transparent !text-[#AAB0C5] sm:flex-none`}
                      >
                        Cancel
                      </button>
                      <button type="submit" className={`${btnPrimary} flex-1 sm:flex-none`}>
                        Save Changes
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </form>

            {musicOpen ? (
              <div
                className={`${card} border-[#8B5CF6] shadow-[0_0_0_1px_rgba(139,92,246,0.5),0_0_24px_rgba(139,92,246,0.25)] motion-safe:animate-[pf-in_0.35s_ease_both]`}
              >
                <h3 className="mb-1 text-sm font-semibold">Music &amp; Artist Preferences</h3>
                <p className="mb-3.5 text-[11px] text-[#AAB0C5]">
                  Rekomendasi konser disesuaikan dengan selera musikmu.
                </p>

                <p className="mb-2 text-[10px] text-[#AAB0C5]">Favorite genres</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <button
                      key={g}
                      type="button"
                      title="Klik untuk hapus"
                      onClick={() => setGenres(genres.filter((x) => x !== g))}
                      className="rounded-md bg-[#211D3E] px-3 py-1.5 text-[11px] text-[#B7BBFF]"
                    >
                      {g}
                    </button>
                  ))}
                  {addingGenre ? (
                    <input
                      autoFocus
                      value={newGenre}
                      placeholder="Genre"
                      onChange={(e) => setNewGenre(e.target.value)}
                      onBlur={addGenre}
                      onKeyDown={(e) => e.key === "Enter" && addGenre()}
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

                <p className="mb-2 text-[10px] text-[#AAB0C5]">Artists you follow</p>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    ["BLACKPINK", "Tour Soft Pass"],
                    ["BTS", "What Tour"],
                  ].map(([n, s]) => (
                    <div key={n} className="flex items-center gap-2 rounded-[10px] border border-[#383D4E] bg-[#161A25] px-3 py-2 text-[11px]">
                      <i className="grid size-7 place-items-center rounded-full bg-[#211D3E] font-extrabold not-italic text-[#B7BBFF]">
                        {n[0]}
                      </i>
                      <div>
                        {n}
                        <small className="block text-[10px] text-[#AAB0C5]">{s}</small>
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
            ) : null}
          </div>

          {/* KANAN */}
          <div className="grid min-w-0 gap-4">

            <div className={`${card} !rounded-xl !p-3`}>

              {/* HEADER */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-bold text-white sm:text-sm">
                  Nearest Active Ticket
                </h3>

                <span className="shrink-0 rounded-full bg-[#3A2B18] px-2 py-1 text-[8px] font-bold text-[#F5C85B]">
                  Gate Opens 5:00 PM
                </span>
              </div>

              {/* CONCERT POSTER */}
              <div className="relative h-[105px] overflow-hidden rounded-lg sm:h-[115px]">
                <img
                  src="/images/hero/home.jpg"
                  alt="LYNORA World Tour"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.opacity = "0";
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1122]/80 via-transparent to-transparent" />

                <h3 className="absolute bottom-3 left-3 text-base font-black leading-tight text-white sm:text-lg">
                  LYNORA WORLD
                  <br />
                  TOUR
                </h3>
              </div>

              {/* COUNTDOWN */}
              <div className="my-3 grid grid-cols-4 gap-2">
                {[
                  ["03", "DAYS"],
                  ["14", "HRS"],
                  ["22", "MIN"],
                  ["09", "SEC"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-lg bg-[#0C1122] py-2 text-center"
                  >
                    <b className="block text-base font-black text-white sm:text-lg">
                      {value}
                    </b>

                    <span className="text-[9px] font-semibold text-[#AAB0C5]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* TICKET STATUS */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/icons/ticket (2).png"
                    alt=""
                    className="h-5 w-5 object-contain"
                  />

                  <span className="text-[10px] text-[#AAB0C5]">
                    E-Ticket Barcode Ready
                  </span>
                </div>

                <span className="rounded-full bg-[#123D37] px-3 py-1 text-[9px] font-bold text-[#42D99A]">
                  Valid
                </span>
              </div>

              {/* VENUE */}
              <div className="relative mt-3 flex items-center gap-2">
                <img
                  src="/icons/pin.png"
                  alt=""
                  className="h-5 w-5 object-contain"
                />

                <span className="text-[10px] text-[#AAB0C5]">
                  Madison Square Garden, New York
                </span>
              </div>

              {/* OPEN QR BUTTON */}
              <button
                type="button"
                onClick={() => router.push("/customer/tickets")}
                className={`${btnPrimary} mt-4 flex w-full items-center justify-center gap-2 !rounded-lg !bg-[#8B5CF6] !py-2.5 !text-[13px] font-extrabold text-white transition hover:!bg-[#7543E8]`}
              >
                <img
                  src="/icons/flash-sale.png"
                  alt=""
                  className="h-6 w-6 object-contain"
                />

                OPEN QR
              </button>

            </div>
   
            <div className={card}>
              <h3 className="mb-1 text-sm font-semibold">
                Account Security
              </h3>

              <p className="mb-3.5 text-[11px] text-[#AAB0C5]">
                Protect access to your tickets &amp; wallet.
              </p>

              {/* TWO FACTOR AUTHENTICATION */}
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

              {/* CHANGE PASSWORD */}
              <button type="button" className={secRow}>
                <div className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-[#C7BBFF]">
                  <img
                    src="/icons/key.png"
                    alt=""
                    className="size-5 object-contain"
                  />
                </div>

                <b className="text-xs">
                  Change Password
                </b>

                <img
                  src="/icons/right-arrow.png"
                  alt=""
                  className="ml-auto size-4 object-contain"
                />
              </button>

              {/* DEVICE SESSIONS */}
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

              {/* SIGN OUT OTHER DEVICES */}
              <button
                type="button"
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-[#7A2A3A] bg-[#7A2A3A]/35 p-2.5 text-[11px] text-[#FFB3C0] transition hover:bg-[#7A2A3A]/50"
              >
                Sign Out of All Other Devices
              </button>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-[#2A1550] from-0% via-[#4B2FD9] via-60% to-[#7C2FA0] to-100% p-4">
              <div className="mb-2.5 flex items-center justify-between text-[10px]">
                <span className="rounded-md bg-white/15 px-2 py-1 font-bold">LYNORA FAN PASS</span>
                <span>Level 3 • Fanatic</span>
              </div>
              <p className="mb-2 text-[11px]">750 / 1000 Toward VIP Presale</p>
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