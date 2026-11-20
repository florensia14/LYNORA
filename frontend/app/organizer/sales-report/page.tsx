"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

type Concert = { id: number; name: string; poster_url?: string | null; start_date?: string; category_name?: string; venue_name?: string; sold?: number; revenue?: number };
type Order = { id: number; order_code: string; customer_name?: string; event_names?: string; quantity: number; total_amount: number; status: string; created_at: string; payment_method?: string | null };
type Attendee = { ticket_id: number; ticket_status: string; event_id: number; event_name: string; checked_at?: string | null };
type Range = "7d" | "30d" | "90d" | "all";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n || 0));
const number = (n: number) => new Intl.NumberFormat("id-ID").format(Number(n || 0));
const dateLabel = (v: string) => new Date(v).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
const paid = (s: string) => String(s || "").toLowerCase() === "paid";
const auth = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
const dateStart = (range: Range) => {
  if (range === "all") return null;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (range === "7d" ? 6 : range === "30d" ? 29 : 89));
  return d;
};
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function MetricCard({ title, value, icon, foot }: { title: string; value: string; icon: string; foot: string }) {
  return <div className="rounded-xl border border-white/[0.08] bg-[#171F3B] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#35245F]"><img src={icon} alt="" className="h-4 w-4 object-contain" /></span>{title}</div>
    <p className="mt-3 truncate text-xl font-bold text-white sm:text-2xl">{value}</p>
    <p className="mt-1 text-[10px] text-slate-500">{foot}</p>
  </div>;
}

function Trend({ orders, range }: { orders: Order[]; range: Range }) {
  const start = dateStart(range);
  const days = range === "7d" ? 7 : range === "90d" ? 12 : 30;
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setHours(0,0,0,0);
    if (range === "90d") d.setDate(d.getDate() - (days - 1 - i) * 7);
    else d.setDate(d.getDate() - (days - 1 - i));
    return { date: d, label: range === "90d" ? `${d.getDate()}/${d.getMonth()+1}` : dateLabel(d.toISOString()), total: 0 };
  });
  orders.filter(o => paid(o.status) && (!start || new Date(o.created_at) >= start)).forEach(o => {
    const d = new Date(o.created_at); d.setHours(0,0,0,0);
    let idx = buckets.findIndex((b, i) => {
      if (range === "90d") {
        const next = buckets[i + 1]?.date || new Date();
        return d >= b.date && d < new Date(next.getTime() + 86400000);
      }
      return b.date.getTime() === d.getTime();
    });
    if (idx >= 0) buckets[idx].total += Number(o.quantity || 0);
  });
  const max = Math.max(1, ...buckets.map(b => b.total));
  const W=640,H=210,L=34,R=12,T=12,B=28;
  const x=(i:number)=>L+(buckets.length<=1?0:i/(buckets.length-1))*(W-L-R);
  const y=(v:number)=>T+(1-v/max)*(H-T-B);
  const path=buckets.map((b,i)=>`${i?"L":"M"}${x(i)},${y(b.total)}`).join(" ");
  const area=`${path} L${x(buckets.length-1)},${H-B} L${x(0)},${H-B} Z`;
  return <div className="w-full">
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Ticket sales trend">
      <defs><linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A855F7" stopOpacity=".38"/><stop offset="100%" stopColor="#A855F7" stopOpacity="0"/></linearGradient></defs>
      {[0,.25,.5,.75,1].map(t=><g key={t}><line x1={L} x2={W-R} y1={y(max*t)} y2={y(max*t)} stroke="rgba(255,255,255,.08)" strokeDasharray="3 4"/><text x={L-7} y={y(max*t)+3} fill="#71809F" fontSize="9" textAnchor="end">{Math.round(max*t)}</text></g>)}
      <path d={area} fill="url(#sales-area)"/><path d={path} fill="none" stroke="#B58BFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {buckets.map((b,i)=><g key={b.label}><circle cx={x(i)} cy={y(b.total)} r="3.2" fill="#D8C5FF"><title>{b.label}: {b.total} tickets</title></circle>{(i % Math.max(1,Math.ceil(buckets.length/7))===0 || i===buckets.length-1)&&<text x={x(i)} y={H-8} fill="#8190AA" fontSize="9" textAnchor="middle">{b.label}</text>}</g>)}
    </svg>
  </div>;
}

