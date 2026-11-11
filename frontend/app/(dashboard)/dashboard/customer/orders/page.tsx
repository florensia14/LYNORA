"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CustomerShell from "@/components/dashboard/customer-shell";
import {
  demoOrders,
  formatCurrency,
  orderStatusLabel,
  type OrderStatus,
} from "@/lib/customer";

const filters: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "paid", label: "Dibayar" },
  { key: "pending", label: "Menunggu" },
  { key: "refunded", label: "Refund" },
];

export default function MyOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const orders = useMemo(
    () =>
      filter === "all"
        ? demoOrders
        : demoOrders.filter((order) => order.status === filter),
    [filter]
  );

  const totalSpent = demoOrders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <CustomerShell
      title="My Orders"
      subtitle="Riwayat pembelian tiket kamu di LYNORA"
    >
      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <span className="stat-icon">
            <img src="/icons/clipboard.png" alt="" />
          </span>
          <div>
            <strong>{demoOrders.length}</strong>
            <span>Total Pesanan</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <img src="/icons/check%20(1).png" alt="" />
          </span>
          <div>
            <strong>
              {demoOrders.filter((order) => order.status === "paid").length}
            </strong>
            <span>Berhasil</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <img src="/icons/dollar.png" alt="" />
          </span>
          <div>
            <strong>{formatCurrency(totalSpent)}</strong>
            <span>Total Belanja</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <img src="/icons/ticket.png" alt="" />
          </span>
          <div>
            <strong>
              {demoOrders.reduce((sum, order) => sum + order.quantity, 0)}
            </strong>
            <span>Total Tiket</span>
          </div>
        </div>
      </div>

      <div className="cust-card">
        <div className="cust-card-head">
          <div>
            <h3 className="cust-card-title">Daftar Pesanan</h3>
            <p className="cust-card-sub">{orders.length} pesanan ditampilkan</p>
          </div>
        </div>

        <div className="cust-chips" style={{ marginBottom: 18 }}>
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`cust-chip ${filter === item.key ? "active" : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {orders.length > 0 ? (
          <>
            {/* Desktop table */}
            <div style={{ overflowX: "auto" }}>
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Konser</th>
                    <th>Order ID</th>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div className="order-event">
                          <img
                            src={order.poster_url}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.src = "/images/hero/home.jpg";
                            }}
                          />
                          <div>
                            <strong>{order.event_name}</strong>
                            <span>{order.method}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="order-id">{order.id}</span>
                      </td>
                      <td>{order.date}</td>
                      <td>{order.quantity} tiket</td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>
                        <span className={`order-status ${order.status}`}>
                          {orderStatusLabel[order.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cust-btn cust-btn-ghost cust-btn-sm"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="order-cards">
              {orders.map((order) => (
                <div className="cust-card" key={order.id}>
                  <div className="order-event" style={{ marginBottom: 12 }}>
                    <img
                      src={order.poster_url}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src = "/images/hero/home.jpg";
                      }}
                    />
                    <div>
                      <strong>{order.event_name}</strong>
                      <span>
                        {order.date} · {order.quantity} tiket
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span className="order-id">{order.id}</span>
                    <span className={`order-status ${order.status}`}>
                      {orderStatusLabel[order.status]}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    <strong>{formatCurrency(order.total)}</strong>
                    <button
                      type="button"
                      className="cust-btn cust-btn-ghost cust-btn-sm"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="cust-empty" style={{ border: 0 }}>
            <img src="/icons/clipboard.png" alt="" />
            <h3>Tidak ada pesanan</h3>
            <p>Belum ada pesanan dengan status ini.</p>
            <Link
              href="/dashboard/customer/explore"
              className="cust-btn cust-btn-primary"
            >
              Mulai Belanja
            </Link>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
