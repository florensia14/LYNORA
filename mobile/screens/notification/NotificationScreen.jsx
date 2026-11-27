import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft, Bell, Ticket, CalendarDays, Gift, CreditCard,
  Megaphone, CheckCheck, ChevronRight, MapPin, RefreshCw,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  fetchUpcomingTicket,
} from '../../services/notificationService';
import {
  publishNotifications, subscribeToNotificationChanges,
  updateNotificationRead, updateAllNotificationsRead,
} from '../../utils/notificationStorage';
import { API_BASE_URL } from '../../services/api';

const C = {
  bg: '#0B1122', panel: '#171B2B', card: '#111A30', border: '#2A3450',
  purple: '#8B5CF6', cyan: '#22D3EE', white: '#FFFFFF', muted: '#AAB0C5',
  green: '#42D99A', yellow: '#F5C85B', red: '#FF7777',
};
const FILTERS = ['All', 'Unread', 'Transactions', 'Schedule', 'Promo'];

function imageUrl(path) {
  if (!path) return null;
  const host = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(path)) {
    return `${host}${path.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '')}`;
  }
  if (/^https?:\/\//i.test(path)) return path;
  return `${host}/${String(path).replace(/^\/+/, '')}`;
}
function groupKey(value) {
  const d = new Date(value); const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d >= today) return 'TODAY';
  if (d >= yesterday && d < today) return 'YESTERDAY';
  return 'THIS WEEK';
}
function iconFor(type) {
  if (type === 'ticket') return Ticket;
  if (type === 'reminder') return CalendarDays;
  if (type === 'system') return CreditCard;
  if (type === 'support') return Bell;
  return Megaphone;
}
function colorFor(type) {
  if (type === 'ticket') return C.red;
  if (type === 'reminder') return C.yellow;
  if (type === 'system') return C.green;
  if (type === 'support') return C.cyan;
  return '#C7BBFF';
}