function Donut({ checked, total }: { checked: number; total: number }) {
  const rate = total ? Math.round(checked/total*100) : 0;
  const circumference = 2*Math.PI*39;
  return <div className="flex items-center gap-5">
    <div className="relative h-28 w-28 shrink-0"><svg viewBox="0 0 100 100" className="-rotate-90"><circle cx="50" cy="50" r="39" fill="none" stroke="#293451" strokeWidth="12"/><circle cx="50" cy="50" r="39" fill="none" stroke="#B36BFF" strokeWidth="12" strokeDasharray={`${circumference*rate/100} ${circumference}`} strokeLinecap="round"/></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><b className="text-xl text-white">{rate}%</b><span className="text-[9px] text-slate-400">Attended</span></div></div>
    <div className="space-y-3 text-xs"><div><p className="text-slate-400">Checked-In</p><b className="text-white">{number(checked)}</b></div><div><p className="text-slate-400">Not Checked-In</p><b className="text-white">{number(Math.max(0,total-checked))}</b></div><div><p className="text-slate-400">Total Tickets</p><b className="text-white">{number(total)}</b></div></div>
  </div>;
}

export default function OrganizerSalesReportPage() {
  const [concerts,setConcerts]=useState<Concert[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [attendees,setAttendees]=useState<Attendee[]>([]);
  const [range,setRange]=useState<Range>("30d");
  const [eventId,setEventId]=useState("all");
  const [category,setCategory]=useState("all");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [page,setPage]=useState(1);
  const pageSize=6;

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const [cr,or,ar]=await Promise.all([
        fetch(`${API}/events/organizer/concerts`,{headers:auth(),cache:"no-store"}),
        fetch(`${API}/orders/organizer-orders`,{headers:auth(),cache:"no-store"}),
        fetch(`${API}/tickets/organizer/attendees`,{headers:auth(),cache:"no-store"}),
      ]);
      const [cp,op,ap]=await Promise.all([cr.json(),or.json(),ar.json()]);
      if(!cr.ok) throw new Error(cp?.message||"Failed to load concerts.");
      if(!or.ok) throw new Error(op?.message||"Failed to load transactions.");
      if(!ar.ok) throw new Error(ap?.message||"Failed to load attendance data.");
      setConcerts(Array.isArray(cp.concerts)?cp.concerts:Array.isArray(cp.data)?cp.data:[]);
      setOrders(Array.isArray(op.data)?op.data:[]);
      setAttendees(Array.isArray(ap.data)?ap.data:[]);
    } catch(e) { setError(e instanceof Error?e.message:"Failed to load report."); }
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>setPage(1),[range,eventId,category]);

  const start=dateStart(range);
  const filteredOrders=useMemo(()=>orders.filter(o=>{
    const event=concerts.find(c=>String(c.id)===eventId);
    const dateOk=!start||new Date(o.created_at)>=start;
    const eventOk=eventId==="all"||String(o.event_names||"").toLowerCase().includes(String(event?.name||"").toLowerCase());
    const categoryOk=category==="all"||eventId!=="all"||concerts.some(c=>String(o.event_names||"").toLowerCase().includes(c.name.toLowerCase())&&c.category_name===category);
    return dateOk&&eventOk&&categoryOk;
  }),[orders,concerts,start,eventId,category]);
  const paidOrders=filteredOrders.filter(o=>paid(o.status));
  const tickets=paidOrders.reduce((sum,o)=>sum+Number(o.quantity||0),0);
  const revenue=paidOrders.reduce((sum,o)=>sum+Number(o.total_amount||0),0);
  const avg=paidOrders.length?revenue/paidOrders.length:0;
  const attendance=eventId==="all"?attendees:attendees.filter(a=>String(a.event_id)===eventId);
  const checked=attendance.filter(a=>String(a.ticket_status).toLowerCase()==="used"||!!a.checked_at).length;
  const byConcert=concerts.filter(c=>(eventId==="all"||String(c.id)===eventId)&&(category==="all"||c.category_name===category)).map(c=>{
    const rows=paidOrders.filter(o=>String(o.event_names||"").toLowerCase().includes(c.name.toLowerCase()));
    return {concert:c,orders:rows.length,tickets:rows.reduce((n,o)=>n+Number(o.quantity||0),0),revenue:rows.reduce((n,o)=>n+Number(o.total_amount||0),0)};
  }).sort((a,b)=>b.revenue-a.revenue);
  const totalPages=Math.max(1,Math.ceil(byConcert.length/pageSize));
  const visible=byConcert.slice((page-1)*pageSize,page*pageSize);
  const categories=Array.from(new Set(concerts.map(c=>c.category_name).filter(Boolean))).sort();

  const exportCsv=()=>{
    const rows=[["Concert","Category","Paid Orders","Tickets Sold","Revenue"],...byConcert.map(r=>[r.concert.name,r.concert.category_name||"",r.orders,r.tickets,r.revenue])];
    const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="lynora-sales-report.csv";a.click();URL.revokeObjectURL(url);
  };

  return <main className="min-h-screen bg-[#0B1122] px-4 py-5 text-white sm:px-6 lg:px-7">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-[#8B5CF6]/30 bg-[#17183A] px-5 py-6 sm:px-7">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(circle at 78% 20%, #C304A8 0, transparent 35%), radial-gradient(circle at 20% 100%, #5B21B6 0, transparent 40%)"}}/>
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <button onClick={exportCsv} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6338D5] px-4 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition hover:brightness-110 disabled:opacity-50"><img src="/icons/direct-download.png" alt="" className="h-4 w-4 object-contain"/>Export Data</button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-white/[.07] bg-[#111A32] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Period</span>
          <div className="flex rounded-lg border border-white/10 bg-[#0B1122] p-1">{([{id:"7d",label:"7 Days"},{id:"30d",label:"30 Days"},{id:"90d",label:"90 Days"},{id:"all",label:"All Time"}] as {id:Range;label:string}[]).map(t=><button key={t.id} onClick={()=>setRange(t.id)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${range===t.id?"bg-[#7546D8] text-white":"text-slate-400 hover:text-white"}`}>{t.label}</button>)}</div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={eventId} onChange={e=>setEventId(e.target.value)} className="h-9 min-w-[175px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]"><option value="all">All Concerts</option>{concerts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="h-9 min-w-[145px] rounded-lg border border-white/10 bg-[#0B1122] px-3 text-xs text-slate-200 outline-none focus:border-[#8B5CF6]"><option value="all">All Categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
        </div>
      </section>

      {error&&<div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}<button onClick={load} className="ml-3 font-bold underline">Try again</button></div>}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard title="Tickets Sold" value={loading?"—":number(tickets)} icon="/icons/ticket.png" foot="Paid orders in selected period"/>
        <MetricCard title="Total Revenue" value={loading?"—":money(revenue)} icon="/icons/dollar.png" foot="Total from paid orders"/>
        <MetricCard title="Total Orders" value={loading?"—":number(paidOrders.length)} icon="/icons/orders.png" foot="Successfully paid orders"/>
        <MetricCard title="Average Order Value" value={loading?"—":money(avg)} icon="/icons/atm-card.png" foot="Revenue per paid order"/>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="rounded-xl border border-white/[.07] bg-[#111A32] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-white">Ticket Sales Trend</h2><p className="mt-1 text-[10px] text-slate-500">Jumlah tiket dari transaksi paid</p></div><span className="rounded-full border border-[#8B5CF6]/30 bg-[#2B2050] px-2.5 py-1 text-[9px] font-semibold text-[#C4B5FD]">Tickets Sold</span></div>
          {loading?<div className="h-48 animate-pulse rounded-lg bg-white/[.03]"/>:<Trend orders={filteredOrders} range={range}/>}
        </div>
        <div className="rounded-xl border border-white/[.07] bg-[#111A32] p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white">Attendance Overview</h2><p className="mt-1 text-[10px] text-slate-500">Status check-in untuk tiket terdaftar</p>
          <div className="mt-5 flex min-h-[145px] items-center justify-center">{loading?<div className="h-28 w-28 animate-pulse rounded-full bg-white/[.05]"/>:<Donut checked={checked} total={attendance.length}/>}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/[.07] bg-[#111A32]">
        <div className="flex flex-col justify-between gap-2 border-b border-white/[.07] px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><h2 className="text-sm font-bold text-white">Sales by Concert</h2><p className="mt-1 text-[10px] text-slate-500">Ringkasan transaksi dan pendapatan per konser</p></div><span className="text-[10px] text-slate-500">{number(byConcert.length)} concerts</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#171F3B] text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3 font-semibold">Concert Details</th><th className="px-3 py-3 font-semibold">Date & Venue</th><th className="px-3 py-3 font-semibold">Tickets Sold</th><th className="px-3 py-3 font-semibold">Gross Revenue</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-white/[.06]">
              {loading?<tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-500">Loading sales report...</td></tr>:visible.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-500">No sales data found for these filters.</td></tr>:visible.map(({concert,orders:count,tickets:qty,revenue:rev})=><tr key={concert.id} className="transition hover:bg-white/[.025]">
                <td className="px-4 py-3"><div className="flex min-w-[190px] items-center gap-3"><div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-[#202A4F]">{concert.poster_url?<img src={concert.poster_url} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-base">♫</div>}</div><div className="min-w-0"><p className="max-w-[190px] truncate text-xs font-semibold text-white">{concert.name}</p><p className="mt-1 text-[9px] text-slate-500">{concert.category_name||"Uncategorized"} · {count} orders</p></div></div></td>
                <td className="px-3 py-3"><p className="text-[10px] text-slate-300">{concert.start_date?new Date(concert.start_date).toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"}):"—"}</p><p className="mt-1 max-w-[130px] truncate text-[9px] text-slate-500">{concert.venue_name||"Venue —"}</p></td>
                <td className="px-3 py-3"><span className="text-xs font-semibold text-white">{number(qty)}</span></td><td className="px-3 py-3"><span className="text-xs font-semibold text-white">{money(rev)}</span></td>
                <td className="px-3 py-3"><span className="rounded-full border border-[#26ADA0]/20 bg-[#152B32] px-2 py-1 text-[9px] font-semibold text-[#42D6C5]">{qty>0?"Sales Active":"No Sales"}</span></td>
                <td className="px-3 py-3"><Link href={`/organizer/orders?concert=${concert.id}`} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[9px] font-semibold text-slate-300 transition hover:border-[#8B5CF6]/50 hover:text-white">View Orders <span aria-hidden>↗</span></Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/[.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] text-slate-500">Showing {byConcert.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,byConcert.length)} of {byConcert.length} concerts</p><div className="flex items-center gap-1"><button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-300 disabled:opacity-30">Prev</button>{Array.from({length:totalPages},(_,i)=>i+1).slice(0,5).map(p=><button key={p} onClick={()=>setPage(p)} className={`h-7 min-w-7 rounded-md px-2 text-[10px] font-bold ${page===p?"bg-[#7546D8] text-white":"border border-white/10 text-slate-400 hover:text-white"}`}>{p}</button>)}<button disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-300 disabled:opacity-30">Next</button></div></div>
      </section>
      <p className="text-center text-[9px] text-slate-600">Report values are calculated from organizer orders and attendee records available in your account.</p>
    </div>
  </main>;
}
