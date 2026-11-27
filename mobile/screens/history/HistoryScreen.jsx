import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HeaderActions from '../../components/HeaderActions';
import { fetchMyOrders } from '../../services/ordersService';
import {
  ClipboardList,
  Check,
  Clock3,
  DollarSign,
  Ticket,
  Eye,
  X,
  ArrowRight,
  ChevronRight,
  ShoppingBag,
  RotateCw,
} from 'lucide-react-native';

const C = {
  bg: '#0B1020',
  card: '#171B26',
  panel: '#0C1122',
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  cyan: '#22D3EE',
  white: '#FFFFFF',
  muted: '#AAB0C5',
  border: '#908FA0',
  yellow: '#F5C56C',
  pink: '#F47D9A',
  green: '#42D9E8',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending Payment' },
];

const STATUS = {
  paid: { label: 'Payment Successful', color: C.green, bg: '#123A43', border: '#246C7C' },
  pending: { label: 'Pending Payment', color: C.yellow, bg: '#49351C', border: '#80602A' },
  cancelled: { label: 'Cancelled', color: C.pink, bg: '#40212E', border: '#794053' },
  refunded: { label: 'Refunded', color: '#BBA6FF', bg: '#302747', border: '#66518D' },
};

const statusKey = (value) => {
  const key = String(value || '').toLowerCase();
  return ['paid', 'pending', 'cancelled', 'refunded'].includes(key) ? key : 'cancelled';
};

