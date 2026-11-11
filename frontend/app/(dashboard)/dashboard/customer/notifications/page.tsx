"use client";

import { useMemo, useState } from "react";
import CustomerShell from "@/components/dashboard/customer-shell";
import { demoNotifications, type Notification } from "@/lib/customer";

const typeIcons: Record<Notification["type"], string> = {
  ticket: "/icons/ticket.png",
  promo: "/icons/flash-sale.png",
  reminder: "/icons/time-left.png",
  system: "/icons/setting.png",
};

type Tab = "all" | "unread";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(demoNotifications);
  const [tab, setTab] = useState<Tab>("all");

  const unreadCount = items.filter((item) => !item.read).length;

  const visible = useMemo(
    () => (tab === "unread" ? items.filter((item) => !item.read) : items),
    [items, tab]
  );

  function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  function toggleRead(id: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read: !item.read } : item
      )
    );
  }

  return (
    <CustomerShell
      title="Notifications"
      subtitle="Informasi terbaru seputar tiket dan konsermu"
      actions={
        <button
          type="button"
          className="cust-btn cust-btn-ghost cust-btn-sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          style={{ opacity: unreadCount === 0 ? 0.5 : 1 }}
        >
          Tandai semua dibaca
        </button>
      }
    >
      <div className="cust-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`cust-tab ${tab === "all" ? "active" : ""}`}
          onClick={() => setTab("all")}
        >
          Semua ({items.length})
        </button>
        <button
          type="button"
          className={`cust-tab ${tab === "unread" ? "active" : ""}`}
          onClick={() => setTab("unread")}
        >
          Belum dibaca ({unreadCount})
        </button>
      </div>

      {visible.length > 0 ? (
        <div className="notif-list">
          {visible.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`notif-item ${item.read ? "" : "unread"}`}
              onClick={() => toggleRead(item.id)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
                color: "inherit",
                font: "inherit",
              }}
            >
              <span className="notif-icon">
                <img src={typeIcons[item.type]} alt="" />
              </span>
              <span className="notif-body" style={{ display: "block" }}>
                <h4>
                  {item.title}
                  {!item.read ? <span className="notif-dot" /> : null}
                </h4>
                <p>{item.message}</p>
                <span className="notif-time">{item.time}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="cust-empty">
          <img src="/icons/notif.png" alt="" />
          <h3>Tidak ada notifikasi</h3>
          <p>
            {tab === "unread"
              ? "Semua notifikasi sudah kamu baca. Kerja bagus!"
              : "Notifikasi tentang tiket dan konsermu akan muncul di sini."}
          </p>
        </div>
      )}
    </CustomerShell>
  );
}
