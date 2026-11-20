"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";
import { fetchMyTickets, type ApiMyTicket } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";


const GRADIENT = "bg-[linear-gradient(90deg,#8B5CF6_0%,#22D3EE_31%)]";
const GRADIENT_V = "bg-[linear-gradient(180deg,#8B5CF6_0%,#22D3EE_100%)]";

type Tab = "active" | "history" | "cancelled";

const tabs: { key: Tab; label: string }[] = [
  { key: "active", label: "Active Tickets" },
  { key: "history", label: "History" },
  { key: "cancelled", label: "Cancelled" },
];

function formatDate(date: string): string {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatTime(date: string): string {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

function formatDateTime(date: string): string {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(date);

  return formattedTime
    ? `${formattedDate} · ${formattedTime}`
    : formattedDate;
}

function formatStatus(status: ApiMyTicket["ticket_status"]): string {
  switch (status) {
    case "valid":
      return "Ready To Use";
    case "used":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    default:
      return status;
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-6 w-1 rounded-full ${GRADIENT_V}`} />
      <h2 className="text-lg font-semibold text-white">{children}</h2>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[#AAB0C5]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

// MAIN TICKET CARD

function MainTicketCard({ ticket }: { ticket: ApiMyTicket }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#676D89] bg-[#171B26]">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[11px]">
        <div className="flex flex-wrap items-center gap-3 text-[#72E08C]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#72E08C]" />
            {formatStatus(ticket.ticket_status)}
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#72E08C]" />
            Booking ID: {ticket.order_code}
          </span>
        </div>

        <span className="text-[#AAB0C5]">
          Ticket:{" "}
          <span className="font-semibold text-white">
            {ticket.ticket_code}
          </span>
        </span>
      </div>

      {/* Poster */}
      <div className="relative mx-4 h-44 overflow-hidden rounded-lg bg-[#0C1122]">
        <img
          src={ticket.poster_url || "/images/hero/home.jpg"}
          alt={ticket.event_name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/images/hero/home.jpg";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#171B26]/90 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-[#171B26]">
            LYNORA E-TICKET
          </span>

          <span className="rounded-full bg-[#8B5CF6] px-2.5 py-0.5 text-[10px] font-semibold text-white">
            {ticket.category_name}
          </span>
        </div>

        <h3 className="absolute bottom-3 left-3 right-3 text-xl font-bold leading-tight text-white">
          {ticket.event_name}
        </h3>
      </div>

      {/* Ticket details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-3">
        <Field
          label="Date & Time"
          value={formatDateTime(ticket.start_date)}
        />

        <Field
          label="Ticket No."
          value={ticket.ticket_code}
        />

        <Field
          label="Category"
          value={ticket.category_name}
        />

        <Field
          label="Venue"
          value={ticket.venue_name}
        />

        <Field
          label="Venue Address"
          value={ticket.venue_address}
        />

        <Field
          label="Booking ID"
          value={ticket.order_code}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <button
          type="button"
          disabled
          title="Fitur PDF akan tersedia setelah endpoint e-ticket dibuat"
          className="flex cursor-not-allowed items-center gap-1.5 rounded-md bg-[#5456DE]/60 px-3 py-2 text-xs font-semibold text-white/70"
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
          disabled
          className="cursor-not-allowed rounded-md border border-[#676D89] bg-[#0C1122] px-3 py-2 text-xs font-semibold text-white/50"
        >
          Add to Wallet
        </button>
      </div>

      <div className="flex w-full items-center gap-2 border-t border-[#676D89]/60 px-4 py-3 text-xs font-medium text-white">
        <span aria-hidden className="text-base leading-none">
          ≡
        </span>
        Ticket Information
      </div>
    </article>
  );
}


function QrCard({ ticket }: { ticket: ApiMyTicket }) {
  return (
    <aside className="flex flex-col items-center rounded-xl border border-[#676D89] bg-[#171B26] px-6 py-4">
      <div className="flex w-full items-center justify-between text-[10px]">
        <span className="flex items-center gap-1.5 text-[#72E08C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#72E08C]" />
          OFFICIAL PASS
        </span>

        <span className="font-semibold text-white">
          SECURE QR VALIDATION
        </span>
      </div>

      {/* REAL QR CODE */}
      <div className="mt-5 flex h-[232px] w-[232px] items-center justify-center rounded-lg bg-white p-4">
        <QRCodeSVG
          value={ticket.ticket_code}
          size={200}
          level="H"
          bgColor="#FFFFFF"
          fgColor="#0B1020"
          marginSize={2}
        />
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-[#AAB0C5]">
        <span className="font-semibold text-[#72E08C]">
          Official LYNORA Ticket
        </span>
        <br />
        Scan your ticket QR code for identification.
      </p>

      <div className="mt-4 max-w-full truncate rounded-full border border-[#676D89] bg-[#0C1122] px-6 py-2 text-xs font-semibold tracking-wide text-white">
        CODE: {ticket.ticket_code}
      </div>
    </aside>
  );
}


// OTHER ACTIVE TICKETS

function OtherTicketRow({
  tickets,
}: {
  tickets: ApiMyTicket[];
}) {
  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <article
          key={ticket.ticket_id}
          className="overflow-hidden rounded-xl border border-[#676D89] bg-[#171B26]"
        >
          <div className="flex items-start gap-4 p-4">
            <img
              src={ticket.poster_url || "/images/hero/home.jpg"}
              alt={ticket.event_name}
              className="h-14 w-14 shrink-0 rounded-md object-cover"
              onError={(e) => {
                e.currentTarget.src = "/images/hero/home.jpg";
              }}
            />

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-white">
                {ticket.event_name}
              </h3>

              <p className="mt-1 text-[11px] text-[#AAB0C5]">
                {formatDate(ticket.start_date)}
                {ticket.venue_name ? ` · ${ticket.venue_name}` : ""}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded border border-[#676D89] bg-[#0C1122] px-2 py-0.5 text-[10px] text-[#AAB0C5]">
                  {ticket.category_name}
                </span>

                <span className="rounded border border-[#676D89] bg-[#0C1122] px-2 py-0.5 text-[10px] text-[#AAB0C5]">
                  {ticket.ticket_code}
                </span>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-[#152B32] px-2.5 py-1 text-[10px] font-semibold text-[#26ADA0]">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#676D89]/60 px-4 py-3">
            <span className="rounded-md bg-[#0C1122] px-3 py-1.5 text-xs font-medium text-white">
              {ticket.order_code}
            </span>

            <span className="text-xs font-semibold text-[#AAB0C5]">
              {ticket.category_name}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

// HISTORY GRID

function HistoryGrid({
  tickets,
}: {
  tickets: ApiMyTicket[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tickets.map((ticket) => (
        <article
          key={ticket.ticket_id}
          className="overflow-hidden rounded-xl border border-[#676D89] bg-[#171B26]"
        >
          <div className="relative h-36 bg-[#0C1122]">
            <img
              src={ticket.poster_url || "/images/hero/home.jpg"}
              alt={ticket.event_name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/images/hero/home.jpg";
              }}
            />

            <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
              Completed
            </span>

            <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
              {ticket.category_name}
            </span>
          </div>

          <div className="space-y-2 p-3">
            <h3 className="text-sm font-semibold text-white">
              {ticket.event_name}
            </h3>

            <p className="text-[11px] text-[#AAB0C5]">
              {formatDate(ticket.start_date)}
            </p>

            <p className="text-[11px] text-[#AAB0C5]">
              {ticket.venue_name || "Venue information unavailable"}
            </p>

            <div className="flex items-center justify-between gap-2 border-t border-[#676D89]/60 pt-3">
              <span className="truncate text-[10px] text-[#AAB0C5]">
                {ticket.ticket_code}
              </span>

              <span className="shrink-0 rounded-full bg-[#2E2723] px-2.5 py-1 text-[10px] font-semibold text-[#F5B84E]">
                USED
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// CANCELLED TICKET LIST

function CancelledTickets({
  tickets,
}: {
  tickets: ApiMyTicket[];
}) {
  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <article
          key={ticket.ticket_id}
          className="flex items-center gap-4 rounded-xl border border-[#676D89] bg-[#171B26] p-4"
        >
          <img
            src={ticket.poster_url || "/images/hero/home.jpg"}
            alt={ticket.event_name}
            className="h-14 w-14 shrink-0 rounded-md object-cover opacity-60"
            onError={(e) => {
              e.currentTarget.src = "/images/hero/home.jpg";
            }}
          />

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">
              {ticket.event_name}
            </h3>

            <p className="mt-1 text-[11px] text-[#AAB0C5]">
              {ticket.category_name} · {ticket.ticket_code}
            </p>

            <p className="mt-1 text-[11px] text-[#AAB0C5]">
              {formatDate(ticket.start_date)}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[#2F1E2A] px-2.5 py-1 text-[10px] font-semibold text-[#FF6B81]">
            {ticket.ticket_status === "refunded" ? "REFUNDED" : "CANCELLED"}
          </span>
        </article>
      ))}
    </div>
  );
}

// EMPTY STATE

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[#676D89] bg-[#171B26] px-6 py-14 text-center">
      <img
        src="/icons/ticket.png"
        alt=""
        className="h-10 w-10 opacity-70"
      />

      <h3 className="mt-4 text-base font-semibold text-white">
        {message}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-[#AAB0C5]">
       Your purchased tickets will appear here along with their available e-ticket information.
      </p>

      <Link
        href="/customer/explore"
        className="mt-5 rounded-md bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Buy Tickets
      </Link>
    </div>
  );
}

// MAIN PAGE

export default function MyTicketsPage() {
  const [tab, setTab] = useState<Tab>("active");

  const [tickets, setTickets] = useState<ApiMyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTickets() {
      try {
        setLoading(true);
        setError("");

        const result = await fetchMyTickets();

        if (isMounted) {
          setTickets(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal mengambil data tiket."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTickets = tickets.filter(
    (ticket) => ticket.ticket_status === "valid"
  );

  const historyTickets = tickets.filter(
    (ticket) => ticket.ticket_status === "used"
  );

  const cancelledTickets = tickets.filter(
    (ticket) =>
      ticket.ticket_status === "cancelled" ||
      ticket.ticket_status === "refunded"
  );

  const mainTicket = activeTickets[0];
  const otherActiveTickets = activeTickets.slice(1);

  return (
    <CustomerShell
      title="My Tickets"
      subtitle="E-ticket dan riwayat tiket konsermu"
    >
      {/* HEADING + TABS */}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`${GRADIENT} bg-clip-text text-xs font-bold tracking-wide text-transparent`}
          >
            LYNORA PASSWORD
          </p>

          <h1 className="mt-1 text-3xl font-extrabold text-white">
            MY TICKETS
          </h1>
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

      {/* LOADING */}

      {loading && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-[#676D89] bg-[#171B26] py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#676D89] border-t-[#8B5CF6]" />

          <p className="mt-4 text-sm text-[#AAB0C5]">
            Loading your tickets...
          </p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-[#FF6B81]/40 bg-[#2F1E2A] p-5">
          <h3 className="text-sm font-semibold text-[#FF6B81]">
            Failed to Load Tickets
          </h3>

          <p className="mt-2 text-xs text-[#AAB0C5]">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ACTIVE TICKETS */}

      {!loading && !error && tab === "active" && (
        <>
          {activeTickets.length === 0 ? (
            <div className="mt-6">
              <EmptyState message="	No Active Tickets Yet" />
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <MainTicketCard ticket={mainTicket} />
                <QrCard ticket={mainTicket} />
              </div>

              {otherActiveTickets.length > 0 && (
                <section className="mt-10 space-y-4">
                  <SectionTitle>Other Active Tickets</SectionTitle>

                  <OtherTicketRow tickets={otherActiveTickets} />
                </section>
              )}
            </>
          )}

          <section className="mt-10 space-y-1">
            <SectionTitle>Concert History</SectionTitle>

            <p className="pb-3 pl-4 text-xs text-[#AAB0C5]">
              A record of the concerts you&apos;ve attended with LYNORA.
            </p>

            {historyTickets.length > 0 ? (
              <HistoryGrid tickets={historyTickets.slice(0, 2)} />
            ) : (
              <p className="pl-4 text-xs text-[#AAB0C5]">
                No Concert History Yet
              </p>
            )}
          </section>
        </>
      )}

      {/* HISTORY */}

      {!loading && !error && tab === "history" && (
        <section className="mt-6 space-y-1">
          <SectionTitle>Concert History</SectionTitle>

          <p className="pb-3 pl-4 text-xs text-[#AAB0C5]">
            A record of the concerts you&apos;ve attended with LYNORA.
          </p>

          {historyTickets.length > 0 ? (
            <HistoryGrid tickets={historyTickets} />
          ) : (
            <EmptyState message="No Concert History Yet" />
          )}
        </section>
      )}

      {/* CANCELLED */}

      {!loading && !error && tab === "cancelled" && (
        <div className="mt-6">
          {cancelledTickets.length > 0 ? (
            <CancelledTickets tickets={cancelledTickets} />
          ) : (
            <EmptyState message="No Cancelled Tickets Yet" />
          )}
        </div>
      )}
    </CustomerShell>
  );
}