const formatCurrency = (value) =>
  `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

function formatOrderDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function StatusBadge({ status }) {
  const config = STATUS[statusKey(status)];
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg, borderColor: `${config.border}80` }]}>
      <View style={[styles.statusDot, { backgroundColor: config.color }]} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <Text style={styles.statTitle}>{title}</Text>
        <View style={styles.statIcon}><Icon size={16} color={C.purpleLight} /></View>
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statDescription}>{description}</Text>
    </View>
  );
}

function Field({ label, value, highlight }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailHighlight]}>{String(value ?? '-')}</Text>
    </View>
  );
}

function OrderDetails({ order }) {
  return (
    <View style={styles.detailsPanel}>
      <Text style={styles.detailsTitle}>Order Information</Text>
      <View style={styles.detailsGrid}>
        <Field label="Order Number" value={order.id} />
        <Field label="Purchase Date" value={formatOrderDate(order.date)} />
        <Field label="Payment Method" value={order.method || 'Not available'} />
        <Field label="Ticket Quantity" value={`${order.quantity} Tickets`} />
        <Field label="Total Payment" value={formatCurrency(order.total)} highlight />
        <View style={styles.detailField}>
          <Text style={styles.detailLabel}>Order Status</Text>
          <StatusBadge status={order.status} />
        </View>
      </View>
    </View>
  );
}

function OrderCard({ order, expanded, onToggle, onOpenTicket }) {
  const status = statusKey(order.status);
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.headerField}>
          <Text style={styles.fieldLabel}>Order No.</Text>
          <Text style={styles.orderNumber} numberOfLines={2}>{order.id}</Text>
        </View>
        <View style={[styles.headerField, styles.purchaseField]}>
          <Text style={styles.fieldLabel}>Purchase Date</Text>
          <Text style={styles.purchaseDate}>{formatOrderDate(order.date)}</Text>
        </View>
        <StatusBadge status={status} />
      </View>

      <View style={styles.concertRow}>
        {order.poster_url ? (
          <Image source={{ uri: order.poster_url }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}><Ticket size={23} color={C.purpleLight} /></View>
        )}
        <View style={styles.concertInfo}>
          <Text style={styles.concertName} numberOfLines={2}>{order.event_name}</Text>
          <Text style={styles.ticketQuantity}>{order.quantity} Tickets · LYNORA Passport</Text>
          <View style={styles.pills}>
            <View style={styles.pill}><Text style={styles.pillPurple}>E-Ticket</Text></View>
            <View style={[styles.pill, styles.methodPill]}><Text style={styles.pillMuted} numberOfLines={1}>{order.method || 'Not available'}</Text></View>
          </View>
        </View>
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total Payment</Text>
          <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(order.total)}</Text>
          <Text style={styles.totalCaption}>{order.quantity} tickets · incl. tax</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentMethod}>{order.method || 'Not available'}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.orderCode}>Order: {order.id}</Text>
        </View>
        <View style={styles.actions}>
          {status === 'paid' ? (
            <TouchableOpacity style={styles.openTicketButton} onPress={onOpenTicket}>
              <Text style={styles.openTicketText}>Open Ticket</Text>
            </TouchableOpacity>
          ) : status === 'pending' ? (
            <View style={styles.awaitingBadge}><Text style={styles.awaitingText}>Awaiting Payment</Text></View>
          ) : null}
          <TouchableOpacity onPress={onToggle} style={[styles.detailsButton, expanded && styles.detailsButtonActive]}>
            {expanded ? <X size={12} color={C.purpleLight} /> : <Eye size={12} color={C.muted} />}
            <Text style={[styles.detailsButtonText, expanded && styles.detailsButtonTextActive]}>{expanded ? 'Close Details' : 'View Details'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {expanded ? <OrderDetails order={order} /> : null}
    </View>
  );
}

function EmptyOrders({ onExplore }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><ClipboardList size={30} color={C.purpleLight} /></View>
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptyDescription}>You don't have any orders in this category yet. Explore concerts and get your tickets!</Text>
      <TouchableOpacity style={styles.exploreButton} onPress={onExplore}>
        <Text style={styles.exploreButtonText}>Explore Concerts</Text>
        <ArrowRight size={14} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen({ navigation }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await fetchMyOrders();
      setOrders(data);
    } catch (err) {
      setError(err?.message || 'Failed to load your orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadOrders();
  }, [loadOrders]));

  const stats = useMemo(() => {
    const paid = orders.filter((item) => statusKey(item.status) === 'paid');
    return {
      total: orders.length,
      paid: paid.length,
      pending: orders.filter((item) => statusKey(item.status) === 'pending').length,
      spent: paid.reduce((sum, item) => sum + Number(item.total || 0), 0),
    };
  }, [orders]);

  const filteredOrders = useMemo(() => filter === 'all'
    ? orders
    : orders.filter((order) => statusKey(order.status) === filter), [orders, filter]);

  const openTickets = (order) => navigation.navigate('MyTickets', {
    orderId: order.order_id,
    orderCode: order.id,
  });
  const explore = () => navigation.navigate('Explore');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} tintColor={C.purple} colors={[C.purple]} />}
      >
        <View style={styles.topHeader}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Halo, flowlyy 👋</Text>
            <Text style={styles.greetingSubtitle}>Your ticket purchase history on LYNORA</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        <View style={styles.pageHeading}>
          <View>
            <Text style={styles.eyebrow}>LYNORA PASSPORT</Text>
            <Text style={styles.pageTitle}>MY ORDERS</Text>
            <Text style={styles.pageSubtitle}>Manage your concert purchases and payment history.</Text>
          </View>
          <View style={styles.totalOrdersBadge}><Text style={styles.totalOrdersText}>{stats.total} Total Orders</Text></View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Total Orders" value={stats.total} description="All your purchases" icon={ClipboardList} />
          <StatCard title="Successful Payments" value={stats.paid} description="Successfully paid orders" icon={Check} />
          <StatCard title="Pending Payment" value={stats.pending} description="Waiting for payment" icon={Clock3} />
          <StatCard title="Total Spent" value={formatCurrency(stats.spent)} description="Total successful payments" icon={DollarSign} />
        </View>

        <View style={styles.historyHeading}>
          <View style={styles.historyHeadingText}>
            <Text style={styles.historyTitle}>Order History</Text>
            <Text style={styles.historySubtitle}>{filteredOrders.length} orders displayed</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map((item) => {
              const active = filter === item.key;
              return (
                <TouchableOpacity key={item.key} onPress={() => { setFilter(item.key); setExpandedId(null); }} style={[styles.filterButton, active && styles.filterActive]}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator color={C.purple} size="large" /><Text style={styles.stateText}>Loading your orders...</Text></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Unable to Load Orders</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadOrders()}><RotateCw size={14} color={C.white} /><Text style={styles.retryText}>Try Again</Text></TouchableOpacity>
          </View>
        ) : filteredOrders.length ? (
          <View style={styles.orderList}>
            {filteredOrders.map((order) => (
              <OrderCard
                key={String(order.order_id || order.id)}
                order={order}
                expanded={expandedId === String(order.order_id || order.id)}
                onToggle={() => setExpandedId((current) => current === String(order.order_id || order.id) ? null : String(order.order_id || order.id))}
                onOpenTicket={() => openTickets(order)}
              />
            ))}
          </View>
        ) : (
          <EmptyOrders onExplore={explore} />
        )}

        <View style={styles.footerBanner}>
          <View style={styles.footerIcon}><Ticket size={20} color={C.purpleLight} /></View>
          <View style={styles.footerCopy}>
            <Text style={styles.footerTitle}>Ready for your next concert?</Text>
            <Text style={styles.footerDescription}>Discover more events and unforgettable experiences.</Text>
          </View>
          <TouchableOpacity style={styles.footerButton} onPress={explore}>
            <Text style={styles.footerButtonText}>EXPLORE CONCERTS</Text>
            <ArrowRight size={13} color={C.white} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // HEADER
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    minHeight: 44,
  },
  greetingBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  greeting: {
    color: C.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },

  // PAGE HEADING
  pageHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 19,
  },
  eyebrow: {
    color: C.purpleLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: C.white,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 4,
  },
  pageSubtitle: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
    maxWidth: 245,
  },
  totalOrdersBadge: {
    backgroundColor: '#202A4F',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.38)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  totalOrdersText: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '800',
  },

  // MOBILE STATISTICS — compact 2 x 2 grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 25,
  },
  statCard: {
    width: '48.4%',
    minHeight: 112,
    backgroundColor: '#171B2A',
    borderWidth: 1,
    borderColor: 'rgba(144,143,160,0.19)',
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  statTitle: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
    lineHeight: 13,
  },
  statIcon: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: C.white,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: -0.4,
  },
  statDescription: {
    color: '#8791AA',
    fontSize: 10,
    marginTop: 3,
  },

  // ORDER HISTORY
  historyHeading: {
    marginBottom: 14,
  },
  historyHeadingText: {
    marginBottom: 12,
  },
  historyTitle: {
    color: C.white,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  historySubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 4,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 3,
  },
  filterButton: {
    minHeight: 42,
    justifyContent: 'center',
    backgroundColor: '#171B2A',
    borderWidth: 1,
    borderColor: 'rgba(144,143,160,0.25)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  filterText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  filterTextActive: {
    color: C.white,
  },

  // ORDER CARD
  orderList: {
    gap: 13,
  },
  orderCard: {
    backgroundColor: '#171B2A',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.24)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(144,143,160,0.13)',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  headerField: {
    flex: 1,
    minWidth: '42%',
  },
  purchaseField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#929BB2',
    fontSize: 10,
  },
  orderNumber: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  purchaseDate: {
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },

  // CONCERT INFORMATION
  concertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  poster: {
    width: 68,
    height: 76,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: C.panel,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  concertInfo: {
    flex: 1,
    minWidth: 0,
  },
  concertName: {
    color: C.white,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
  },
  ticketQuantity: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 7,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 4,
    maxWidth: 105,
  },
  methodPill: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillPurple: {
    color: '#B9A4FF',
    fontSize: 10,
    fontWeight: '700',
  },
  pillMuted: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  totalBlock: {
    alignItems: 'flex-end',
    minWidth: 83,
    maxWidth: 105,
  },
  totalLabel: {
    color: C.muted,
    fontSize: 10,
  },
  totalValue: {
    color: C.white,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  totalCaption: {
    color: C.muted,
    fontSize: 10,
    marginTop: 3,
    textAlign: 'right',
  },

  // ORDER ACTIONS
  orderFooter: {
    backgroundColor: '#0E1427',
    borderTopWidth: 1,
    borderTopColor: 'rgba(144,143,160,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paymentInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    paddingRight: 4,
  },
  paymentMethod: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  separator: {
    color: C.border,
    fontSize: 11,
  },
  orderCode: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    flexShrink: 1,
  },
  actions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
    gap: 8,
  },
  openTicketButton: {
    backgroundColor: C.purple,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  openTicketText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '900',
  },
  awaitingBadge: {
    backgroundColor: 'rgba(245,197,108,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,108,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  awaitingText: {
    color: C.yellow,
    fontSize: 10,
    fontWeight: '800',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(144,143,160,0.35)',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  detailsButtonActive: {
    borderColor: C.purple,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  detailsButtonText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  detailsButtonTextActive: {
    color: '#C4B5FD',
  },

  // ORDER DETAILS
  detailsPanel: {
    marginHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#0C1223',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  detailsTitle: {
    color: C.white,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailField: {
    width: '47%',
    minWidth: 0,
    gap: 4,
  },
  detailLabel: {
    color: C.muted,
    fontSize: 10,
  },
  detailValue: {
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  detailHighlight: {
    color: C.purpleLight,
  },

  // EMPTY / LOADING / ERROR
  emptyState: {
    backgroundColor: '#171B2A',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.22)',
    borderRadius: 14,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 34,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 13,
  },
  emptyDescription: {
    color: C.muted,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 7,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.purple,
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 10,
    marginTop: 17,
  },
  exploreButtonText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '900',
  },
  stateBox: {
    backgroundColor: '#171B2A',
    borderWidth: 1,
    borderColor: 'rgba(144,143,160,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 34,
    gap: 10,
  },
  stateText: {
    color: C.muted,
    fontSize: 10,
  },
  errorBox: {
    backgroundColor: '#171B2A',
    borderWidth: 1,
    borderColor: 'rgba(244,125,154,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  errorTitle: {
    color: C.pink,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 7,
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.purple,
    borderRadius: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 12,
  },
  retryText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '900',
  },

  // FOOTER
  footerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#171B2A',
    borderWidth: 1,
    borderColor: 'rgba(144,143,160,0.18)',
    borderRadius: 12,
    padding: 12,
    marginTop: 19,
  },
  footerIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCopy: {
    flex: 1,
    minWidth: 130,
  },
  footerTitle: {
    color: C.white,
    fontSize: 10,
    fontWeight: '900',
  },
  footerDescription: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 11,
    marginTop: 3,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.purple,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerButtonText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '900',
  },
});
