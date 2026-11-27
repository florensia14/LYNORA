"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHero from "@/components/layout/AdminPageHero";
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
const API_URL = `${API_ORIGIN}/api`;
const ICON_PATH = "/images/categories/";
const PAGE_SIZE = 8;
const ICONS = {
    category: "/icons/category.png",
    active: "/icons/check (1).png",
    inactive: "/icons/close.png",
    concerts: "/icons/ticket (1).png",
    add: "/icons/plus.png",
    search: "/icons/search.png",
    view: "/icons/eye (1).png",
    edit: "/icons/edit.png",
    delete: "/icons/bin.png",
};
type Category = {
    id: number;
    name: string;
    description: string | null;
    icon?: string | null;
    status: "active" | "inactive";
    total_concerts: number;
    created_at?: string;
    updated_at?: string;
};
type CategoryForm = {
    name: string;
    description: string;
    icon: string;
    iconFile: File | null;
    status: "active" | "inactive";
};

const EMPTY_FORM: CategoryForm = {
    name: "",
    description: "",
    icon: "",
    iconFile: null,
    status: "active",
};

function PngIcon({ src, size = 16 }: {
    src: string;
    size?: number;
}) {
    return (<img src={src} alt="" aria-hidden="true" width={size} height={size} className="shrink-0 object-contain"/>);
}
function getCategoryIcon(category: Category | string) {
    const savedIcon = typeof category === "string" ? null : category.icon;
    if (savedIcon) {
        return savedIcon.startsWith("http") ? savedIcon : savedIcon.startsWith("/uploads/") ? `${API_ORIGIN}${savedIcon}` : savedIcon.startsWith("/") ? savedIcon : `${ICON_PATH}${savedIcon}`;
    }
    return `${ICON_PATH}category (1).png`;
}
function CategoryIcon({ category, size = 36, }: {
    category: Category | string;
    size?: number;
}) {
    const [failed, setFailed] = useState(false);
    const icon = getCategoryIcon(category);
    return (<div style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-xl border border-white/10 bg-[#211A42] p-1.5">

      {!failed ? (<img src={icon} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)}/>) : (<PngIcon src={ICONS.category} size={size * 0.5}/>)}

    </div>);
}
function getToken() {
    return typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;
}
async function apiRequest<T>(path: string, options: {
    method?: string;
    body?: unknown;
} = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token)
        headers.Authorization = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData))
        headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_URL}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined,
        cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(payload?.message || "Request failed.");
    }
    return payload as T;
}
function StatusBadge({ status }: {
    status: Category["status"];
}) {
    const active = status === "active";
    return (<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${active
            ? "bg-[#103D32] text-[#35D5B2]"
            : "bg-[#29324B] text-slate-300"}`}>

      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#35D5B2]" : "bg-slate-400"}`}/>

      {active ? "Active" : "Inactive"}

    </span>);
}
function StatCard({ label, value, icon, tone, color = "text-white", }: {
    label: string;
    value: number;
    icon: string;
    tone: string;
    color?: string;
}) {
    return (<div className="rounded-xl border border-white/[0.07] bg-[#161C38] p-3.5">

      <div className="flex items-center gap-2.5">

        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>

          <PngIcon src={icon} size={21}/>

        </span>

        <p className="text-[10px] font-medium text-slate-400 sm:text-xs">

          {label}

        </p>

      </div>

      <p className={`mt-3 text-2xl font-extrabold ${color}`}>

        {value.toLocaleString("en-US")}

      </p>

    </div>);
}
function CategoryModal({ open, editing, form, saving, error, onChange, onClose, onSubmit, }: {
    open: boolean;
    editing: Category | null;
    form: CategoryForm;
    saving: boolean;
    error: string;
    onChange: (value: CategoryForm) => void;
    onClose: () => void;
    onSubmit: () => void;
}) {
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}>

      <section role="dialog" aria-modal="true" className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#7650C8]/50 bg-[#111833] shadow-2xl" onClick={(e) => e.stopPropagation()}>

        <div className="shrink-0 border-b border-white/10 px-5 py-3.5">

          <p className="text-[9px] font-bold tracking-[2px] text-[#A78BFA]">

            CATEGORY MANAGEMENT

          </p>

          <h2 className="mt-1 text-base font-bold text-white">

            {editing ? "Edit Category" : "Add New Category"}

          </h2>

          <p className="mt-1 text-[11px] text-slate-400">

            Manage music categories available on LYNORA.

          </p>

        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-300">

              Category Name <span className="text-rose-400">*</span>

            </label>

            <input maxLength={100} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="POP, ROCK, HIP-HOP, EDM, KPOP, INDIE, festivall" className="h-10 w-full rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#8B5CF6]"/>

            <p className="mt-1 text-right text-[10px] text-slate-500">

              {form.name.length}/100

            </p>

          </div>

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-300">

              Description

            </label>

            <textarea rows={2} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} placeholder="Describe this music category..." className="w-full resize-none rounded-lg border border-white/10 bg-[#0B1122] p-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#8B5CF6]"/>

          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Category Icon</label>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B1122] p-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#211A42] p-1.5">
                {form.iconFile ? <img src={URL.createObjectURL(form.iconFile)} alt="Icon preview" className="h-full w-full object-contain" /> : form.icon ? <img src={form.icon.startsWith("http") ? form.icon : `${API_ORIGIN}${form.icon.startsWith("/") ? "" : "/uploads/categories/"}${form.icon}`} alt="Current category icon" className="h-full w-full object-contain" /> : <PngIcon src={ICONS.category} size={24} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">{form.iconFile?.name || (form.icon ? form.icon.split("/").pop() : "No icon selected")}</p>
                <p className="mt-1 text-[10px] text-slate-500">Upload PNG, JPG, JPEG, or WEBP (max 2 MB).</p>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onChange({ ...form, iconFile: e.target.files?.[0] || null })} className="mt-2 block w-full text-[10px] text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-[#7046C8] file:px-3 file:py-1.5 file:text-[10px] file:font-semibold file:text-white" />
              </div>
            </div>
          </div>

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-300">

              Status

            </label>

            <select value={form.status} onChange={(e) => onChange({
            ...form,
            status: e.target.value as CategoryForm["status"],
        })} className="h-10 w-full rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-white outline-none focus:border-[#8B5CF6]">

              <option value="active">Active</option>

              <option value="inactive">Inactive</option>

            </select>

            <p className="mt-1.5 text-[10px] leading-4 text-slate-500">

              Inactive categories cannot be selected when creating new concerts.

            </p>

          </div>

          {error && (<p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">

              {error}

            </p>)}

        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 px-5 py-3">

          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">

            Cancel

          </button>

          <button type="button" onClick={onSubmit} disabled={saving || !form.name.trim()} className="rounded-lg bg-gradient-to-r from-[#9333EA] to-[#7C3AED] px-5 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50">

            {saving ? "Saving..." : editing ? "Save Changes" : "Add Category"}

          </button>

        </div>

      </section>

    </div>);
}
function DetailModal({ category, onClose, }: {
    category: Category;
    onClose: () => void;
}) {
    return (<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>

      <section role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#6750A6] bg-[#111A34] shadow-2xl" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">

          <div>

            <p className="text-[10px] font-bold tracking-[2px] text-[#A78BFA]">

              CATEGORY DETAILS

            </p>

            <h2 className="mt-1 text-lg font-bold text-white">

              {category.name}

            </h2>

          </div>

          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">

            Close

          </button>

        </div>

        <div className="space-y-4 p-5 text-xs">

          <div className="flex items-center gap-3">

            <CategoryIcon category={category} size={48}/>

            <div>

              <p className="text-slate-500">Category Name</p>

              <p className="mt-1 font-semibold text-white">{category.name}</p>

            </div>

          </div>

          <div>

            <p className="text-slate-500">Description</p>

            <p className="mt-1 leading-5 text-slate-200">

              {category.description || "No description provided."}

            </p>

          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>

              <p className="text-slate-500">Total Concerts</p>

              <p className="mt-1 text-lg font-bold text-white">

                {category.total_concerts}

              </p>

            </div>

            <div>

              <p className="text-slate-500">Status</p>

              <div className="mt-2">

                <StatusBadge status={category.status}/>

              </div>

            </div>

          </div>

          <div>

            <p className="text-slate-500">Created At</p>

            <p className="mt-1 text-slate-200">

              {category.created_at
            ? new Date(category.created_at).toLocaleString("en-GB")
            : "-"}

            </p>

          </div>

          <div>

            <p className="text-slate-500">Last Updated</p>

            <p className="mt-1 text-slate-200">

              {category.updated_at
            ? new Date(category.updated_at).toLocaleString("en-GB")
            : "-"}

            </p>

          </div>

        </div>

      </section>

    </div>);
}
export default function ManageCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [selected, setSelected] = useState<Category | null>(null);
    const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);
    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const payload = await apiRequest<{
                categories?: Category[];
            }>("/categories/admin");
            const databaseCategories = (payload.categories || [])
                .filter((category) => Number.isFinite(Number(category.id)) && Boolean(category.name?.trim()))
                .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
            setCategories(databaseCategories);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load categories.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadCategories();
    }, [loadCategories]);
    const stats = useMemo(() => ({
        total: categories.length,
        active: categories.filter((item) => item.status === "active").length,
        inactive: categories.filter((item) => item.status === "inactive").length,
        concerts: categories.reduce((sum, item) => sum + Number(item.total_concerts || 0), 0),
    }), [categories]);
    const filtered = useMemo(() => categories.filter((item) => {
        const keyword = search.trim().toLowerCase();
        const matchesSearch = !keyword ||
            `${item.name} ${item.description || ""}`
                .toLowerCase()
                .includes(keyword);
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [categories, search, statusFilter]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    useEffect(() => {
        setPage(1);
    }, [search, statusFilter]);
    function openCreate() {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setModalOpen(true);
    }
    function openEdit(category: Category) {
        setEditing(category);
        setForm({
            name: category.name,
            description: category.description || "",
            icon: category.icon || "",
            iconFile: null,
            status: category.status,
        });
        setFormError("");
        setModalOpen(true);
    }
    async function saveCategory() {
        if (!form.name.trim()) {
            setFormError("Category name is required.");
            return;
        }
        setSaving(true);
        setFormError("");
        try {
            const payload = new FormData();
            payload.append("name", form.name.trim());
            payload.append("description", form.description.trim());
            payload.append("status", form.status);
            if (form.iconFile) payload.append("icon", form.iconFile);
            if (editing && !form.iconFile && form.icon) payload.append("existingIcon", form.icon);
            if (editing) {
                await apiRequest(`/categories/admin/${editing.id}`, { method: "PUT", body: payload });
            } else {
                if (!form.iconFile) throw new Error("Please choose a category icon file.");
                await apiRequest("/categories/admin", { method: "POST", body: payload });
            }
            setModalOpen(false);
            await loadCategories();
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to save category.");
        }
        finally {
            setSaving(false);
        }
    }
    async function deleteCategory(category: Category) {
        if (!window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
            return;
        }
        setBusyId(category.id);
        setActionError("");
        try {
            await apiRequest(`/categories/admin/${category.id}`, {
                method: "DELETE",
            });
            await loadCategories();
        }
        catch (err) {
            setActionError(err instanceof Error ? err.message : "Failed to delete category.");
        }
        finally {
            setBusyId(null);
        }
    }
    return (<div className="mx-auto w-full max-w-[1400px] space-y-5 text-white">

      <AdminPageHero eyebrow="LYNORA SUPER ADMIN" title={<>

            Manage{" "}

            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">

              Categories

            </span>

          </>} description="Create, edit, and manage concert categories available on LYNORA.">

        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#9333EA] to-[#7C3AED] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-950/30 transition hover:brightness-110">

          <PngIcon src={ICONS.add} size={14}/>

          Add Category

        </button>

      </AdminPageHero>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">

        <StatCard label="Total Categories" value={stats.total} icon={ICONS.category} tone="bg-[#39256B]"/>

        <StatCard label="Active Categories" value={stats.active} icon={ICONS.active} tone="bg-[#103D32]" color="text-[#35D5B2]"/>

        <StatCard label="Inactive Categories" value={stats.inactive} icon={ICONS.inactive} tone="bg-[#4A202D]" color="text-[#FF8196]"/>

        <StatCard label="Total Concerts" value={stats.concerts} icon={ICONS.concerts} tone="bg-[#39256B]" color="text-[#C4B5FD]"/>

      </section>

      <section className="w-full min-w-0 overflow-hidden rounded-xl border border-white/[0.07] bg-[#111833] p-3.5 shadow-[0_5px_18px_rgba(0,0,0,.12)] sm:p-5">

        <div className="mb-4">

          <h2 className="text-base font-bold text-white">

            Category Directory

          </h2>

          <p className="mt-1 text-[11px] text-slate-400">

            Manage all music categories available on LYNORA.

          </p>

        </div>

        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_180px]">

          <div className="relative min-w-0">

            <span className="absolute left-3 top-1/2 -translate-y-1/2">

              <PngIcon src={ICONS.search} size={15}/>

            </span>

            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search category by name..." className="h-10 w-full rounded-lg border border-[#343B60] bg-[#0B1122] pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#8B5CF6]"/>

          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-full rounded-lg border border-[#343B60] bg-[#161C38] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]">

            <option value="all">All Status</option>

            <option value="active">Active</option>

            <option value="inactive">Inactive</option>

          </select>

        </div>

        {error && (<div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">

            {error}

          </div>)}

        {actionError && (<div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">

            {actionError}

          </div>)}

        <div className="w-full min-w-0 overflow-x-auto">

          <table className="w-full min-w-[760px] table-fixed border-collapse text-left">

            <colgroup>

              <col style={{ width: "5%" }}/>

              <col style={{ width: "22%" }}/>

              <col style={{ width: "27%" }}/>

              <col style={{ width: "13%" }}/>

              <col style={{ width: "13%" }}/>

              <col style={{ width: "20%" }}/>

            </colgroup>

            <thead>

              <tr className="bg-[#4025A5] text-[10px] font-bold text-white sm:text-[11px]">

                <th className="rounded-l-lg px-2 py-3 text-center">No.</th>

                <th className="px-2 py-3">Category</th>

                <th className="px-2 py-3">Description</th>

                <th className="px-2 py-3 text-center">Total Concerts</th>

                <th className="px-2 py-3 text-center">Status</th>

                <th className="rounded-r-lg px-2 py-3 text-center">Actions</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-white/[0.07]">

              {loading ? (<tr>

                  <td colSpan={6} className="px-3 py-12 text-center text-xs text-slate-400">

                    Loading categories...

                  </td>

                </tr>) : visible.length === 0 ? (<tr>

                  <td colSpan={6} className="px-3 py-12 text-center text-xs text-slate-400">

                    No categories found.

                  </td>

                </tr>) : (visible.map((category, index) => (<tr key={category.id} className="transition hover:bg-white/[0.025]">

                    <td className="px-2 py-3 text-center text-[10px] font-semibold tabular-nums text-slate-400">

                      {(currentPage - 1) * PAGE_SIZE + index + 1}

                    </td>

                    <td className="overflow-hidden px-2 py-3">

                      <div className="flex min-w-0 items-center gap-2.5">

                        <CategoryIcon category={category} size={36}/>

                        <p className="truncate text-[10px] font-semibold text-white sm:text-[11px]">

                          {category.name}

                        </p>

                      </div>

                    </td>

                    <td className="overflow-hidden px-2 py-3">

                      <p className="line-clamp-2 text-[9px] leading-4 text-slate-400 sm:text-[10px]">

                        {category.description || "-"}

                      </p>

                    </td>

                    <td className="px-2 py-3 text-center text-[10px] font-semibold text-slate-300">

                      {Number(category.total_concerts || 0).toLocaleString("en-US")}

                    </td>

                    <td className="px-1 py-3 text-center">

                      <StatusBadge status={category.status}/>

                    </td>

                    <td className="px-1 py-3">

                      <div className="flex items-center justify-center gap-1">

                        <button type="button" onClick={() => setSelected(category)} title="View category" className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-[#171E39] transition hover:border-[#8B5CF6]">

                          <PngIcon src={ICONS.view} size={15}/>

                        </button>

                        <button type="button" onClick={() => openEdit(category)} title="Edit category" className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-[#171E39] transition hover:border-[#8B5CF6]">

                          <PngIcon src={ICONS.edit} size={15}/>

                        </button>

                        <button type="button" disabled={busyId === category.id} onClick={() => deleteCategory(category)} title="Delete category" className="grid h-8 w-8 place-items-center rounded-md border border-rose-500/20 bg-[#351B2A] transition hover:border-rose-500/60 disabled:opacity-40">

                          <PngIcon src={ICONS.delete} size={16}/>

                        </button>

                      </div>

                    </td>

                  </tr>)))}

            </tbody>

          </table>

        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-[10px] text-slate-400">

            Showing{" "}

            {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}

            –{Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}

            {filtered.length} categories

          </p>

          <div className="flex items-center gap-1.5">

            <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-30">

              ‹

            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (<button key={number} type="button" onClick={() => setPage(number)} className={`h-8 min-w-8 rounded-lg px-2 text-[11px] font-semibold ${currentPage === number
                ? "bg-[#7C3AED] text-white"
                : "border border-white/10 bg-[#161C38] text-slate-300 hover:border-[#8B5CF6]"}`}>

                {number}

              </button>))}

            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-30">

              ›

            </button>

          </div>

        </div>

      </section>

      <CategoryModal open={modalOpen} editing={editing} form={form} saving={saving} error={formError} onChange={setForm} onClose={() => setModalOpen(false)} onSubmit={saveCategory}/>

      {selected && (<DetailModal category={selected} onClose={() => setSelected(null)}/>)}

    </div>);
}
