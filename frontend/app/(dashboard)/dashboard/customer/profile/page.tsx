"use client";

import { useEffect, useState } from "react";
import CustomerShell from "@/components/dashboard/customer-shell";
import { imageUrl, initials } from "@/lib/customer";

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  profile_photo: string | null;
};

const emptyForm: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  bio: "",
  profile_photo: null,
};

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          bio: user.bio || "",
          profile_photo: user.profile_photo || null,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    try {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : {};
      localStorage.setItem("user", JSON.stringify({ ...user, ...form }));
    } catch {
      /* ignore */
    }
    setSaved(true);
  }

  const avatar = form.profile_photo
    ? imageUrl(form.profile_photo)
    : null;

  return (
    <CustomerShell
      title="Profile"
      subtitle="Kelola informasi akun dan data pribadimu"
    >
      <div className="profile-grid">
        {/* SIDE CARD */}
        <div className="cust-card profile-side">
          {avatar ? (
            <img
              className="profile-avatar"
              src={avatar}
              alt="Profile"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="profile-avatar"
              style={{
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg,#5847e8,#22d3ee)",
                fontSize: 32,
                fontWeight: 900,
                color: "#fff",
              }}
            >
              {initials(form.name)}
            </div>
          )}

          <h3>{form.name || "LYNORA User"}</h3>
          <span className="profile-role">Customer</span>

          <button type="button" className="cust-btn cust-btn-ghost">
            <img
              src="/icons/upload.png"
              alt=""
              style={{ width: 15, height: 15, objectFit: "contain" }}
            />
            Ganti Foto
          </button>
        </div>

        {/* FORM CARD */}
        <form className="cust-card" onSubmit={handleSave}>
          <div className="cust-card-head">
            <div>
              <h3 className="cust-card-title">Informasi Pribadi</h3>
              <p className="cust-card-sub">
                Pastikan data kamu selalu akurat dan terbaru.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Nama Lengkap</label>
              <input
                id="name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Nama lengkap kamu"
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="nama@email.com"
              />
            </div>

            <div className="form-field">
              <label htmlFor="phone">Nomor Telepon</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="+62 812 3456 7890"
              />
            </div>

            <div className="form-field">
              <label htmlFor="city">Kota</label>
              <input id="city" placeholder="Jakarta" defaultValue="Jakarta" />
            </div>

            <div className="form-field full">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(event) => update("bio", event.target.value)}
                placeholder="Ceritakan sedikit tentang dirimu..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="cust-btn cust-btn-primary">
              Simpan Perubahan
            </button>
            <button
              type="button"
              className="cust-btn cust-btn-ghost"
              onClick={() => setForm(emptyForm)}
            >
              Reset
            </button>
            {saved ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#7dffe9",
                  fontSize: 12,
                }}
              >
                <img
                  src="/icons/check%20(1).png"
                  alt=""
                  style={{ width: 16, height: 16, objectFit: "contain" }}
                />
                Perubahan tersimpan
              </span>
            ) : null}
          </div>
        </form>
      </div>
    </CustomerShell>
  );
}
