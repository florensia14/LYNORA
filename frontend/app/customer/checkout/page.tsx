"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";
import {
  fetchConcertById,
  createCheckoutOrder,
  createOrderPayment,
  checkPaymentStatus,
} from "@/lib/api";
import type { Concert } from "@/lib/customer";
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}
type TicketCategory = {
  id: number;
  name: string;
  price: number;
  benefit?: string;
  remaining?: number;
};
type CheckoutConcert = Concert & {
  ticket_categories?: TicketCategory[];
};
const MIDTRANS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
const MIDTRANS_IS_PRODUCTION =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value)) + " WIB";
}
function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const eventId = Number(params.get("eventId"));
  const categoryId = Number(params.get("ticketCategoryId"));
  const initialQuantity = Number(params.get("quantity") || 1);
  const [concert, setConcert] = useState<CheckoutConcert | null>(null);
  const [eventEnded, setEventEnded] = useState(false);
  const [purchaseBlockedMessage, setPurchaseBlockedMessage] = useState("");
  const [quantity, setQuantity] = useState(
    Number.isSafeInteger(initialQuantity)
      ? Math.min(10, Math.max(1, initialQuantity))
      : 1,
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [attendees, setAttendees] = useState<
    { full_name: string; email: string; phone: string }[]
  >(() =>
    Array.from({ length: quantity }, () => ({
      full_name: "",
      email: "",
      phone: "",
    })),
  );
  useEffect(() => {
    setAttendees((current) =>
      Array.from({ length: quantity }, (_, index) =>
        current[index] ?? { full_name: "", email: "", phone: "" },
      ),
    );
  }, [quantity]);
  const [agreed, setAgreed] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function loadCheckout() {
      try {
        setLoading(true);
        setError("");
        setEventEnded(false);
        setPurchaseBlockedMessage("");
        if (
          !Number.isSafeInteger(eventId) ||
          eventId <= 0 ||
          !Number.isSafeInteger(categoryId) ||
          categoryId <= 0
        ) {
          throw new Error("Data checkout tidak valid. Silakan pilih tiket kembali.");
        }
        const data = await fetchConcertById(eventId);
        if (!mounted) return;
        const detail = data as CheckoutConcert;
        const status = String(detail.sales_status || detail.status || "").toLowerCase();
        const endDate = detail.end_date ? new Date(detail.end_date) : null;
        const ended =
          ["ended", "completed", "finished", "past"].includes(status) ||
          Boolean(endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() < Date.now());
        if (ended) {
          setConcert(detail);
          setEventEnded(true);
          setPurchaseBlockedMessage("This concert has ended. Please explore other upcoming concerts.");
          return;
        }
        const salesStart = detail.sales_start_at ? new Date(detail.sales_start_at) : null;
        const salesEnd = detail.sales_end_at ? new Date(detail.sales_end_at) : null;
        const now = Date.now();
        if (status === "coming_soon" || (salesStart && !Number.isNaN(salesStart.getTime()) && now < salesStart.getTime())) {
          const opening = salesStart && !Number.isNaN(salesStart.getTime())
            ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(salesStart)
            : null;
          setConcert(detail);
          setPurchaseBlockedMessage(opening ? `Ticket sales will open on ${opening} WIB.` : "Ticket sales have not started yet. Please check back later.");
          return;
        }
        if (status === "sold_out") {
          setConcert(detail);
          setPurchaseBlockedMessage("All tickets are sold out. Please explore other upcoming concerts.");
          return;
        }
        if (status !== "on_sale" || (salesEnd && !Number.isNaN(salesEnd.getTime()) && now > salesEnd.getTime())) {
          setConcert(detail);
          setPurchaseBlockedMessage("Ticket sales are currently closed. Please explore other upcoming concerts.");
          return;
        }
        const category = detail.ticket_categories?.find(
          (item) => Number(item.id) === categoryId,
        );
        if (!category) {
          throw new Error(
            "Kategori tiket tidak ditemukan. Silakan pilih kategori tiket kembali.",
          );
        }
        if (Number(category.remaining ?? 0) < 1) {
          setConcert(detail);
          setPurchaseBlockedMessage("This ticket category is sold out. Please choose another available category.");
          return;
        }
        setConcert(detail);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data checkout.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCheckout();
    return () => {
      mounted = false;
    };
  }, [eventId, categoryId]);
  const selectedTicket = useMemo(() => {
    return concert?.ticket_categories?.find(
      (item) => Number(item.id) === categoryId,
    );
  }, [concert, categoryId]);
  const subtotal = Number(selectedTicket?.price || 0) * quantity;
  async function handleContinuePayment() {
    if (!concert || !selectedTicket || processing) return;
    if (purchaseBlockedMessage || eventEnded || concert.sales_status !== "on_sale") {
      setError(purchaseBlockedMessage || "Ticket sales are not available for this concert.");
      return;
    }
    if (!agreed) {
      setError("Silakan setujui syarat dan ketentuan terlebih dahulu.");
      return;
    }
    if (attendees.length !== quantity) {
      setError("Jumlah data attendee tidak sesuai dengan jumlah tiket.");
      return;
    }
    for (let index = 0; index < attendees.length; index += 1) {
      const attendee = attendees[index];
      if (!attendee.full_name.trim()) {
        setError(`Nama lengkap attendee ${index + 1} wajib diisi.`);
        return;
      }
      if (
        attendee.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email.trim())
      ) {
        setError(`Format email attendee ${index + 1} tidak valid.`);
        return;
      }
    }
    if (!MIDTRANS_CLIENT_KEY) {
      setError("Konfigurasi Midtrans Client Key belum tersedia.");
      return;
    }
    try {
      setProcessing(true);
      setError("");
      // 1. Buat order pada backend.
        const orderResult = await createCheckoutOrder([
            {
                ticket_category_id: categoryId,
                quantity,
                attendees: attendees.map((attendee) => ({
                  full_name: attendee.full_name.trim(),
                  email: attendee.email.trim() || null,
                  phone: attendee.phone.trim() || null,
                })),
            },
        ]);
setOrderId(orderResult.order.id);
      // 2. Minta Snap token untuk order tersebut.
      const paymentResult = await createOrderPayment(
        orderResult.order.id,
      );
      const snapToken = paymentResult.payment?.snap_token;
      if (!snapToken) {
        throw new Error("Token pembayaran Midtrans tidak diterima.");
      }
      // 3. Buka pembayaran Midtrans Snap.
      if (!window.snap) {
        const script = document.createElement("script");
        script.src = MIDTRANS_IS_PRODUCTION
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js";
        script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Gagal memuat halaman pembayaran Midtrans."));
          document.body.appendChild(script);
        });
      }
      if (!window.snap) {
        throw new Error("Midtrans Snap belum siap.");
      }
      window.snap.pay(snapToken, {
  onSuccess: () => {
    setProcessing(false);
    setError(
      "Pembayaran diterima Midtrans. Silakan cek status pembayaran sebelum membuka tiket.",
    );
  },
  onPending: () => {
    setProcessing(false);
    setError(
      "Pembayaran masih menunggu konfirmasi. Silakan cek kembali status pembayaran.",
    );
  },
  onError: () => {
    setProcessing(false);
    setError(
      "Pembayaran belum berhasil. Silakan periksa status pesanan kamu.",
    );
  },
  onClose: () => {
    setProcessing(false);
  },
});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses checkout.",
      );
      setProcessing(false);
    }
  }
  async function handleCheckPaymentStatus() {
    if (!orderId || checkingStatus) return;
    try {
      setCheckingStatus(true);
      setError("");
      const result = await checkPaymentStatus(orderId);
      const paymentStatus = String(result.payment_status ?? "").toLowerCase();
      const orderStatus = String(result.order_status ?? "").toLowerCase();
      if (
        ["success", "paid", "settlement"].includes(paymentStatus) ||
        ["paid", "completed"].includes(orderStatus)
      ) {
        router.push("/customer/tickets");
        return;
      }
      if (["expired", "failed", "cancelled", "refunded"].includes(paymentStatus)) {
        setError(`Status pembayaran: ${paymentStatus}. Silakan periksa pesanan kamu.`);
        return;
      }
      setError(
        `Pembayaran belum dikonfirmasi. Status saat ini: ${paymentStatus || "pending"}. Silakan cek kembali beberapa saat lagi.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memeriksa status pembayaran.",
      );
    } finally {
      setCheckingStatus(false);
    }
  }
  if (loading) {
    return (
      <CustomerShell
        title="Checkout"
        subtitle="Prepare your concert experience"
      >
        <div className="rounded-xl border border-[#676D89] bg-[#161624] p-8 text-center text-sm text-slate-400">
          Loading checkout...
        </div>
      </CustomerShell>
    );
  }
  if (error && !concert) {
    return (
      <CustomerShell
        title="Checkout"
        subtitle="Prepare your concert experience"
      >
        <div className="rounded-xl border border-red-500/30 bg-[#161624] p-6">
          <p className="text-sm text-red-300">{error}</p>
          <Link
            href="/customer/explore"
            className="mt-4 inline-block rounded-lg bg-[#5456DE] px-5 py-2 text-sm font-bold text-white"
          >
            Explore Concerts
          </Link>
        </div>
      </CustomerShell>
    );
  }
  if ((eventEnded || purchaseBlockedMessage) && concert) {
    return (
      <CustomerShell title="Checkout" subtitle="Ticket sales are not available for this concert.">
        <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-5">
          <div className="rounded-2xl border border-[#8B5CF6]/35 bg-[#17152B] p-6 text-center sm:p-9">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#8B5CF6]/15 text-2xl text-[#B9A7FF]">♪</div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#B9A7FF]">Ticket Sales Unavailable</p>
            <h1 className="mt-2 text-xl font-black text-white">{eventEnded ? "This concert has ended." : "You cannot purchase tickets yet."}</h1>
            <p className="mt-2 text-sm text-slate-300">{purchaseBlockedMessage || "Please explore other upcoming concerts."}</p>
            <Link href="/customer/explore" className="mt-5 inline-flex rounded-lg bg-[#5456DE] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#6668E8]">
              Explore Upcoming Concerts
            </Link>
          </div>
        </main>
      </CustomerShell>
    );
  }
  if (!concert || !selectedTicket) return null;
  return (
    <CustomerShell
      title="Checkout"
      subtitle="Complete your order and enjoy the concert."
    >
      <main className="mx-auto w-full min-w-0 max-w-5xl space-y-5">
        <Link
          href={`/events/${concert.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
        >
          <span className="text-lg">←</span>
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            Checkout
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Complete your order and get ready for an unforgettable experience.
          </p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-[#676D89] bg-[#161624] p-3">
          {[
            "1  Order Details",
            "2  Payment",
            "3  E-Ticket",
          ].map((step, index) => (
            <div
              key={step}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-[10px] font-bold sm:text-xs ${
                index === 0
                  ? "bg-gradient-to-r from-[#6255DF] to-[#8B5CF6] text-white"
                  : "bg-[#20203A] text-slate-400"
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <section className="flex flex-col gap-4 rounded-xl border border-[#676D89] bg-[#161624] p-3 sm:flex-row sm:items-center">
          <img
            src={concert.poster_url || "/images/hero/home.jpg"}
            alt={concert.name}
            className="h-32 w-full rounded-lg object-cover sm:h-24 sm:w-40"
            onError={(event) => {
              event.currentTarget.src = "/images/hero/home.jpg";
            }}
          />
          <div className="min-w-0 flex-1">
            <span className="rounded bg-[#2F1E2A] px-2 py-1 text-[9px] font-bold uppercase text-[#FF6B81]">
              Live event
            </span>
            <h2 className="mt-2 text-sm font-black text-white sm:text-base">
              {concert.name}
            </h2>
            <p className="mt-2 text-[11px] text-slate-400">
              {formatDate(concert.start_date)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {concert.venue_name || "Venue to be announced"}
              {concert.venue_address
                ? ` · ${concert.venue_address}`
                : ""}
            </p>
          </div>
        </section>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <section className="rounded-xl border border-[#676D89] bg-[#161624] p-4">
              <h2 className="mb-4 border-l-4 border-[#22D3EE] pl-3 text-sm font-black text-white">
                Ticket Selection
              </h2>
              <div className="rounded-lg border border-[#676D89] bg-[#20203A] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white">
                      {selectedTicket.name}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {selectedTicket.benefit ||
                        "Enjoy the live concert experience."}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-[#B9A7FF]">
                    {money(Number(selectedTicket.price))}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Quantity</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Maximum 10 tickets per order
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-[#676D89] bg-[#161624] p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.max(1, value - 1))
                      }
                      className="h-8 w-8 rounded text-white hover:bg-white/10"
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center text-xs font-black text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.min(10, value + 1))
                      }
                      className="h-8 w-8 rounded text-white hover:bg-white/10">
                      +
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-right text-[10px] text-[#22D3EE]">
                  {selectedTicket.remaining ?? "—"} tickets remaining
                </p>
              </div>
            </section>
            <section className="rounded-xl border border-[#676D89] bg-[#161624] p-4">
              <h2 className="mb-4 border-l-4 border-[#22D3EE] pl-3 text-sm font-black text-white">
                Attendee Information
              </h2>
              <div className="space-y-4">
                {attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-lg border border-[#676D89] bg-[#20203A]/50 p-3"
                  >
                    <h3 className="text-xs font-black text-[#22D3EE]">
                      Attendee {index + 1}
                    </h3>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-300">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={attendee.full_name}
                        onChange={(e) =>
                          setAttendees((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, full_name: e.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Enter attendee full name"
                        className="w-full rounded-lg border border-[#676D89] bg-[#20203A] px-3 py-2.5 text-xs text-white outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-300">
                        Email Address <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={attendee.email}
                        onChange={(e) =>
                          setAttendees((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, email: e.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Enter attendee email address"
                        className="w-full rounded-lg border border-[#676D89] bg-[#20203A] px-3 py-2.5 text-xs text-white outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-300">
                        Phone Number <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={attendee.phone}
                        onChange={(e) =>
                          setAttendees((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, phone: e.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="+62"
                        className="w-full rounded-lg border border-[#676D89] bg-[#20203A] px-3 py-2.5 text-xs text-white outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] leading-relaxed text-amber-300/80">
                  Enter the details of each ticket holder. If an email is left
                  blank, the e-ticket will use the email registered on the
                  purchaser's LYNORA account.
                </p>
              </div>
            </section>
            <section className="rounded-xl border border-[#676D89] bg-[#161624] p-4">
              <h2 className="mb-3 border-l-4 border-[#22D3EE] pl-3 text-sm font-black text-white">
                Voucher / Promo Code
              </h2>
              <div className="flex gap-2">
                <input
                  disabled
                  placeholder="Voucher feature coming soon"
                  className="min-w-0 flex-1 rounded-lg border border-[#676D89] bg-[#20203A] px-3 py-2.5 text-xs text-slate-400"
                />
                <button type="button" disabled className="rounded-lg bg-[#5456DE]/50 px-4 text-xs font-bold text-white/60" >
                  Apply
                </button>
              </div>
            </section>
          </div>
          <aside className="h-fit rounded-xl border border-[#676D89] bg-[#161624] p-4 lg:sticky lg:top-5">
            <h2 className="mb-4 border-l-4 border-[#22D3EE] pl-3 text-sm font-black text-white">
              Order Summary
            </h2>
            <div className="space-y-3 text-[11px]">
              <div className="flex justify-between gap-3 text-slate-300">
                <span>
                  {selectedTicket.name} × {quantity}
                </span>
                <span className="shrink-0">{money(subtotal)}</span>
              </div>
              <div className="border-t border-[#676D89] pt-3">
                <div className="flex justify-between text-sm font-black text-white">
                  <span>Total Payment</span>
                  <span className="text-[#B9A7FF]">
                    {money(subtotal)}
                  </span>
                </div>
              </div>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-slate-400">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-[#8B5CF6]"
              />
              <span>
                I have read and agree to the{" "}
                <Link href={`/events/${concert.id}`} className="text-[#B9A7FF] underline">Terms & Conditions</Link>{" "}
                and LYNORA policies.
              </span>
            </label>
            {error && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleContinuePayment}
              disabled={processing || checkingStatus || Boolean(purchaseBlockedMessage) || eventEnded || concert.sales_status !== "on_sale"}
              className="mt-5 w-full rounded-lg bg-gradient-to-r from-[#6255DF] to-[#8B5CF6] px-4 py-3 text-xs font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? "Processing..." : "Continue to Payment →"}
            </button>
            {orderId !== null && (
              <button
                type="button"
                onClick={handleCheckPaymentStatus}
                disabled={processing || checkingStatus}
                className="mt-3 w-full rounded-lg border border-[#22D3EE]/50 bg-[#22D3EE]/10 px-4 py-3 text-xs font-black text-[#22D3EE] transition hover:bg-[#22D3EE]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingStatus ? "Checking Payment..." : "Check Payment Status"}
              </button>
            )}
            <p className="mt-3 text-center text-[10px] text-slate-500">
              Secure payment powered by Midtrans.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <span>🔒</span>
              Secure payment
              <span className="font-black text-cyan-400">midtrans</span>
            </div>
          </aside>
        </div>
      </main>
    </CustomerShell>
  );
}
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <CustomerShell
          title="Checkout"
          subtitle="Prepare your concert experience"
        >
          <div className="rounded-xl border border-[#676D89] bg-[#161624] p-8 text-center text-sm text-slate-400">
            Loading checkout...
          </div>
        </CustomerShell>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
