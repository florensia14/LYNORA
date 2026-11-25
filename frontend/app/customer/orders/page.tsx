
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import CustomerShell from "@/components/layout/CustomerShell";

import {
  fetchMyOrders,
  type ApiMyOrder,
} from "@/lib/api";

import { formatCurrency, imageUrl } from "@/lib/customer";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Order = ApiMyOrder;

type StatusKey = "paid" | "pending" | "cancelled" | "refunded";
type Filter = "all" | StatusKey;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
  { key: "pending", label: "Pending Payment" },
  { key: "refunded", label: "Refunded" },
];

const STATUS_STYLES: Record<
  StatusKey,
  { badge: string; label: string }
> = {
  paid: {
    badge: "bg-[#123A43] text-[#42D9E8] border-[#246C7C]/50",
    label: "Payment Successful",
  },
  pending: {
    badge: "bg-[#49351C] text-[#F5C56C] border-[#80602A]/50",
    label: "Pending Payment",
  },
  cancelled: {
    badge: "bg-[#40212E] text-[#F47D9A] border-[#794053]/50",
    label: "Cancelled",
  },
  refunded: {
    badge: "bg-[#302747] text-[#BBA6FF] border-[#66518D]/50",
    label: "Refunded",
  },
};

const FALLBACK_POSTER = "/images/hero/home.jpg";

function statusKey(status: string): StatusKey {
  const normalized = String(status).toLowerCase();

  if (normalized === "paid") return "paid";
  if (normalized === "pending") return "pending";
  if (normalized === "refunded") return "refunded";

  return "cancelled";
}

function formatOrderDate(date: string) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

/* ------------------------------------------------------------------ */
/* Icon                                                                */
/* ------------------------------------------------------------------ */

const ICONS = {
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4" />
    </>
  ),

  check: <path d="m5 12 4 4L19 6" />,

  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),

  dollar: (
    <path d="M12 2v20M17 5H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
  ),

  ticket: (
    <>
      <path d="M3 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h18v-4a2 2 0 0 1 0-4V5H3z" />
      <path d="M13 5v2m0 3v2m0 3v2" />
    </>
  ),

  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),

  close: <path d="m18 6-12 12M6 6l12 12" />,

  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
} satisfies Record<string, ReactNode>;

