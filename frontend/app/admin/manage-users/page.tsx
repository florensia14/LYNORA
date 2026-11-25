"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";

type Role = "customer" | "organizer" | "super_admin";
type Approval = "pending" | "approved" | "rejected";
type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  organization_name: string | null;
  approval_status: Approval;
  is_active: number | boolean;
  created_at: string;
};
type UserForm = {
  fullName: string;
  organizerName: string;
  phone: string;
  email: string;
  password: string;
};

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

const ICONS = {
  total: "/icons/attendees (1).png",
  customer: "/icons/user.png",
  organizer: "/icons/spotlight.png",
  pending: "/icons/clock.png",
  approve: "/icons/check (3).png",
  reject: "/icons/close.png",
  edit: "/icons/edit.png",
  delete: "/icons/bin.png",
};

const EMPTY_FORM: UserForm = {
  fullName: "",
  organizerName: "",
  phone: "",
  email: "",
  password: "",
};

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function dateLabel(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join("").toUpperCase();
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [decision, setDecision] = useState<{ user: UserRow; action: "approved" | "rejected" } | null>(null);
  const [selectedRole, setSelectedRole] = useState<"customer" | "organizer">("customer");
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/admin/users`, {
        headers: authHeaders(), cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal mengambil data pengguna.");
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const q = search.trim().toLowerCase();
    const status = user.approval_status || (user.is_active ? "approved" : "pending");
    const searchable = [user.name, user.email, user.organization_name || "", String(user.id)];
    return (!q || searchable.some((value) => value.toLowerCase().includes(q)))
      && (roleFilter === "all" || user.role === roleFilter)
      && (statusFilter === "all" || status === statusFilter);
  }), [users, search, roleFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: users.length,
    customers: users.filter((u) => u.role === "customer").length,
    organizers: users.filter((u) => u.role === "organizer").length,
    pending: users.filter((u) => u.approval_status === "pending").length,
  }), [users]);

  function updateForm(key: keyof UserForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAdd() {
    setError("");
    setNotice("");
    setSelectedRole("customer");
    setForm(EMPTY_FORM);
    setShowAdd(true);
  }

  function openEdit(user: UserRow) {
    setError("");
    setNotice("");
    setForm({
      fullName: user.name || "",
      organizerName: user.organization_name || "",
      phone: user.phone || "",
      email: user.email || "",
      password: "",
    });
    setEditingUser(user);
  }

  function closeForms() {
    setShowAdd(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          role: selectedRole,
          name: form.fullName,
          applicant_name: form.fullName,
          organization_name: form.organizerName,
          phone: form.phone,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal membuat akun.");
      closeForms();
      setNotice("Akun berhasil dibuat dan langsung aktif.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun.");
    } finally { setSaving(false); }
  }

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: form.fullName,
          organization_name: editingUser.role === "organizer" ? form.organizerName : null,
          email: form.email,
          phone: form.phone,
          password: form.password || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal memperbarui akun.");
      closeForms();
      setNotice("Data pengguna berhasil diperbarui.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui akun.");
    } finally { setSaving(false); }
  }

  async function submitDecision() {
    if (!decision) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/admin/users/${decision.user.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: decision.action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal memperbarui status akun.");
      setNotice(decision.action === "approved" ? "Pendaftaran berhasil disetujui." : "Pendaftaran berhasil ditolak.");
      setDecision(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui status akun.");
    } finally { setSaving(false); }
  }

  async function deleteUser() {
    if (!deletingUser) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/admin/users/${deletingUser.id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal menghapus pengguna.");
      setNotice("Pengguna berhasil dihapus.");
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus pengguna.");
    } finally { setSaving(false); }
  }

  return (
    <div className="min-w-0 space-y-5 text-white">
      <AdminPageHero
        eyebrow="LYNORA SUPER ADMIN"
        title={<>Manage <span className="bg-gradient-to-r from-[#C4B5FD] to-[#22D3EE] bg-clip-text text-transparent">Users</span></>}
        description="Manage customer accounts, event organizers, and registration verification."
      />

      {notice && <Alert tone="success" message={notice} onClose={() => setNotice("")} />}
      {error && <Alert tone="error" message={error} onClose={() => setError("")} />}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Users" value={counts.total} icon={ICONS.total} />
        <StatCard label="Customers" value={counts.customers} icon={ICONS.customer} />
        <StatCard label="Event Organizers" value={counts.organizers} icon={ICONS.organizer} />
        <StatCard label="Pending Verification" value={counts.pending} icon={ICONS.pending} accent />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#34345D] bg-[#111A34]/95 shadow-[0_12px_35px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="text-base font-bold text-white sm:text-lg">User Management</h2><p className="mt-1 text-xs text-slate-400">Review registrations and manage platform accounts.</p></div>
          <button onClick={openAdd} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5456DE] px-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110"><span className="text-lg leading-none">+</span> Add User</button>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#51418C] bg-[#0B1122] px-3"><span className="text-slate-400">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or ID..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 rounded-xl border border-[#34345D] bg-[#171D39] px-3 text-sm text-slate-200 outline-none"><option value="all">All Roles</option><option value="customer">Customer</option><option value="organizer">Event Organizer</option><option value="super_admin">Super Admin</option></select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-[#34345D] bg-[#171D39] px-3 text-sm text-slate-200 outline-none"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead><tr className="bg-[#3D2BA7] text-[11px] uppercase tracking-wide text-white"><th className="px-5 py-3.5 font-semibold">User</th><th className="px-4 py-3.5 font-semibold">Role</th><th className="px-4 py-3.5 font-semibold">Email / Phone</th><th className="px-4 py-3.5 font-semibold">Date Joined</th><th className="px-4 py-3.5 font-semibold">Status</th><th className="px-5 py-3.5 text-center font-semibold">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">Loading users...</td></tr>
                : filteredUsers.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No users found.</td></tr>
                : filteredUsers.map((user) => {
                  const status = user.approval_status || (user.is_active ? "approved" : "pending");
                  return <tr key={user.id} className="border-b border-white/[0.06] transition hover:bg-white/[0.025]">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#8B5CF6]/40 bg-gradient-to-br from-[#713BD8] to-[#263C79] text-xs font-bold text-white">{initials(user.name || "U")}</div><div className="min-w-0"><p className="max-w-[220px] truncate text-sm font-semibold text-white">{user.name}</p>{user.organization_name && <p className="max-w-[220px] truncate text-xs text-slate-400">{user.organization_name}</p>}<p className="text-[11px] text-slate-500">ID: {user.id}</p></div></div></td>
                    <td className="px-4 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-4"><p className="text-xs text-slate-200">{user.email}</p><p className="mt-1 text-[11px] text-slate-500">{user.phone || "No phone"}</p></td>
                    <td className="px-4 py-4 text-xs text-slate-300">{dateLabel(user.created_at)}</td>
                    <td className="px-4 py-4"><StatusBadge status={status} /></td>
                    <td className="px-5 py-4"><div className="flex items-center justify-center gap-2">
                      {status === "pending" && user.role !== "super_admin" && <>
                        <IconButton title="Reject registration" icon={ICONS.reject} onClick={() => setDecision({ user, action: "rejected" })} tone="danger" />
                        <IconButton title="Approve registration" icon={ICONS.approve} onClick={() => setDecision({ user, action: "approved" })} tone="success" />
                      </>}
                      {user.role !== "super_admin" && <>
                        <IconButton title="Edit user" icon={ICONS.edit} onClick={() => openEdit(user)} tone="neutral" />
                        <IconButton title="Delete user" icon={ICONS.delete} onClick={() => setDeletingUser(user)} tone="danger" />
                      </>}
                      {user.role === "super_admin" && <span className="text-xs text-slate-500">Protected</span>}
                    </div></td>
                  </tr>;
                })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing {filteredUsers.length} of {users.length} users</span><button onClick={() => void loadUsers()} className="self-start text-violet-300 hover:text-white">Refresh data ↻</button></div>
      </section>

      {showAdd && <Modal title="Add New User" subtitle="Create a new LYNORA account." onClose={closeForms}>
        <form onSubmit={createUser} className="space-y-3">
          <RolePicker selectedRole={selectedRole} onChange={setSelectedRole} />
          {selectedRole === "organizer" && <Field label="Organizer Name" required value={form.organizerName} onChange={(v) => updateForm("organizerName", v)} placeholder="Enter organization name" />}
          <Field label={selectedRole === "organizer" ? "Applicant Name" : "Full Name"} required value={form.fullName} onChange={(v) => updateForm("fullName", v)} placeholder={selectedRole === "organizer" ? "Enter applicant full name" : "Enter full name"} />
          <div className="grid grid-cols-2 gap-3"><Field label="Email Address" required type="email" value={form.email} onChange={(v) => updateForm("email", v)} placeholder="name@email.com" /><Field label="Phone Number" required value={form.phone} onChange={(v) => updateForm("phone", v)} placeholder="08xxxxxxxxxx" /></div>
          <Field label="Password" required type="password" value={form.password} onChange={(v) => updateForm("password", v)} placeholder="Minimum 8 characters" />
          <p className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-2 text-[10px] leading-4 text-slate-400">Accounts created by Super Admin are activated immediately. Passwords are securely hashed by the backend.</p>
          <ModalActions onCancel={closeForms} saving={saving} submitLabel={`Create ${selectedRole === "customer" ? "Customer" : "Organizer"}`} />
        </form>
      </Modal>}

      {editingUser && <Modal title="Edit User" subtitle={`Update account information · ID ${editingUser.id}`} onClose={closeForms}>
        <form onSubmit={updateUser} className="space-y-3">
          <div className="mb-1 flex items-center gap-2"><RoleBadge role={editingUser.role} /><StatusBadge status={editingUser.approval_status || (editingUser.is_active ? "approved" : "pending")} /></div>
          {editingUser.role === "organizer" && <Field label="Organizer Name" required value={form.organizerName} onChange={(v) => updateForm("organizerName", v)} placeholder="Enter organization name" />}
          <Field label={editingUser.role === "organizer" ? "Applicant Name" : "Full Name"} required value={form.fullName} onChange={(v) => updateForm("fullName", v)} placeholder="Enter full name" />
          <div className="grid grid-cols-2 gap-3"><Field label="Email Address" required type="email" value={form.email} onChange={(v) => updateForm("email", v)} placeholder="name@email.com" /><Field label="Phone Number" required value={form.phone} onChange={(v) => updateForm("phone", v)} placeholder="08xxxxxxxxxx" /></div>
          <Field label="New Password" type="password" value={form.password} onChange={(v) => updateForm("password", v)} placeholder="Leave blank to keep current password" />
          <p className="rounded-lg border border-violet-400/15 bg-violet-400/[0.06] px-3 py-2 text-[10px] leading-4 text-slate-400">Existing data is pre-filled. Leave New Password empty if you do not want to change it.</p>
          <ModalActions onCancel={closeForms} saving={saving} submitLabel="Save Changes" />
        </form>
      </Modal>}

      {decision && <ConfirmModal
        title={decision.action === "approved" ? "Approve Registration?" : "Reject Registration?"}
        description={decision.action === "approved"
          ? `Approve ${decision.user.name}? This account will be activated and can sign in.`
          : `Reject ${decision.user.name}? This account will not be able to sign in.`}
        confirmLabel={decision.action === "approved" ? "Yes, Approve" : "Yes, Reject"}
        tone={decision.action === "approved" ? "success" : "danger"}
        saving={saving}
        onCancel={() => setDecision(null)}
        onConfirm={() => void submitDecision()}
      />}

      {deletingUser && <ConfirmModal
        title="Delete User?"
        description={`Are you sure you want to delete ${deletingUser.name}? This action cannot be undone. If this account is linked to transaction records, the system will prevent deletion.`}
        confirmLabel="OK, Delete"
        tone="danger"
        saving={saving}
        onCancel={() => setDeletingUser(null)}
        onConfirm={() => void deleteUser()}
      />}
    </div>
  );
}

function StatCard({ label, value, icon, accent = false }: { label: string; value: number; icon: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-[#34345D] bg-[#171D39] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.13)]">
    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6D42C5]/25"><img src={icon} alt="" className="h-6 w-6 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div><p className="text-xs font-medium text-slate-400">{label}</p></div>
    <p className={`mt-3 text-2xl font-bold tracking-tight ${accent ? "text-amber-300" : "text-white"}`}>{value.toLocaleString("en-US")}</p>
  </div>;
}

function IconButton({ title, icon, onClick, tone }: { title: string; icon: string; onClick: () => void; tone: "danger" | "success" | "neutral" }) {
  const toneClass = tone === "danger" ? "border-rose-500/20 bg-rose-500/[0.08] hover:bg-rose-500/20" : tone === "success" ? "border-emerald-500/20 bg-emerald-500/[0.08] hover:bg-emerald-500/20" : "border-violet-400/20 bg-violet-400/[0.07] hover:bg-violet-400/15";
  return <button type="button" title={title} aria-label={title} onClick={onClick} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${toneClass}`}><img src={icon} alt="" className="h-[17px] w-[17px] object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} /></button>;
}

