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
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import {
  Ticket,
  CalendarDays,
  MapPin,
  Download,
  ShieldCheck,
  Clock3,
  X,
  ChevronRight,
  ShoppingBag,
  RotateCw,
  FileText,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';
import { fetchMyTickets } from '../../services/ticketService';
import { exportTicketPdf } from '../../utils/ticketPdf';

const C = {
  bg: '#0B1020',
  card: '#171B26',
  cardAlt: '#111A30',
  purple: '#8B5CF6',
  purpleDark: '#5456DE',
  cyan: '#22D3EE',
  green: '#72E08C',
  yellow: '#F5C56C',
  pink: '#FF6B81',
  white: '#FFFFFF',
  muted: '#AAB0C5',
  border: '#676D89',
};

const TABS = [
  { key: 'active', label: 'Active Tickets' },
  { key: 'history', label: 'History' },
  { key: 'cancelled', label: 'Cancelled' },
];

function formatDate(value, withTime = false) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  }).format(date);
}

function ticketStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'valid':
      return { label: 'READY TO USE', color: C.green, bg: '#152B32' };
    case 'used':
      return { label: 'COMPLETED', color: C.yellow, bg: '#2E2723' };
    case 'refunded':
      return { label: 'REFUNDED', color: '#BBA6FF', bg: '#302747' };
    case 'cancelled':
      return { label: 'CANCELLED', color: C.pink, bg: '#2F1E2A' };
    default:
      return { label: String(status || 'UNKNOWN').toUpperCase(), color: C.muted, bg: '#252A3A' };
  }
}

function SectionHeading({ children, count }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{children}</Text>
      {count !== undefined ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }) {
  const info = ticketStatus(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: info.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: info.color }]} />
      <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

function TicketField({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={2}>{String(value)}</Text>
    </View>
  );
}

function TicketPoster({ ticket, onPress, compact = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.posterWrap, compact && styles.posterWrapCompact]}
    >
      {ticket.poster_url ? (
        <Image source={{ uri: ticket.poster_url }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Ticket size={34} color="#A78BFA" />
          <Text style={styles.fallbackBrand}>LYNORA E-TICKET</Text>
        </View>
      )}
      <View style={styles.posterShade} />
      <View style={styles.posterTags}>
        <View style={styles.ticketTag}>
          <Text style={styles.ticketTagText}>LYNORA E-TICKET</Text>
        </View>
        {!!ticket.category_name && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText} numberOfLines={1}>{ticket.category_name}</Text>
          </View>
        )}
      </View>
      <Text style={styles.posterTitle} numberOfLines={2}>{ticket.event_name}</Text>
    </TouchableOpacity>
  );
}

function MainTicketCard({ ticket, onDownload, onOpen }) {
  const status = ticketStatus(ticket.ticket_status);
  return (
    <View style={styles.mainTicketCard}>
      <View style={styles.ticketTopline}>
        <View style={styles.toplineLeft}>
          <View style={styles.readyLine}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.toplineStatus, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.bookingText}>Booking ID: <Text style={styles.bookingStrong}>{ticket.order_code || '-'}</Text></Text>
        </View>
        <Text style={styles.ticketNumber}>Ticket: <Text style={styles.bookingStrong}>{ticket.ticket_code}</Text></Text>
      </View>

      <TicketPoster ticket={ticket} onPress={onOpen} />

      <View style={styles.ticketFields}>
        <TicketField label="DATE & TIME" value={formatDate(ticket.start_date, true)} />
        <TicketField label="TICKET NO." value={ticket.ticket_code} />
        <TicketField label="CATEGORY" value={ticket.category_name} />
        <TicketField label="VENUE" value={ticket.venue_name} />
        <TicketField label="VENUE ADDRESS" value={ticket.venue_address} />
        <TicketField label="BOOKING ID" value={ticket.order_code} />
      </View>

      <View style={styles.ticketActions}>
        <TouchableOpacity style={styles.downloadButton} onPress={onDownload} activeOpacity={0.85}>
          <Download size={15} color={C.white} />
          <Text style={styles.downloadText}>Download E-Ticket (PDF)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.openButton} onPress={onOpen} activeOpacity={0.85}>
          <FileText size={15} color={C.cyan} />
          <Text style={styles.openButtonText}>Ticket Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.informationFooter}>
        <Ticket size={15} color={C.muted} />
        <Text style={styles.informationFooterText}>Ticket Information</Text>
      </View>
    </View>
  );
}