type IconName = keyof typeof ICONS;

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const key = statusKey(status);
  const style = STATUS_STYLES[key];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[9px] font-bold ${style.badge}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[9px] text-[#AAB0C5]">{label}</p>

      <div className="mt-1 text-[10px] font-semibold text-white">
        {children}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: IconName;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-[#908FA0]/20 bg-[#171B26] p-3 transition hover:border-[#8B5CF6]/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-[#AAB0C5] sm:text-xs">
          {title}
        </p>

        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#8B5CF6]/15 text-[#A78BFA]">
          <Icon name={icon} />
        </span>
      </div>

      <h3 className="mt-2 text-lg font-extrabold text-white sm:text-xl">
        {value}
      </h3>

      <p className="mt-1 text-[9px] text-[#AAB0C5]">
        {description}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order details                                                       */
/* ------------------------------------------------------------------ */

function OrderDetails({ order }: { order: Order }) {
  return (
    <div className="mt-3 rounded-lg border border-[#908FA0]/20 bg-[#0C1122] p-3">
      <h4 className="mb-3 text-xs font-bold text-white">
        Order Information
      </h4>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Order Number">
          <span className="break-all">{order.id}</span>
        </Field>

        <Field label="Purchase Date">
          {formatOrderDate(order.date)}
        </Field>

        <Field label="Payment Method">
          {order.method || "Not available"}
        </Field>

        <Field label="Ticket Quantity">
          {order.quantity} Tickets
        </Field>

        <Field label="Total Payment">
          <span className="font-bold text-[#A78BFA]">
            {formatCurrency(Number(order.total))}
          </span>
        </Field>

        <Field label="Order Status">
          <StatusBadge status={order.status} />
        </Field>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order card                                                          */
/* ------------------------------------------------------------------ */

function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = statusKey(order.status);

  // Convert backend poster path into a usable image URL.
  const posterSrc = order.poster_url
    ? imageUrl(order.poster_url)
    : FALLBACK_POSTER;

  return (
    <article className="overflow-hidden rounded-lg border border-[#908FA0]/30 bg-[#171B26] transition hover:border-[#8B5CF6]/50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#908FA0]/15 px-3 py-2.5 sm:px-4">
        <Field label="Order No.">
          <span className="font-bold">{order.id}</span>
        </Field>

        <Field label="Purchase Date">
          {formatOrderDate(order.date)}
        </Field>

        <StatusBadge status={order.status} />
      </div>

      {/* Concert + price */}
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            src={posterSrc}
            alt={order.event_name || "Concert poster"}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_POSTER;
            }}
            className="h-[65px] w-[65px] shrink-0 rounded-md border border-white/10 object-cover sm:h-[76px] sm:w-[76px]"
          />

          <div className="min-w-0">
            <h3 className="line-clamp-2 text-xs font-extrabold leading-relaxed text-white sm:text-sm">
              {order.event_name}
            </h3>

            <p className="mt-1 text-[9px] text-[#AAB0C5]">
              {order.quantity} Tickets · LYNORA Passport
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2 py-0.5 text-[8px] font-semibold text-[#B9A4FF]">
                E-Ticket
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-semibold text-[#AAB0C5]">
                {order.method || "Not available"}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 sm:min-w-[140px] sm:text-right">
          <p className="text-[9px] text-[#AAB0C5]">
            Total Payment
          </p>

          <p className="mt-1 text-base font-extrabold text-white">
            {formatCurrency(Number(order.total))}
          </p>

          <p className="mt-0.5 text-[9px] text-[#AAB0C5]">
            {order.quantity} tickets · incl. tax
          </p>
        </div>
      </div>

      {/* Payment bar + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#908FA0]/20 bg-[#0C1122] px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2 text-[9px]">
          <span className="font-bold text-white">
            {order.method || "Not available"}
          </span>

          <span className="text-[#908FA0]">·</span>

          <span className="text-[#AAB0C5]">
            Order: {order.id}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {status === "paid" && (
            <Link
              href="/customer/tickets"
              className="rounded-md bg-[#8B5CF6] px-3 py-1.5 text-[9px] font-bold text-white transition hover:bg-[#7543E8]"
            >
              Open Ticket
            </Link>
          )}

          {status === "pending" && (
            <span className="rounded-md border border-[#F5C56C]/30 bg-[#F5C56C]/10 px-3 py-1.5 text-[9px] font-bold text-[#F5C56C]">
              Awaiting Payment
            </span>
          )}

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-[9px] font-semibold transition ${
              expanded
                ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#C4B5FD]"
                : "border-[#908FA0]/40 text-[#AAB0C5] hover:border-[#8B5CF6] hover:text-white"
            }`}
          >
            <Icon
              name={expanded ? "close" : "eye"}
              className="h-3 w-3"
            />

            {expanded ? "Close Details" : "View Details"}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 sm:px-4">
          <OrderDetails order={order} />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#908FA0]/20 bg-[#171B26] px-5 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B5CF6]/15 text-[#A78BFA]">
        <Icon name="clipboard" className="h-8 w-8" />
      </div>

      <h3 className="mt-4 text-base font-extrabold text-white">
        No Orders Found
      </h3>

      <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#AAB0C5]">
        You don&apos;t have any orders in this category yet. Explore
        concerts and get your tickets!
      </p>

      <Link
        href="/customer/explore"
        className="mt-5 rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#7543E8]"
      >
        Explore Concerts
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading state                                                       */
/* ------------------------------------------------------------------ */

function LoadingOrders() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#908FA0]/20 bg-[#171B26] px-5 py-14 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6]/20 border-t-[#8B5CF6]" />

      <p className="mt-4 text-xs font-semibold text-white">
        Loading your orders...
      </p>

      <p className="mt-1 text-[10px] text-[#AAB0C5]">
        Please wait a moment.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error state                                                         */
/* ------------------------------------------------------------------ */

function ErrorOrders({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-[#171B26] px-5 py-10 text-center">
      <p className="text-sm font-bold text-red-400">
        Unable to Load Orders
      </p>

      <p className="mt-2 text-xs text-[#AAB0C5]">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-[#8B5CF6] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#7543E8]"
      >
        Try Again
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MyOrdersPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  /* Fetch orders from API */
  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchMyOrders();

        if (isMounted) {
          setMyOrders(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load your orders."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  /* Statistics */
  const stats = useMemo(() => {
    const paidOrders = myOrders.filter(
      (order) => statusKey(order.status) === "paid"
    );

    return {
      total: myOrders.length,
      paid: paidOrders.length,
      pending: myOrders.filter(
        (order) => statusKey(order.status) === "pending"
      ).length,
      spent: paidOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      ),
    };
  }, [myOrders]);

  /* Available filters */
  const availableFilters = useMemo(
    () =>
      FILTERS.filter(
        (item) =>
          item.key === "all" ||
          myOrders.some(
            (order) => statusKey(order.status) === item.key
          )
      ),
    [myOrders]
  );

  /* Filtered orders */
  const orders = useMemo(
    () =>
      filter === "all"
        ? myOrders
        : myOrders.filter(
            (order) => statusKey(order.status) === filter
          ),
    [myOrders, filter]
  );

  /* Change filter */
  const changeFilter = (next: Filter) => {
    setFilter(next);
    setExpandedId(null);
  };

  /* Retry fetching */
  const handleRetry = () => {
    setRetryCount((current) => current + 1);
  };

  return (
    <CustomerShell
      title="My Orders"
      subtitle="Your ticket purchase history on LYNORA"
    >
      <main className="w-full space-y-5 pb-10">
        {/* Heading */}
        <section>
          <p className="w-fit bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] bg-clip-text text-[10px] font-extrabold uppercase tracking-wider text-transparent">
            LYNORA PASSPORT
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              MY ORDERS
            </h1>

            <span className="rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-3 py-1.5 text-[10px] font-bold text-[#B9A4FF]">
              {stats.total} Total Orders
            </span>
          </div>

          <p className="mt-1 text-[11px] text-[#AAB0C5]">
            Manage your concert purchases and payment history.
          </p>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={stats.total}
            icon="clipboard"
            description="All your purchases"
          />

          <StatCard
            title="Successful Payments"
            value={stats.paid}
            icon="check"
            description="Successfully paid orders"
          />

          <StatCard
            title="Pending Payment"
            value={stats.pending}
            icon="clock"
            description="Waiting for payment"
          />

          <StatCard
            title="Total Spent"
            value={formatCurrency(stats.spent)}
            icon="dollar"
            description="Total successful payments"
          />
        </section>

        {/* Order history */}
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-extrabold text-white">
                Order History
              </h2>

              <p className="mt-1 text-[10px] text-[#AAB0C5]">
                {orders.length} orders displayed
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {availableFilters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => changeFilter(item.key)}
                  className={`rounded-full border px-3 py-1.5 text-[9px] font-bold transition sm:text-[10px] ${
                    filter === item.key
                      ? "border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-lg shadow-purple-900/20"
                      : "border-[#908FA0]/30 bg-[#171B26] text-[#AAB0C5] hover:border-[#8B5CF6] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <LoadingOrders />
          ) : error ? (
            <ErrorOrders
              message={error}
              onRetry={handleRetry}
            />
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => {
                const id = String(order.order_id);

                return (
                  <OrderCard
                    key={id}
                    order={order}
                    expanded={expandedId === id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === id ? null : id
                      )
                    }
                  />
                );
              })}
            </div>
          ) : (
            <EmptyOrders />
          )}
        </section>

        {/* Footer banner */}
        <section className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#908FA0]/20 bg-[#171B26] p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/15 text-[#A78BFA]">
              <Icon name="ticket" className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-xs font-bold text-white">
                Ready for your next concert?
              </h3>

              <p className="mt-1 text-[10px] text-[#AAB0C5]">
                Discover more events and unforgettable experiences.
              </p>
            </div>
          </div>

          <Link
            href="/customer/explore"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#7543E8]"
          >
            EXPLORE CONCERTS

            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </section>
      </main>
    </CustomerShell>
  );
}
