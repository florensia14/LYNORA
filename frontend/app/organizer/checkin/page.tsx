"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OrganizerPageHero from "@/components/layout/OrganizerPageHero";

type Concert = { id: number; name: string; poster_url?: string | null; start_date?: string; venue_name?: string; display_status?: string };
type CheckInRow = { ticket_code: string; attendee_name: string; category_name: string; checked_at: string };
type CheckInStats = { total_tickets: number; checked_in: number; remaining: number; progress: number; recent: CheckInRow[] };
type ScanResult = { success: boolean; message: string; ticket?: { ticket_code: string; attendee_name: string; event_name: string; category_name: string; checked_at: string } };

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const number = (value: number) => new Intl.NumberFormat("id-ID").format(value || 0);
const dateTime = (value: string) => new Date(value).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function OrganizerCheckInPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [eventId, setEventId] = useState("");
  const [stats, setStats] = useState<CheckInStats>({ total_tickets: 0, checked_in: 0, remaining: 0, progress: 0, recent: [] });
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const scannerStartingRef = useRef(false);

  const loadStats = useCallback(async (id: string) => {
    if (!id) return;
    const response = await fetch(`${API}/tickets/organizer/check-ins?eventId=${encodeURIComponent(id)}`, { headers: authHeaders(), cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || "Failed to load check-in data.");
    setStats(payload.data);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`${API}/events/organizer/concerts`, { headers: authHeaders(), cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || "Failed to load organizer concerts.");
        const rows: Concert[] = payload.concerts || [];
        if (!active) return;
        setConcerts(rows);
        if (rows.length) setEventId(String(rows[0].id));
      } catch (error) {
        if (active) setCameraError(error instanceof Error ? error.message : "Failed to load concerts.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!eventId) return;
    loadStats(eventId).catch((error) => setCameraError(error instanceof Error ? error.message : "Failed to load statistics."));
  }, [eventId, loadStats]);

  const stopCamera = useCallback(() => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCameraOpen(false);
    setScanning(false);
    if (scanner) {
      void scanner.stop().catch(() => undefined).finally(() => {
        try { scanner.clear(); } catch { /* scanner already cleared */ }
      });
    }
  }, []);



  useEffect(() => () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) void scanner.stop().catch(() => undefined).finally(() => {
      try { scanner.clear(); } catch { /* ignore */ }
    });
  }, []);

    const validateTicket = useCallback(async (code: string) => {
    if (!eventId || !code.trim() || busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch(`${API}/tickets/organizer/check-in`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ eventId: Number(eventId), ticketCode: code.trim() }),
      });
      const payload: ScanResult = await response.json().catch(() => ({ success: false, message: "Respons server tidak valid." }));
      setResult(payload);
      if (response.ok && payload.success) {
        setManualCode("");
        stopCamera();
        await loadStats(eventId);
      }
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "Failed to validate ticket." });
    } finally { busyRef.current = false; setSubmitting(false); }
  }, [eventId, loadStats, stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !eventId) return;
    let cancelled = false;
    const startScanner = async () => {
      if (scannerStartingRef.current) return;
      scannerStartingRef.current = true;
      let scanner: import("html5-qrcode").Html5Qrcode | null = null;
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode("lynora-qr-reader", {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decodedText) => { if (!busyRef.current) void validateTicket(decodedText); },
          () => { /* no QR in this frame */ },
        );
        if (!cancelled) { setScanning(true); setCameraError(""); }
        else { await scanner.stop().catch(() => undefined); scanner.clear(); }
      } catch (error) {
        if (!cancelled) {
          setCameraError(error instanceof Error ? error.message : "Tidak dapat membuka kamera. Periksa izin kamera browser.");
          setCameraOpen(false);
          setScanning(false);
        }
        if (scanner) {
          await scanner.stop().catch(() => undefined);
          try { scanner.clear(); } catch { /* ignore */ }
          if (scannerRef.current === scanner) scannerRef.current = null;
        }
      } finally { scannerStartingRef.current = false; }
    };
    void startScanner();
    return () => {
      cancelled = true;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) void current.stop().catch(() => undefined).finally(() => {
        try { current.clear(); } catch { /* ignore */ }
      });
      scannerStartingRef.current = false;
    };
  }, [cameraOpen, eventId, validateTicket]);

  const startCamera = () => {
    setCameraError("");
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser tidak mendukung akses kamera. Buka melalui HTTPS atau localhost, lalu input kode tiket secara manual.");
      return;
    }
    if (!eventId) { setCameraError("Select a concert before starting the scanner."); return; }
    setCameraOpen(true);
    setScanning(false);
  };

    const selectedConcert = concerts.find((concert) => String(concert.id) === eventId);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 text-white">
      <OrganizerPageHero eyebrow="LYNORA EVENT MANAGEMENT" title="Ticket"
        highlight="Check-In" description="Validate attendee entry for your concert. Scan the QR code on each customer’s e-ticket." />

      <section className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#151C36] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Selected concert</p><p className="mt-1 truncate text-base font-bold">{selectedConcert?.name || (loading ? "Loading concerts..." : "No concert available")}</p><p className="mt-1 text-xs text-slate-400">{selectedConcert?.venue_name || "Select a concert to manage check-ins"}</p></div>
        <select value={eventId} onChange={(event) => { stopCamera(); setResult(null); setEventId(event.target.value); }} disabled={!concerts.length} className="w-full rounded-lg border border-white/10 bg-[#0F1730] px-3 py-2.5 text-sm text-white outline-none sm:max-w-[300px]">
          {concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.name}</option>)}
        </select>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[{ label: "Total Tickets", value: stats.total_tickets, icon: "/icons/ticket (1).png" }, { label: "Check-Ins", value: stats.checked_in, icon: "/icons/check (1).png" }, { label: "Remaining", value: stats.remaining, icon: "/icons/clock.png" }].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/[0.07] bg-[#151C36] px-4 py-3 shadow-[0_8px_22px_rgba(0,0,0,0.10)] sm:px-5 sm:py-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-300">{item.label}</span><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#202A4F] p-2"><img src={item.icon} alt="" aria-hidden="true" className="h-full w-full object-contain" /></span></div><p className="mt-2 truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">{number(item.value)}</p></div>
        ))}
        <div className="rounded-xl border border-white/[0.07] bg-[#151C36] px-4 py-3 shadow-[0_8px_22px_rgba(0,0,0,0.10)] sm:px-5 sm:py-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-400">Check-In Progress</span><span className="text-xs font-bold text-[#A5B4FC]">{stats.progress}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#202A4F]"><div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] transition-all" style={{ width: `${Math.min(100, stats.progress)}%` }} /></div><p className="mt-2 text-[10px] text-slate-500">{number(stats.checked_in)} of {number(stats.total_tickets)} tickets</p></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
        <div className="rounded-xl border border-white/[0.08] bg-[#111A32] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Scan Ticket</h2><p className="mt-1 text-xs text-slate-400">Open camera and point it at the customer’s QR ticket.</p></div><span className="rounded-full border border-[#514078] bg-[#211B43] px-3 py-1 text-[10px] font-semibold text-[#D6C4FF]">AUTO SCAN</span></div>
          {cameraOpen ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-[#5456DE]/60 bg-black">
              <div id="lynora-qr-reader" className="min-h-[280px] w-full [&_video]:w-full [&_video]:object-cover [&_button]:rounded-md [&_button]:bg-[#6545D5] [&_button]:px-3 [&_button]:py-2 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-white [&_select]:rounded-md [&_select]:bg-[#11182B] [&_select]:p-2 [&_select]:text-white" />
              <div className="flex items-center justify-between bg-[#151C36] px-3 py-2">
                <span className="text-[11px] text-slate-300">{scanning ? "Camera active · QR scanner ready" : "Starting camera..."}</span>
                <button onClick={stopCamera} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">Close Camera</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[#3B4563] bg-[#0B1122] px-4 py-7 text-center"><div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#202A4F] p-5"><img src="/icons/ticket (1).png" alt="" aria-hidden="true" className="h-full w-full object-contain" /></div><p className="mt-4 text-sm font-bold">Ready to scan</p><p className="mt-1 max-w-sm text-[11px] text-slate-400">Camera preview will appear here. Allow camera permission when your browser asks.</p><button type="button" onClick={startCamera} disabled={!eventId || submitting} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6545D5] px-6 py-2.5 text-xs font-bold shadow-lg shadow-purple-900/30 transition hover:brightness-110 disabled:opacity-50"><img src="/icons/ticket (1).png" alt="" aria-hidden="true" className="h-4 w-4 object-contain" />Scan Ticket</button></div>
          )}
          <div className="mt-4 border-t border-white/10 pt-4"><p className="text-xs font-semibold">Manual Check-In</p><form onSubmit={(event) => { event.preventDefault(); void validateTicket(manualCode); }} className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Enter ticket code (LYN-...)" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0B1122] px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#8B5CF6]"/><button disabled={!manualCode.trim() || submitting || !eventId} className="rounded-lg border border-[#5456DE]/40 bg-[#202A4F] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{submitting ? "Validating..." : "Check In"}</button></form></div>
          {cameraError && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">{cameraError}</p>}
          {result && <div className={`mt-3 rounded-xl border p-4 ${result.success ? "border-emerald-400/40 bg-emerald-500/10" : "border-rose-400/40 bg-rose-500/10"}`}><div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-2 ${result.success ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>{result.success ? <img src="/icons/check (1).png" alt="Success" className="h-full w-full object-contain" /> : <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />}</span><div className="min-w-0"><p className={`text-sm font-bold ${result.success ? "text-emerald-200" : "text-rose-200"}`}>{result.success ? "Check-In Successful" : "Check-In Failed"}</p><p className="mt-1 text-xs text-slate-200">{result.message}</p>{result.ticket && <p className="mt-2 text-xs leading-5 text-slate-300">{result.ticket.attendee_name} · {result.ticket.category_name}<br/>{result.ticket.ticket_code} · {result.ticket.event_name}</p>}</div></div></div>}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111A32]"><div className="flex items-center justify-between bg-gradient-to-r from-[#4A28B5] via-[#4930B9] to-[#3726A4] px-4 py-4"><div className="flex items-center gap-2"><img src="/icons/check (1).png" alt="" aria-hidden="true" className="h-5 w-5 object-contain" /><div><h2 className="text-sm font-bold">Recent Check-Ins</h2><p className="text-[10px] text-purple-200">Latest verified attendees</p></div></div><button onClick={() => eventId && loadStats(eventId).catch((error) => setCameraError(error.message))} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-200 hover:text-white"><img src="/icons/time-left.png" alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />Refresh</button></div><div className="grid grid-cols-[1.2fr_1fr_.8fr] border-b border-[#3B4563] px-3 py-3 text-[9px] font-bold uppercase tracking-wide text-slate-400"><span>Attendee / Ticket</span><span>Category</span><span>Check-In Time</span></div><div className="max-h-[420px] overflow-y-auto">{stats.recent.length ? stats.recent.map((row, index) => <div key={`${row.ticket_code}-${index}`} className="grid grid-cols-[1.2fr_1fr_.8fr] items-center gap-2 border-b border-white/[.06] px-3 py-3"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-white">{row.attendee_name}</p><p className="truncate text-[9px] text-slate-500">{row.ticket_code}</p></div><p className="truncate text-[10px] text-slate-300">{row.category_name}</p><p className="text-[9px] text-slate-400">{dateTime(row.checked_at)}</p></div>) : <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center"><img src="/icons/check (1).png" alt="" aria-hidden="true" className="h-8 w-8 object-contain opacity-40" /><p className="mt-3 text-xs font-semibold text-slate-300">No check-ins yet</p><p className="mt-1 text-[10px] text-slate-500">Successful scans will appear here.</p></div>}</div></div>
      </section>
    </div>
  );
}