function QrCard({ ticket, onExpand }) {
  return (
    <View style={styles.qrCard}>
      <View style={styles.qrHeader}>
        <View style={styles.officialPass}>
          <View style={styles.greenDot} />
          <Text style={styles.officialPassText}>OFFICIAL PASS</Text>
        </View>
        <Text style={styles.secureText}>SECURE QR VALIDATION</Text>
      </View>
      <TouchableOpacity style={styles.qrWhite} onPress={onExpand} activeOpacity={0.9}>
        <QRCode value={ticket.ticket_code || `LYNORA-${ticket.ticket_id}`} size={190} level="H" backgroundColor="#FFFFFF" color="#0B1020" />
      </TouchableOpacity>
      <Text style={styles.qrCaption}>
        <Text style={styles.qrCaptionGreen}>Official LYNORA Ticket</Text>
        {'\n'}Scan your ticket QR code for identification.
      </Text>
      <View style={styles.codePill}>
        <Text style={styles.codePillText} numberOfLines={1}>CODE: {ticket.ticket_code}</Text>
      </View>
      <TouchableOpacity onPress={onExpand} style={styles.expandQrButton}>
        <Text style={styles.expandQrText}>Tap QR to enlarge</Text>
        <ChevronRight size={14} color={C.cyan} />
      </TouchableOpacity>
    </View>
  );
}

function OtherTicketCard({ ticket, onPress }) {
  return (
    <TouchableOpacity style={styles.otherTicketCard} activeOpacity={0.85} onPress={onPress}>
      {ticket.poster_url ? (
        <Image source={{ uri: ticket.poster_url }} style={styles.otherPoster} />
      ) : (
        <View style={[styles.otherPoster, styles.posterFallback]}>
          <Ticket size={20} color="#A78BFA" />
        </View>
      )}
      <View style={styles.otherContent}>
        <Text style={styles.otherTitle} numberOfLines={2}>{ticket.event_name}</Text>
        <Text style={styles.otherDate}>{formatDate(ticket.start_date, true)}</Text>
        <Text style={styles.otherMeta} numberOfLines={1}>{ticket.category_name || 'E-Ticket'} · {ticket.ticket_code}</Text>
      </View>
      <View style={styles.otherRight}>
        <StatusBadge status={ticket.ticket_status} />
        <ChevronRight size={17} color={C.muted} />
      </View>
    </TouchableOpacity>
  );
}

