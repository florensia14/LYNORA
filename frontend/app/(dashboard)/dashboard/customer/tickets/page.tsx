"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/dashboard/customer-shell";
import {
  demoTickets,
  ticketStatusLabel,
  type Ticket,
} from "@/lib/customer";

type Tab = "active" | "history";

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <article className="ticket-card">
      <div className="ticket-card-media">
        <img
          src={ticket.poster_url}
          alt={ticket.event_name}
          onError={(event) => {
            event.currentTarget.src = "/images/hero/home.jpg";
          }}
        />
        <span className="ticket-stub" />
      </div>

      <div className="ticket-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3>{ticket.event_name}</h3>
            <span className="ticket-type">{ticket.type}</span>
          </div>
          <span className={`ticket-status ${ticket.status}`}>
            {ticketStatusLabel[ticket.status]}
          </span>
        </div>

        <div className="ticket-meta">
          <div className="ticket-meta-row">
            <img src="/icons/calendar.png" alt="" />
            <span>
              {ticket.date} · {ticket.time}
            </span>
          </div>
          <div className="ticket-meta-row">
            <img src="/icons/location.png" alt="" />
            <span>
              {ticket.venue}, {ticket.city}
            </span>
          </div>
          <div className="ticket-meta-row">
            <img src="/icons/ticket.png" alt="" />
            <span>{ticket.seat}</span>
          </div>
        </div>

        <div className="ticket-foot">
          <span className="ticket-code">{ticket.code}</span>
          <button type="button" className="cust-btn cust-btn-primary cust-btn-sm">
            <img
              src="/icons/direct-download.png"
              alt=""
              style={{ width: 14, height: 14, objectFit: "contain" }}
            />
            E-Ticket
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MyTicketsPage() {
  const [tab, setTab] = useState<Tab>("active");

  const activeTickets = useMemo(
    () => demoTickets.filter((ticket) => ticket.status === "active"),
    []
  );
  const historyTickets = useMemo(
    () => demoTickets.filter((ticket) => ticket.status !== "active"),
    []
  );

  const list = tab === "active" ? activeTickets : historyTickets;

  return (
    <CustomerShell
      title="My Tickets"
      subtitle="E-ticket dan riwayat tiket konsermu"
    >
      <div className="cust-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`cust-tab ${tab === "active" ? "active" : ""}`}
          onClick={() => setTab("active")}
        >
          Aktif ({activeTickets.length})
        </button>
        <button
          type="button"
          className={`cust-tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          Riwayat ({historyTickets.length})
        </button>
      </div>

      {list.length > 0 ? (
        <div className="ticket-grid">
          {list.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="cust-empty">
          <img src="/icons/ticket.png" alt="" />
          <h3>
            {tab === "active"
              ? "Belum ada tiket aktif"
              : "Belum ada riwayat tiket"}
          </h3>
          <p>
            Tiket yang sudah kamu beli akan muncul di sini beserta e-ticket yang
            siap diunduh.
          </p>
          <Link
            href="/dashboard/customer/explore"
            className="cust-btn cust-btn-primary"
          >
            Beli Tiket
          </Link>
        </div>
      )}
    </CustomerShell>
  );
}
