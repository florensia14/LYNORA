"use client";

import { useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";

const GRADIENT = "bg-[linear-gradient(90deg,#8B5CF6_0%,#22D3EE_31%)]";
const GRADIENT_V = "bg-[linear-gradient(180deg,#8B5CF6_0%,#22D3EE_100%)]";

type Tab = "active" | "history" | "cancelled";

const mainTicket = {
  readyLabel: "Ready To Use",
  bookingId: "8170-FE-08D",
  countdown: "03h : 16m : 22s",
  tour: "2024 WORLD TOUR",
  tier: "VIP TIER",
  poster: "/images/concerts/event.png",
  title: "IU 'H.E.R' WORLD TOUR -New York",
  dateTime: "Sat, Apr 27, 2024 · 7:30 PM",
  ticketNo: "Seat A-12",
  category: "VIP Package",
  venue: "Madison Square Garden, NYC",
  gate: "Gate 2 VIP",
  holder: "Kimberly Kimy",
  qr: "/images/hero/qr%20code.png",
  code: "EIP2-IU-VVIP",
};

const otherTickets = [
  {
    id: "o1",
    title: "IU 'H.E.R' WORLD TOUR — New York",
    thumb: "/images/concerts/eventt.png",
    meta: "Saturday, April 27, 2024 · Madison Square Garden, New York",
    tags: ["VIP Package", "Gate 2 VIP", "Seat A-12, A-13"],
    remaining: "2 tickets remaining",
    soon: true,
  },
];

const history = [
  {
    id: "h1",
    title: "Coldplay: Music of the Spheres",
    image: "/images/concerts/coldplay.jpg",
    date: "November 18, 2023",
    venue: "MetLife Stadium, East Rutherford",
    badge: "CAT 1 – West A",
  },
  {
    id: "h2",
    title: "Coldplay: Music of the Spheres",
    image: "/images/concerts/coldplay.jpg",
    date: "November 18, 2023",
    venue: "MetLife Stadium, East Rutherford",
    badge: "CAT 1 – West A",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-6 w-1 rounded-full ${GRADIENT_V}`} />
      <h2 className="text-lg font-semibold text-white">{children}</h2>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[#AAB0C5]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function MainTicketCard() {
  const t = mainTicket;
  return (
    <article className="overflow-hidden rounded-xl border border-[#676D89] bg-[#171B26]">
      {/* status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 text-[11px]">
        <div className="flex items-center gap-3 text-[#72E08C]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#72E08C]" />
            {t.readyLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#72E08C]" />
            Booking ID: {t.bookingId}
          </span>
        </div>
        <span className="text-[#AAB0C5]">
          Countdown: <span className="font-semibold text-white">{t.countdown}</span>
        </span>
      </div>

      {/* poster */}
      <div className="relative mx-4 h-44 overflow-hidden rounded-lg">
        <img
          src={t.poster}
          alt={t.title}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/images/hero/home.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171B26]/90 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-[#171B26]">
            {t.tour}
          </span>
          <span className="rounded-full bg-[#8B5CF6] px-2.5 py-0.5 text-[10px] font-semibold text-white">
            {t.tier}
          </span>
        </div>
        <h3 className="absolute bottom-3 left-3 right-3 text-xl font-bold leading-tight text-white">
          {t.title}
        </h3>
      </div>

      {/* details */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-3 px-4 py-4">
        <Field label="Date & Time" value={t.dateTime} />
        <Field label="Ticket No." value={t.ticketNo} />
        <Field label="Category" value={t.category} />
        <Field label="Venue" value={t.venue} />
        <Field label="Entry Gate" value={t.gate} />
        <Field label="Ticket Holder" value={t.holder} />
      </div>

      {/* actions */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-[#5456DE] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          <img
            src="/icons/direct-download.png"
            alt=""
            className="h-3.5 w-3.5 object-contain"
          />
          Download E-Ticket (PDF)
        </button>
        <button
          type="button"
          className="rounded-md border border-[#676D89] bg-[#0C1122] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/60"
        >
          Add to Wallet
        </button>
      </div>

      <button
        type="button"
        className="flex w-full items-center gap-2 border-t border-[#676D89]/60 px-4 py-3 text-xs font-medium text-white transition hover:bg-white/5"
      >
        <span aria-hidden className="text-base leading-none">≡</span>
        View Full Rundown
      </button>
    </article>
  );
}

function QrCard() {
  const t = mainTicket;
  return (
    <aside className="flex flex-col items-center rounded-xl border border-[#676D89] bg-[#171B26] px-6 py-4">
      <div className="flex w-full items-center justify-between text-[10px]">
        <span className="flex items-center gap-1.5 text-[#72E08C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#72E08C]" />
          OFFICIAL PASS
        </span>
        <span className="font-semibold text-white">SECURE QR VALIDATION</span>
      </div>

      <div className="mt-5 rounded-lg bg-white p-3">
        <img
          src={t.qr}
          alt={`QR code ${t.code}`}
          className="h-52 w-52 object-contain"
        />
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-[#AAB0C5]">
        <span className="font-semibold text-[#72E08C]">Anti-screenshot barcode active.</span>
        <br />
        Show this QR code to the gate staff for scanning.
      </p>

      <div className="mt-4 rounded-full border border-[#676D89] bg-[#0C1122] px-8 py-2 text-xs font-semibold tracking-wide text-white">
        CODE: {t.code}
      </div>
    </aside>
  );
}

function OtherTicketRow() {
  return (
    <div className="space-y-4">
      {otherTickets.map((o) => (
        <article
          key={o.id}
          className="overflow-hidden rounded-xl border border-[#676D89] bg-[#171B26]"
        >
          <div className="flex items-start gap-4 p-4">
            <img
              src={o.thumb}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-white">
                {o.title}
              </h3>
              <p className="mt-1 text-[11px] text-[#AAB0C5]">{o.meta}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {o.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-[#676D89] bg-[#0C1122] px-2 py-0.5 text-[10px] text-[#AAB0C5]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {o.soon && (
              <span className="shrink-0 rounded-full bg-[#2E2723] px-2.5 py-1 text-[10px] font-semibold text-[#F5B84E]">
                COMING SOON
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#676D89]/60 px-4 py-3">
            <span className="rounded-md bg-[#0C1122] px-3 py-1.5 text-xs font-medium text-white">
              {o.remaining}
            </span>
            <button
              type="button"
              className="rounded-md bg-[#8B5CF6] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Open Ticket →
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function HistoryGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {history.map((h) => (
        <article
          key={h.id}
          className="overflow-hidden rounded-xl border border-[#676D89] bg-[#171B26]"
        >
          <div className="relative h-36">
            <img
              src={h.image}
              alt={h.title}
              className="h-full w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
              Completed
            </span>
            <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
              {h.badge}
            </span>
          </div>
          <div className="space-y-2 p-3">
            <h3 className="text-sm font-semibold text-white">{h.title}</h3>
            <p className="text-[11px] text-[#AAB0C5]">{h.date}</p>
            <p className="text-[11px] text-[#AAB0C5]">{h.venue}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled
                className="rounded-md border border-[#676D89] bg-[#0C1122] py-1.5 text-[11px] text-[#AAB0C5]"
              >
                Leave a Review
              </button>
              <button
                type="button"
                disabled
                className="rounded-md border border-[#676D89] bg-[#0C1122] py-1.5 text-[11px] text-[#AAB0C5]"
              >
                View Invoice
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[#676D89] bg-[#171B26] px-6 py-14 text-center">
      <img src="/icons/ticket.png" alt="" className="h-10 w-10 opacity-70" />
      <h3 className="mt-4 text-base font-semibold text-white">{message}</h3>
      <p className="mt-1 max-w-sm text-sm text-[#AAB0C5]">
        Tiket yang sudah kamu beli akan muncul di sini beserta e-ticket yang
        siap diunduh.
      </p>
      <Link
        href="/customer/explore"
        className="mt-5 rounded-md bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Beli Tiket
      </Link>
    </div>
  );
}

const tabs: { key: Tab; label: string }[] = [
  { key: "active", label: "Active Tickets" },
  { key: "history", label: "History" },
  { key: "cancelled", label: "Cancelled" },
];

export default function MyTicketsPage() {
  const [tab, setTab] = useState<Tab>("active");

  return (
    <CustomerShell
      title="My Tickets"
      subtitle="E-ticket dan riwayat tiket konsermu"
    >
      {/* heading + tabs */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`${GRADIENT} bg-clip-text text-xs font-bold tracking-wide text-transparent`}
          >
            LYNORA PASSWORD
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">MY TICKETS</h1>
        </div>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                tab === t.key
                  ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                  : "border-[#676D89] bg-transparent text-white hover:border-white/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "active" && (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <MainTicketCard />
            <QrCard />
          </div>

          <section className="mt-10 space-y-4">
            <SectionTitle>Other Active Tickets</SectionTitle>
            <OtherTicketRow />
          </section>

          <section className="mt-10 space-y-1">
            <SectionTitle>Concert History</SectionTitle>
            <p className="pb-3 pl-4 text-xs text-[#AAB0C5]">
              A record of the concerts you&apos;ve attended with LYNORA.
            </p>
            <HistoryGrid />
          </section>
        </>
      )}

      {tab === "history" && (
        <section className="mt-6 space-y-1">
          <SectionTitle>Concert History</SectionTitle>
          <p className="pb-3 pl-4 text-xs text-[#AAB0C5]">
            A record of the concerts you&apos;ve attended with LYNORA.
          </p>
          <HistoryGrid />
        </section>
      )}

      {tab === "cancelled" && (
        <div className="mt-6">
          <EmptyState message="Belum ada tiket dibatalkan" />
        </div>
      )}
    </CustomerShell>
  );
}