function HistoryCard({ ticket, onPress }) {
  return (
    <TouchableOpacity style={styles.historyCard} activeOpacity={0.88} onPress={onPress}>
      <TicketPoster ticket={ticket} onPress={onPress} compact />
      <View style={styles.historyBody}>
        <Text style={styles.historyName} numberOfLines={2}>{ticket.event_name}</Text>
        <Text style={styles.historyDate}>{formatDate(ticket.start_date)}</Text>
        <Text style={styles.historyVenue} numberOfLines={2}>{ticket.venue_name || 'Venue information unavailable'}</Text>
        <View style={styles.historyBottom}>
          <Text style={styles.historyCode} numberOfLines={1}>{ticket.ticket_code}</Text>
          <StatusBadge status={ticket.ticket_status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CancelledCard({ ticket }) {
  return (
    <View style={styles.cancelledCard}>
      {ticket.poster_url ? (
        <Image source={{ uri: ticket.poster_url }} style={styles.cancelledPoster} />
      ) : (
        <View style={[styles.cancelledPoster, styles.posterFallback]}>
          <Ticket size={20} color={C.muted} />
        </View>
      )}
      <View style={styles.cancelledContent}>
        <Text style={styles.cancelledTitle} numberOfLines={2}>{ticket.event_name}</Text>
        <Text style={styles.cancelledMeta}>{ticket.category_name} · {ticket.ticket_code}</Text>
        <Text style={styles.cancelledMeta}>{formatDate(ticket.start_date)}</Text>
      </View>
      <StatusBadge status={ticket.ticket_status} />
    </View>
  );
}

function EmptyState({ tab, onExplore }) {
  const title = tab === 'active'
    ? 'No Active Tickets Yet'
    : tab === 'history'
      ? 'No Concert History Yet'
      : 'No Cancelled Tickets';
  const description = tab === 'active'
    ? 'Your purchased tickets will appear here along with their available e-ticket information.'
    : tab === 'history'
      ? 'Concerts you have attended will appear here.'
      : 'Cancelled or refunded tickets will appear here.';
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ticket size={34} color="#9295A8" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {tab === 'active' ? (
        <TouchableOpacity style={styles.buyButton} onPress={onExplore} activeOpacity={0.85}>
          <ShoppingBag size={16} color={C.white} />
          <Text style={styles.buyButtonText}>Buy Tickets</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function MyTicketsScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('active');
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [qrTicket, setQrTicket] = useState(null);

  const requestedOrderId = route?.params?.orderId ?? null;
  const requestedOrderCode = route?.params?.orderCode ?? null;

  const loadTickets = useCallback(async (
    isRefresh = false,
    targetOrderId = null,
    targetOrderCode = null,
  ) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const rows = await fetchMyTickets();
      setTickets(rows);

      const matchingTicket = (targetOrderId || targetOrderCode)
        ? rows.find((ticket) => (
            ticket.ticket_status === 'valid' && (
              (targetOrderId && String(ticket.order_id) === String(targetOrderId)) ||
              (targetOrderCode && String(ticket.order_code) === String(targetOrderCode))
            )
          ))
        : null;

      if (matchingTicket) {
        setActiveTab('active');
        setSelectedTicketId(matchingTicket.ticket_id);
      } else {
        setSelectedTicketId((current) => {
          if (
            current &&
            rows.some((item) =>
              String(item.ticket_id) === String(current) &&
              item.ticket_status === 'valid'
            )
          ) return current;

          return rows.find((item) => item.ticket_status === 'valid')?.ticket_id ?? null;
        });
      }
    } catch (err) {
      setError(err?.message || 'Gagal mengambil data tiket.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTickets(false, requestedOrderId, requestedOrderCode);
    }, [loadTickets, requestedOrderId, requestedOrderCode])
  );

  const activeTickets = useMemo(() => tickets.filter((item) => item.ticket_status === 'valid'), [tickets]);
  const historyTickets = useMemo(() => tickets.filter((item) => item.ticket_status === 'used'), [tickets]);
  const cancelledTickets = useMemo(() => tickets.filter((item) => ['cancelled', 'refunded'].includes(item.ticket_status)), [tickets]);

  const selectedTicket = activeTickets.find((item) => String(item.ticket_id) === String(selectedTicketId)) || activeTickets[0] || null;
  const otherActiveTickets = activeTickets.filter((item) => String(item.ticket_id) !== String(selectedTicket?.ticket_id));

  const openTicketDetail = (ticket) => {
    navigation.navigate('TicketDetail', {
      ticket: {
        title: ticket.event_name,
        date: formatDate(ticket.start_date, true),
        venue: ticket.venue_name || ticket.venue_address || '-',
        image: ticket.poster_url,
        category: ticket.category_name,
        ticketCode: ticket.ticket_code,
        bookingId: ticket.order_code,
        status: ticketStatus(ticket.ticket_status).label,
      },
      qrValue: ticket.ticket_code,
    });
  };

  const downloadTicket = async (ticket) => {
    try {
      await exportTicketPdf({
        title: ticket.event_name,
        date: formatDate(ticket.start_date, true),
        venue: ticket.venue_name || ticket.venue_address || '-',
        qrValue: ticket.ticket_code,
      });
      Alert.alert('LYNORA', 'PDF e-ticket berhasil disiapkan.');
    } catch (err) {
      Alert.alert('LYNORA', err?.message || 'PDF tiket gagal dibuat.');
    }
  };

  const handleExplore = () => navigation.navigate('Explore');

  const totalCount = activeTab === 'active'
    ? activeTickets.length
    : activeTab === 'history'
      ? historyTickets.length
      : cancelledTickets.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadTickets(true)} tintColor={C.purple} colors={[C.purple]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>MY LYNORA TICKETS</Text>
            <Text style={styles.subtitle}>E-ticket dan riwayat tiket konsermu</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>LYNORA E-TICKETS</Text>
            <Text style={styles.pageTitle}>MY TICKETS</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{tickets.length} TICKETS</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tab, selected && styles.tabActive]} activeOpacity={0.85}>
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.purple} size="large" />
            <Text style={styles.loadingText}>Loading your tickets...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Failed to Load Tickets</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadTickets()} activeOpacity={0.85}>
              <RotateCw size={15} color={C.white} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === 'active' ? (
              activeTickets.length === 0 ? (
                <EmptyState tab="active" onExplore={handleExplore} />
              ) : (
                <>
                  <SectionHeading count={activeTickets.length}>Active E-Tickets</SectionHeading>
                  {selectedTicket ? (
                    <>
                      <MainTicketCard
                        ticket={selectedTicket}
                        onDownload={() => downloadTicket(selectedTicket)}
                        onOpen={() => openTicketDetail(selectedTicket)}
                      />
                      <QrCard ticket={selectedTicket} onExpand={() => setQrTicket(selectedTicket)} />
                    </>
                  ) : null}
                  {otherActiveTickets.length > 0 ? (
                    <>
                      <SectionHeading count={otherActiveTickets.length}>Other Active Tickets</SectionHeading>
                      {otherActiveTickets.map((ticket) => (
                        <OtherTicketCard
                          key={ticket.ticket_id}
                          ticket={ticket}
                          onPress={() => setSelectedTicketId(ticket.ticket_id)}
                        />
                      ))}
                    </>
                  ) : null}
                </>
              )
            ) : null}

            {activeTab === 'history' ? (
              historyTickets.length === 0 ? (
                <EmptyState tab="history" onExplore={handleExplore} />
              ) : (
                <>
                  <SectionHeading count={historyTickets.length}>Concert History</SectionHeading>
                  {historyTickets.map((ticket) => (
                    <HistoryCard key={ticket.ticket_id} ticket={ticket} onPress={() => openTicketDetail(ticket)} />
                  ))}
                </>
              )
            ) : null}

            {activeTab === 'cancelled' ? (
              cancelledTickets.length === 0 ? (
                <EmptyState tab="cancelled" onExplore={handleExplore} />
              ) : (
                <>
                  <SectionHeading count={cancelledTickets.length}>Cancelled Tickets</SectionHeading>
                  {cancelledTickets.map((ticket) => <CancelledCard key={ticket.ticket_id} ticket={ticket} />)}
                </>
              )
            ) : null}
          </>
        )}
        <View style={{ height: 26 }} />
      </ScrollView>

      <Modal visible={Boolean(qrTicket)} transparent animationType="fade" onRequestClose={() => setQrTicket(null)}>
        {qrTicket ? (
          <View style={styles.modalBackdrop}>
            <View style={styles.qrModal}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setQrTicket(null)}>
                <X size={20} color={C.white} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>E-TICKET QR</Text>
              <Text style={styles.modalSubtitle}>{qrTicket.event_name}</Text>
              <View style={styles.largeQr}>
                <QRCode value={qrTicket.ticket_code || `LYNORA-${qrTicket.ticket_id}`} size={250} level="H" color="#0B1020" backgroundColor="#FFFFFF" />
              </View>
              <Text style={styles.modalCode}>{qrTicket.ticket_code}</Text>
              <Text style={styles.modalSubtitle}>Show this QR code at the venue entrance.</Text>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 25 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTextWrap: { flex: 1 },
  greeting: { color: C.white, fontSize: 14, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 10, marginTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { color: C.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  pageTitle: { color: C.white, fontSize: 25, fontWeight: '900', marginTop: 4 },
  totalBadge: { backgroundColor: '#202A4F', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  totalBadgeText: { color: '#A78BFA', fontSize: 8, fontWeight: '900' },
  tabs: { flexDirection: 'row', gap: 7, marginBottom: 18 },
  tab: { flex: 1, minHeight: 38, paddingHorizontal: 7, borderRadius: 22, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  tabActive: { backgroundColor: C.purple, borderColor: C.purple },
  tabText: { color: C.muted, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  tabTextActive: { color: C.white },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18, marginBottom: 12 },
  sectionAccent: { width: 4, height: 26, borderRadius: 4, backgroundColor: C.purple },
  sectionTitle: { color: C.white, fontSize: 15, fontWeight: '900', flex: 1 },
  countBadge: { backgroundColor: '#202A4F', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  countText: { color: C.cyan, fontSize: 9, fontWeight: '800' },
  loadingBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 45, alignItems: 'center', gap: 10 },
  loadingText: { color: C.muted, fontSize: 11 },
  errorBox: { backgroundColor: '#2F1E2A', borderWidth: 1, borderColor: '#794053', borderRadius: 14, padding: 18 },
  errorTitle: { color: C.pink, fontSize: 14, fontWeight: '900' },
  errorText: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  retryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.purpleDark, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, marginTop: 14 },
  retryText: { color: C.white, fontSize: 10, fontWeight: '800' },
  emptyState: { minHeight: 250, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171B26', borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 24, marginTop: 4 },
  emptyIcon: { width: 62, height: 62, borderRadius: 18, backgroundColor: '#202A4F', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.white, fontSize: 16, fontWeight: '900', textAlign: 'center', marginTop: 14 },
  emptyDescription: { color: C.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7, maxWidth: 300 },
  buyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.purple, borderRadius: 9, paddingHorizontal: 20, paddingVertical: 12, marginTop: 18 },
  buyButtonText: { color: C.white, fontSize: 12, fontWeight: '900' },
  mainTicketCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 13, overflow: 'hidden', marginBottom: 13 },
  ticketTopline: { paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  toplineLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  readyLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  toplineStatus: { fontSize: 8, fontWeight: '900' },
  bookingText: { color: C.muted, fontSize: 8 },
  bookingStrong: { color: C.white, fontWeight: '800' },
  ticketNumber: { color: C.muted, fontSize: 8 },
  posterWrap: { height: 174, marginHorizontal: 11, borderRadius: 9, overflow: 'hidden', backgroundColor: '#0C1122' },
  posterWrapCompact: { height: 125, marginHorizontal: 0, borderRadius: 0 },
  poster: { width: '100%', height: '100%' },
  posterFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#202A4F' },
  fallbackBrand: { color: C.muted, fontSize: 8, fontWeight: '900', marginTop: 6 },
  posterShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,16,32,0.16)' },
  posterTags: { position: 'absolute', top: 9, left: 9, right: 9, flexDirection: 'row', gap: 6 },
  ticketTag: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  ticketTagText: { color: '#171B26', fontSize: 7, fontWeight: '900' },
  categoryTag: { maxWidth: '55%', backgroundColor: C.purple, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  categoryTagText: { color: C.white, fontSize: 7, fontWeight: '800' },
  posterTitle: { position: 'absolute', bottom: 10, left: 10, right: 10, color: C.white, fontSize: 18, lineHeight: 22, fontWeight: '900' },
  ticketFields: { paddingHorizontal: 14, paddingVertical: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  field: { width: '46%', minWidth: 0 },
  fieldLabel: { color: C.muted, fontSize: 8, fontWeight: '600' },
  fieldValue: { color: C.white, fontSize: 10, fontWeight: '800', marginTop: 4, lineHeight: 14 },
  ticketActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  downloadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: C.purpleDark, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 10 },
  downloadText: { color: C.white, fontSize: 9, fontWeight: '800' },
  openButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 10 },
  openButtonText: { color: C.cyan, fontSize: 9, fontWeight: '800' },
  informationFooter: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  informationFooterText: { color: C.white, fontSize: 9, fontWeight: '700' },
  qrCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 15, alignItems: 'center', marginBottom: 14 },
  qrHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  officialPass: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  officialPassText: { color: C.green, fontSize: 8, fontWeight: '900' },
  secureText: { color: C.white, fontSize: 7, fontWeight: '800' },
  qrWhite: { backgroundColor: C.white, borderRadius: 10, padding: 11, marginTop: 17 },
  qrCaption: { color: C.muted, fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 13 },
  qrCaptionGreen: { color: C.green, fontWeight: '900' },
  codePill: { maxWidth: '100%', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, marginTop: 13 },
  codePillText: { color: C.white, fontSize: 9, fontWeight: '800' },
  expandQrButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  expandQrText: { color: C.cyan, fontSize: 9, fontWeight: '800' },
  otherTicketCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 9, marginBottom: 9 },
  otherPoster: { width: 56, height: 60, borderRadius: 7, backgroundColor: C.cardAlt },
  otherContent: { flex: 1, minWidth: 0 },
  otherTitle: { color: C.white, fontSize: 10, fontWeight: '900' },
  otherDate: { color: C.muted, fontSize: 8, marginTop: 4 },
  otherMeta: { color: C.cyan, fontSize: 7, marginTop: 4 },
  otherRight: { alignItems: 'flex-end', gap: 7 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 5 },
  statusText: { fontSize: 7, fontWeight: '900' },
  historyCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  historyBody: { padding: 11 },
  historyName: { color: C.white, fontSize: 11, fontWeight: '900' },
  historyDate: { color: C.muted, fontSize: 8, marginTop: 6 },
  historyVenue: { color: C.muted, fontSize: 8, marginTop: 4 },
  historyBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 9, marginTop: 9 },
  historyCode: { color: C.muted, fontSize: 7, flex: 1 },
  cancelledCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 9, marginBottom: 9 },
  cancelledPoster: { width: 54, height: 58, borderRadius: 7, backgroundColor: C.cardAlt },
  cancelledContent: { flex: 1, minWidth: 0 },
  cancelledTitle: { color: C.white, fontSize: 10, fontWeight: '900' },
  cancelledMeta: { color: C.muted, fontSize: 8, marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.82)' },
  qrModal: { width: '100%', maxWidth: 360, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 22, alignItems: 'center' },
  modalClose: { position: 'absolute', top: 12, right: 12, padding: 5, zIndex: 2 },
  modalTitle: { color: C.white, fontSize: 16, fontWeight: '900' },
  modalSubtitle: { color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 7 },
  largeQr: { backgroundColor: C.white, padding: 14, borderRadius: 12, marginTop: 20 },
  modalCode: { color: C.cyan, fontSize: 10, fontWeight: '900', marginTop: 15 },
});
