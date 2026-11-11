"use client";

import { useState } from "react";
import CustomerShell from "@/components/dashboard/customer-shell";

type ToggleKey =
  | "emailNotif"
  | "pushNotif"
  | "promoEmail"
  | "reminder";

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    emailNotif: true,
    pushNotif: true,
    promoEmail: false,
    reminder: true,
  });

  function flip(key: ToggleKey) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const notifRows: Array<{
    key: ToggleKey;
    title: string;
    desc: string;
  }> = [
    {
      key: "emailNotif",
      title: "Notifikasi Email",
      desc: "Terima email tentang pembelian, tiket, dan perubahan jadwal.",
    },
    {
      key: "pushNotif",
      title: "Notifikasi Push",
      desc: "Kirim pemberitahuan langsung ke perangkatmu.",
    },
    {
      key: "reminder",
      title: "Pengingat Konser",
      desc: "Ingatkan aku sebelum konser yang sudah aku beli dimulai.",
    },
    {
      key: "promoEmail",
      title: "Promo & Penawaran",
      desc: "Info diskon, presale, dan penawaran spesial dari LYNORA.",
    },
  ];

  return (
    <CustomerShell
      title="Settings"
      subtitle="Atur preferensi akun dan keamananmu"
    >
      <div style={{ display: "grid", gap: 18, maxWidth: 860 }}>
        {/* NOTIFICATIONS */}
        <div className="cust-card">
          <div className="cust-card-head">
            <div>
              <h3 className="cust-card-title">Notifikasi</h3>
              <p className="cust-card-sub">
                Pilih informasi apa saja yang ingin kamu terima.
              </p>
            </div>
          </div>

          {notifRows.map((row) => (
            <div className="setting-row" key={row.key}>
              <div>
                <h4>{row.title}</h4>
                <p>{row.desc}</p>
              </div>
              <button
                type="button"
                className={`switch ${toggles[row.key] ? "on" : ""}`}
                aria-pressed={toggles[row.key]}
                aria-label={row.title}
                onClick={() => flip(row.key)}
              />
            </div>
          ))}
        </div>

        {/* PASSWORD */}
        <div className="cust-card">
          <div className="cust-card-head">
            <div>
              <h3 className="cust-card-title">Keamanan</h3>
              <p className="cust-card-sub">
                Ubah kata sandi secara berkala untuk menjaga akunmu.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field full">
              <label htmlFor="current">Kata Sandi Saat Ini</label>
              <input id="current" type="password" placeholder="••••••••" />
            </div>
            <div className="form-field">
              <label htmlFor="new">Kata Sandi Baru</label>
              <input id="new" type="password" placeholder="••••••••" />
            </div>
            <div className="form-field">
              <label htmlFor="confirm">Konfirmasi Kata Sandi</label>
              <input id="confirm" type="password" placeholder="••••••••" />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cust-btn cust-btn-primary">
              Perbarui Kata Sandi
            </button>
          </div>
        </div>

        {/* PREFERENCES */}
        <div className="cust-card">
          <div className="cust-card-head">
            <div>
              <h3 className="cust-card-title">Preferensi</h3>
              <p className="cust-card-sub">
                Sesuaikan bahasa dan mata uang tampilan.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="language">Bahasa</label>
              <select id="language" defaultValue="id">
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="currency">Mata Uang</label>
              <select id="currency" defaultValue="idr">
                <option value="idr">IDR — Rupiah</option>
                <option value="usd">USD — Dollar</option>
              </select>
            </div>
          </div>
        </div>

        {/* DANGER */}
        <div className="cust-card danger-zone">
          <div className="cust-card-head" style={{ marginBottom: 6 }}>
            <div>
              <h3 className="cust-card-title">Zona Berbahaya</h3>
              <p className="cust-card-sub">
                Tindakan ini permanen dan tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <div className="setting-row" style={{ borderBottom: 0 }}>
            <div>
              <h4>Hapus Akun</h4>
              <p>
                Menghapus akun akan menghilangkan semua tiket dan riwayat
                pesananmu.
              </p>
            </div>
            <button type="button" className="cust-btn cust-btn-danger">
              Hapus Akun
            </button>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