export default function NotificationScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [upcoming, setUpcoming] = useState(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [notifications, nextTicket] = await Promise.all([
        fetchNotifications(),
        fetchUpcomingTicket().catch(() => null),
      ]);
      setItems(notifications);
      publishNotifications(notifications);
      setUpcoming(nextTicket);
    } catch (e) {
      setError(e?.message || 'Gagal memuat notifikasi dari server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    load();
    const unsubscribe = subscribeToNotificationChanges((next) => {
      if (active) setItems(next);
    });
    const timer = setInterval(() => { if (active) load(true); }, 30000);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(timer);
    };
  }, [load]));

  const unreadCount = items.filter((item) => item.unread).length;
  const visible = useMemo(() => items.filter((item) => {
    if (filter === 'Unread') return item.unread;
    if (filter === 'Transactions') return item.type === 'ticket' || item.type === 'system';
    if (filter === 'Schedule') return item.type === 'reminder';
    if (filter === 'Promo') return item.type === 'promo' || item.type === 'support';
    return true;
  }), [items, filter]);

  const groups = useMemo(() => ['TODAY', 'YESTERDAY', 'THIS WEEK']
    .map((name) => ({ name, rows: visible.filter((item) => groupKey(item.created_at) === name) }))
    .filter((group) => group.rows.length), [visible]);

  const markRead = async (item) => {
    if (!item.unread || busyId === item.id) return;
    setBusyId(item.id);
    try {
      await markNotificationRead(item.id);
      updateNotificationRead(item.id);
    } catch (e) {
      Alert.alert('Gagal memperbarui notifikasi', e?.message || 'Coba lagi.');
    } finally { setBusyId(null); }
  };

  const markAllRead = async () => {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      updateAllNotificationsRead();
    } catch (e) {
      Alert.alert('Gagal memperbarui notifikasi', e?.message || 'Coba lagi.');
    } finally { setMarkingAll(false); }
  };

  const openTickets = () => navigation.navigate('MainTab', { screen: 'MyTickets' });
  const openExplore = () => navigation.navigate('MainTab', { screen: 'Explore' });
  const openOrders = () => navigation.navigate('MainTab', { screen: 'History' });

  const renderCard = (item) => {
    const Icon = iconFor(item.type); const color = colorFor(item.type);
    return (
      <TouchableOpacity key={item.id} activeOpacity={0.88}
        onPress={() => markRead(item)}
        style={[styles.notificationCard, item.unread && styles.unreadCard]}>
        <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
          <Icon size={19} color={color} />
        </View>
        <View style={styles.content}>
          <View style={styles.topLine}>
            <View style={styles.labelLine}>
              <Text style={[styles.category, { color }]}>{item.category}</Text>
              {item.unread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          {item.type === 'ticket' && (
            <View style={styles.ticketPreview}>
              {item.poster_url ? <Image source={{ uri: imageUrl(item.poster_url) }} style={styles.poster} /> :
                <View style={[styles.poster, styles.posterFallback]}><Ticket color={C.purple} size={20}/></View>}
              <View style={styles.ticketInfo}>
                <Text numberOfLines={1} style={styles.ticketName}>{item.event_name || 'Concert Ticket'}</Text>
                <Text numberOfLines={2} style={styles.ticketMeta}>
                  {item.start_date ? new Date(item.start_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'E-Ticket'}
                  {item.venue_name ? ` · ${item.venue_name}` : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.actionButton} onPress={() => { markRead(item); openTickets(); }}>
                <Text style={styles.actionText}>View Ticket</Text>
              </TouchableOpacity>
            </View>
          )}
          {item.type === 'system' && (
            <TouchableOpacity style={styles.inlineAction} onPress={() => { markRead(item); openOrders(); }}>
              <Text style={styles.actionText}>View Transaction</Text><ChevronRight size={14} color={C.white}/>
            </TouchableOpacity>
          )}
          {(item.type === 'promo' || item.type === 'reminder') && (
            <TouchableOpacity style={styles.inlineAction} onPress={() => { markRead(item); openExplore(); }}>
              <Text style={styles.actionText}>{item.type === 'promo' ? 'Explore Concerts' : 'View Event'}</Text>
              <ChevronRight size={14} color={C.white}/>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content"/>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={19} color={C.white}/>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Updates about your tickets and concerts</Text>
          </View>
        </View>
        <HeaderActions navigation={navigation}/>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.cyan}/>}
      >
        <View style={styles.liveRow}>
          <View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveText}>LIVE UPDATES</Text></View>
          <View style={styles.countBadge}><Text style={styles.countText}>{items.length} ACTIVITIES</Text></View>
        </View>
        <Text style={styles.pageTitle}>Notification Center</Text>
        <Text style={styles.description}>Latest updates on ticket purchases, payment confirmations, concert schedule changes, and announcements.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((name) => (
            <TouchableOpacity key={name} onPress={() => setFilter(name)} style={[styles.filter, filter === name && styles.filterActive]}>
              <Text style={[styles.filterText, filter === name && styles.filterTextActive]}>
                {name === 'Unread' ? `Unread (${unreadCount})` : name === 'Transactions' ? 'Transactions & Payments' : name === 'Schedule' ? 'Schedule & Venue' : name === 'Promo' ? 'Promo & Profile' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.toolbar}>
          <Text style={styles.unreadSummary}>{unreadCount} unread notifications</Text>
          <TouchableOpacity disabled={!unreadCount || markingAll} onPress={markAllRead} style={[styles.markAll, (!unreadCount || markingAll) && { opacity: 0.45 }]}>
            {markingAll ? <ActivityIndicator size="small" color={C.purple}/> : <CheckCheck size={14} color="#C7BBFF"/>}
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator size="large" color={C.cyan}/><Text style={styles.muted}>Loading notifications...</Text></View>
          : error ? <View style={styles.empty}><Bell size={28} color={C.red}/><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => load()}><RefreshCw size={14} color={C.white}/><Text style={styles.actionText}>Try Again</Text></TouchableOpacity></View>
          : groups.length ? groups.map((group) => (
            <View key={group.name} style={styles.group}>
              <View style={styles.groupHeading}><View style={styles.accent}/><Text style={styles.groupTitle}>{group.name}</Text><Text style={styles.groupCount}>· {group.rows.length} updates</Text></View>
              {group.rows.map(renderCard)}
            </View>
          )) : <View style={styles.empty}><Bell size={30} color={C.purple}/><Text style={styles.emptyTitle}>No Notifications</Text><Text style={styles.muted}>Your latest updates will appear here.</Text></View>
        }

        {filter === 'All' && upcoming && (
          <View style={styles.upcomingCard}>
            <View style={styles.upcomingHeading}><Text style={styles.upcomingLabel}>YOUR UPCOMING CONCERT</Text><Text style={styles.liveSoon}>LIVE SOON</Text></View>
            {upcoming.poster_url ? <Image source={{ uri: imageUrl(upcoming.poster_url) }} style={styles.upcomingPoster}/> : null}
            <Text style={styles.upcomingName}>{upcoming.event_name}</Text>
            <View style={styles.venueRow}><MapPin size={13} color={C.muted}/><Text style={styles.venueText}>{upcoming.venue_name || 'Venue TBA'}{upcoming.venue_address ? ` · ${upcoming.venue_address}` : ''}</Text></View>
            <Text style={styles.venueText}>{new Date(upcoming.start_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
            <TouchableOpacity style={styles.fullButton} onPress={openTickets}><Text style={styles.fullButtonText}>Open My Tickets</Text><ChevronRight size={15} color={C.white}/></TouchableOpacity>
          </View>
        )}
        <Text style={styles.footer}>YOU'RE ALL CAUGHT UP WITH LYNORA</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 48, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: '#1B2235', gap: 8 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  backButton: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#171E32', borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 14, fontWeight: '900' },
  headerSubtitle: { color: C.muted, fontSize: 9, marginTop: 3 },
  scroll: { padding: 16, paddingBottom: 35 },
  liveRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#123D37', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  liveText: { color: '#55E5B4', fontSize: 9, fontWeight: '900' },
  countBadge: { backgroundColor: '#211D3E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  countText: { color: '#C7BBF2', fontSize: 9, fontWeight: '900' },
  pageTitle: { color: C.white, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  description: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 7, marginBottom: 15 },
  filters: { gap: 8, paddingBottom: 4 },
  filter: { borderWidth: 1, borderColor: '#454B68', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#10182C' },
  filterActive: { backgroundColor: C.purple, borderColor: C.purple },
  filterText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: C.white },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, marginBottom: 15 },
  unreadSummary: { color: C.muted, fontSize: 10 },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#8B5CF655', backgroundColor: '#8B5CF61A', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9 },
  markAllText: { color: '#C7BBFF', fontSize: 9, fontWeight: '800' },
  group: { marginBottom: 18 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  accent: { width: 4, height: 18, borderRadius: 3, backgroundColor: C.cyan },
  groupTitle: { color: C.white, fontSize: 11, fontWeight: '900' },
  groupCount: { color: C.purple, fontSize: 9, fontWeight: '700' },
  notificationCard: { flexDirection: 'row', gap: 10, backgroundColor: C.panel, borderWidth: 1, borderColor: '#FFFFFF10', borderRadius: 11, padding: 12, marginBottom: 9 },
  unreadCard: { borderColor: '#8B5CF655', backgroundColor: '#1A1B32' },
  iconBox: { width: 37, height: 37, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  labelLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  category: { fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.purple },
  time: { color: '#85899B', fontSize: 8 },
  title: { color: C.white, fontSize: 12, fontWeight: '900', marginTop: 6 },
  message: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  ticketPreview: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, padding: 7, borderRadius: 8, backgroundColor: '#0C1122', borderWidth: 1, borderColor: '#FFFFFF0D' },
  poster: { width: 43, height: 43, borderRadius: 6, backgroundColor: '#202A4F' },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  ticketInfo: { flex: 1, minWidth: 0 },
  ticketName: { color: C.white, fontSize: 9, fontWeight: '800' },
  ticketMeta: { color: C.muted, fontSize: 8, marginTop: 4 },
  actionButton: { backgroundColor: C.purple, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 6 },
  actionText: { color: C.white, fontSize: 9, fontWeight: '800' },
  inlineAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9, backgroundColor: C.purple, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 35 },
  muted: { color: C.muted, fontSize: 10, marginTop: 8, textAlign: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: '#FFFFFF12', borderRadius: 12, padding: 28, marginTop: 6 },
  emptyTitle: { color: C.white, fontSize: 14, fontWeight: '900', marginTop: 12 },
  errorText: { color: '#FF9999', fontSize: 11, textAlign: 'center', marginTop: 10 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.purple, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  upcomingCard: { backgroundColor: C.panel, borderWidth: 1, borderColor: '#FFFFFF12', borderRadius: 12, padding: 12, marginTop: 4 },
  upcomingHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  upcomingLabel: { color: C.white, fontSize: 10, fontWeight: '900' },
  liveSoon: { color: C.yellow, fontSize: 8, fontWeight: '900', backgroundColor: '#482039', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  upcomingPoster: { width: '100%', height: 115, borderRadius: 8, marginBottom: 9 },
  upcomingName: { color: C.white, fontSize: 13, fontWeight: '900' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  venueText: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 5, flex: 1 },
  fullButton: { backgroundColor: C.purple, borderRadius: 8, paddingVertical: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  fullButtonText: { color: C.white, fontSize: 10, fontWeight: '900' },
  footer: { textAlign: 'center', color: '#6D748A', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 22 },
});