function RoleBadge({ role }: { role: Role }) {
  const label = role === "super_admin" ? "Super Admin" : role === "organizer" ? "Event Organizer" : "Customer";
  const color = role === "super_admin" ? "border-rose-400/20 bg-rose-400/10 text-rose-300" : role === "organizer" ? "border-violet-400/20 bg-violet-400/10 text-violet-300" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${color}`}>{label}</span>;
}

function StatusBadge({ status }: { status: Approval }) {
  const color = status === "approved" ? "bg-emerald-500/15 text-emerald-300" : status === "rejected" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300";
  const label = status === "approved" ? "Active" : status === "rejected" ? "Rejected" : "Pending";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${color}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-300">{label}{required && <span className="ml-1 text-rose-400">*</span>}</span><input type={type} required={required} minLength={type === "password" ? 8 : undefined} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-[#39365F] bg-[#0B1122] px-3 text-[13px] text-white outline-none transition placeholder:text-slate-600 focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/15" /></label>;
}

function Modal({ children, onClose, title, subtitle }: { children: React.ReactNode; onClose: () => void; title: string; subtitle: string }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050816]/80 p-3 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="w-full max-w-[540px] overflow-hidden rounded-2xl border border-[#6750A8]/50 bg-[#11182F] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
      <div className="flex items-start justify-between border-b border-white/[0.08] bg-gradient-to-r from-[#2A1C58] to-[#171D39] px-5 py-3"><div><h3 className="text-base font-bold text-white">{title}</h3><p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 text-xl leading-6 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">×</button></div>
      <div className="p-4">{children}</div>
    </div>
  </div>;
}

function RolePicker({ selectedRole, onChange }: { selectedRole: "customer" | "organizer"; onChange: (role: "customer" | "organizer") => void }) {
  return <div><label className="mb-1.5 block text-[11px] font-semibold text-slate-300">Select Role</label><div className="grid grid-cols-2 gap-2">
    <button type="button" onClick={() => onChange("customer")} className={`rounded-lg border px-3 py-2 text-left transition ${selectedRole === "customer" ? "border-[#8B5CF6] bg-[#6D42C5]/20" : "border-[#34345D] bg-[#0B1122] hover:border-[#6651A5]"}`}><span className="block text-xs font-bold">Customer</span><span className="mt-0.5 block text-[10px] text-slate-400">Ticket buyer account</span></button>
    <button type="button" onClick={() => onChange("organizer")} className={`rounded-lg border px-3 py-2 text-left transition ${selectedRole === "organizer" ? "border-[#8B5CF6] bg-[#6D42C5]/20" : "border-[#34345D] bg-[#0B1122] hover:border-[#6651A5]"}`}><span className="block text-xs font-bold">Event Organizer</span><span className="mt-0.5 block text-[10px] text-slate-400">Concert management account</span></button>
  </div></div>;
}

function ModalActions({ onCancel, saving, submitLabel }: { onCancel: () => void; saving: boolean; submitLabel: string }) {
  return <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-3"><button type="button" onClick={onCancel} className="h-9 rounded-lg border border-[#454568] px-4 text-xs font-semibold text-slate-300 transition hover:bg-white/5">Cancel</button><button disabled={saving} className="h-9 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#5456DE] px-4 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60">{saving ? "Please wait..." : submitLabel}</button></div>;
}

function ConfirmModal({ title, description, confirmLabel, tone, saving, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; tone: "success" | "danger"; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Modal title={title} subtitle="LYNORA SUPER ADMIN" onClose={onCancel}>
    <p className="text-sm leading-6 text-slate-300">{description}</p>
    <div className="mt-4 flex justify-end gap-2 border-t border-white/[0.08] pt-3"><button type="button" onClick={onCancel} className="h-9 rounded-lg border border-[#454568] px-4 text-xs font-semibold text-slate-300 transition hover:bg-white/5">Cancel</button><button type="button" disabled={saving} onClick={onConfirm} className={`h-9 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-60 ${tone === "success" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"}`}>{saving ? "Please wait..." : confirmLabel}</button></div>
  </Modal>;
}

function Alert({ tone, message, onClose }: { tone: "success" | "error"; message: string; onClose: () => void }) {
  return <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}><span>{message}</span><button type="button" onClick={onClose} aria-label="Dismiss">×</button></div>;
}
