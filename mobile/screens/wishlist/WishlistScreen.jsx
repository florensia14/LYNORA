import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image, ImageBackground, StatusBar, ActivityIndicator, Alert,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search, Heart, ChevronDown, MapPin, CalendarDays, Ticket,
  Trash2, Music2, X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import {
  fetchHomeConcerts, fetchHomeCategories, fetchHomeWishlist, setHomeWishlist,
} from '../../services/homeService';
import { subscribeWishlist, publishWishlistIds } from '../../services/wishlistStore';

const C = {
  bg: '#0B1020',
  card: '#151E36',
  card2: '#202A4F',
  purple: '#8B5CF6',
  cyan: '#22D3EE',
  primary: '#5456DE',
  red: '#C30437',
  white: '#FFFFFF',
  muted: '#929BB2',
  border: 'rgba(139,92,246,0.28)',
  green: '#26ADA0',
};

const TABS = [
  { value: 'all', label: 'All Saved' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past Events' },
];

const ICONS = {
  calendar: require('../../assets/icons/calendar (1).png'),
  flag: require('../../assets/icons/flag.png'),
  pin: require('../../assets/icons/pin.png'),
  organizer: require('../../assets/icons/circus.png'),
  wish: require('../../assets/icons/wishlist.png'),
  wishActive: require('../../assets/icons/wishlist(1).png'),
};

const getDate = (event) => {
  const value = event.start_date || event.event_date || event.date;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = getDate({ start_date: value });
  if (!date) return 'Date to be announced';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }).format(date);
};

const formatPrice = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return 'Price unavailable';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

const getStatus = (event) => {
  const lifecycle = String(event.lifecycle_status || '').toLowerCase();
  const sales = String(event.sales_status || '').toLowerCase();
  if (lifecycle === 'ongoing') return { label: 'LIVE NOW', color: C.green, bg: '#152B32' };
  if (lifecycle === 'completed' || sales === 'ended') return { label: 'PAST EVENT', color: '#B8C0D4', bg: '#292F42' };
  if (sales === 'coming_soon') return { label: 'COMING SOON', color: '#F5B84E', bg: '#2E2723' };
  if (sales === 'sold_out') return { label: 'SOLD OUT', color: '#FF8298', bg: '#3A202B' };
  return { label: 'ON SALE', color: C.green, bg: '#152B32' };
};

function Dropdown({ label, value, options, open, onToggle, onSelect }) {
  return (
    <View style={[styles.dropdownWrap, open && styles.dropdownWrapOpen]}>
      <TouchableOpacity style={styles.dropdownButton} onPress={onToggle} activeOpacity={0.85}>
        <Text numberOfLines={1} style={styles.dropdownValue}>{value}</Text>
        <ChevronDown size={16} color="#D7D9E5" />
      </TouchableOpacity>
      {open ? (
        <View style={styles.dropdownMenu}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }}>
            {options.map((option) => (
              <TouchableOpacity key={String(option.value)} style={styles.dropdownOption} onPress={() => onSelect(option.value)}>
                <Text style={[styles.dropdownOptionText, String(option.value) === String(label) && styles.dropdownOptionActive]}>
                  {option.label}
                </Text>
                {String(option.value) === String(label) ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function WishlistCard({ event, width, onRemove, navigation, busy }) {
  const status = getStatus(event);
  const image = event.poster_url || event.hero_image_url || event.image_url;
  const openDetail = () => navigation.navigate('ConcertDetail', { concert: {
    ...event,
    title: event.name,
    image,
    category: event.category_name,
    location: event.venue_name,
    organizer: event.organizer_name,
    price: event.price,
  } });

  return (
    <TouchableOpacity activeOpacity={0.9} style={[styles.eventCard, { width }]} onPress={openDetail}>
      <View style={styles.posterWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.poster} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#242447', '#202A4F', '#11182C']} style={styles.posterFallback}>
            <Text style={styles.fallbackBrand}>LYNORA</Text>
            <Text style={styles.posterFallbackText} numberOfLines={2}>{event.name}</Text>
            <Text style={styles.fallbackTag}>LIVE EXPERIENCE</Text>
          </LinearGradient>
        )}
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <TouchableOpacity style={styles.heartButton} onPress={() => onRemove(event)} disabled={busy} activeOpacity={0.8}>
          {busy ? <ActivityIndicator size="small" color="#FF6B91" /> : (
            <Image source={ICONS.wishActive} style={styles.wishlistIcon} resizeMode="contain" />
          )}
        </TouchableOpacity>
        <View style={styles.priceBadge}><Text style={styles.priceText}>{formatPrice(event.price)}</Text></View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardLabel}>SAVED CONCERT</Text>
        <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
        <Text style={styles.categoryText}>{event.category_name || 'Live Concert'}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {event.description || (event.venue_name ? `Enjoy an unforgettable live concert experience at ${event.venue_name}.` : 'Enjoy an unforgettable live concert experience.')}
        </Text>
        <View style={styles.cardDivider} />
        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Image source={ICONS.calendar} style={styles.infoIcon} resizeMode="contain" />
            <Text style={styles.infoText} numberOfLines={2}>{formatDate(event.start_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Image source={ICONS.flag} style={styles.infoIcon} resizeMode="contain" />
            <Text style={styles.infoText} numberOfLines={2}>From: {event.artist_country || 'To be announced'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Image source={ICONS.pin} style={styles.infoIcon} resizeMode="contain" />
            <Text style={styles.infoText} numberOfLines={2}>{event.venue_name || 'Venue to be announced'}{event.venue_address ? `, ${event.venue_address}` : ''}</Text>
          </View>
          {event.organizer_name ? (
            <View style={styles.infoRow}>
              <Image source={ICONS.organizer} style={styles.infoIcon} resizeMode="contain" />
              <Text style={styles.infoText} numberOfLines={1}>Organized by: {event.organizer_name}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function WishlistScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [events, setEvents] = useState([]);
  const [allConcerts, setAllConcerts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyIds, setBusyIds] = useState([]);
  const [removingAll, setRemovingAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => subscribeWishlist(setSavedIds), []);

  const loadWishlist = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [allEvents, ids, cats] = await Promise.all([
        fetchHomeConcerts(),
        fetchHomeWishlist(),
        fetchHomeCategories().catch(() => []),
      ]);
      const normalizedIds = [...new Set(ids.map(Number))];
      setSavedIds(normalizedIds);
      publishWishlistIds(normalizedIds);
      setAllConcerts(allEvents);
      setEvents(allEvents.filter((event) => normalizedIds.includes(Number(event.id))));
      setCategories(cats);
    } catch (e) {
      setError(e?.message || 'Wishlist gagal dimuat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadWishlist();
  }, [loadWishlist]));

  useEffect(() => {
    setEvents(allConcerts.filter((event) => savedIds.includes(Number(event.id))));
  }, [allConcerts, savedIds]);

  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'All Category' },
    ...categories.map((category) => ({
      value: String(category.id ?? category.category_id),
      label: category.name || category.category_name,
    })).filter((category) => category.value !== 'undefined' && category.label),
  ], [categories]);

  const selectedCategoryLabel = categoryOptions.find(
    (item) => String(item.value) === String(categoryId),
  )?.label || 'All Category';

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return events.filter((event) => {
      const date = getDate(event);
      const isPast = date ? date.getTime() < Date.now() : false;
      const tabMatch = activeTab === 'all'
        || (activeTab === 'upcoming' && !isPast)
        || (activeTab === 'past' && isPast);
      const categoryMatch = categoryId === 'all'
        || String(event.category_id ?? '') === String(categoryId);
      const searchMatch = !keyword || [
        event.name, event.artist, event.category_name,
        event.venue_name, event.organizer_name,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
      return tabMatch && categoryMatch && searchMatch;
    });
  }, [events, activeTab, categoryId, search]);

  const removeOne = useCallback(async (event) => {
    const id = Number(event.id);
    if (!Number.isFinite(id) || busyIds.includes(id)) return;
    setBusyIds((current) => [...current, id]);
    try {
      await setHomeWishlist(id, true);
      setSavedIds((current) => {
        const next = current.filter((savedId) => savedId !== id);
        publishWishlistIds(next);
        return next;
      });
      setEvents((current) => current.filter((item) => Number(item.id) !== id));
    } catch (e) {
      Alert.alert('Belum berhasil', e?.message || 'Konser gagal dihapus dari wishlist.');
    } finally {
      setBusyIds((current) => current.filter((busyId) => busyId !== id));
    }
  }, [busyIds]);

  const removeAll = useCallback(() => {
    if (!savedIds.length || removingAll) return;
    Alert.alert(
      'Remove all saved concerts?',
      'Semua konser akan dihapus dari wishlist kamu.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: async () => {
            setRemovingAll(true);
            try {
              for (const id of savedIds) {
                await setHomeWishlist(id, true);
              }
              setSavedIds([]);
              publishWishlistIds([]);
              setEvents([]);
            } catch (e) {
              Alert.alert('Sebagian belum terhapus', e?.message || 'Coba refresh wishlist.');
              await loadWishlist(true);
            } finally {
              setRemovingAll(false);
            }
          },
        },
      ],
    );
  }, [savedIds, removingAll, loadWishlist]);

  const cardGap = 11;
  const horizontalPadding = 30;
  const cardWidth = Math.max(145, (width - horizontalPadding - cardGap) / 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWishlist(true)} tintColor={C.purple} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, music lovers 👋</Text>
            <Text style={styles.headerSubtitle}>Your saved concerts for later</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        <ImageBackground
          source={require('../../assets/auth/home.jpg')}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={['rgba(11,16,32,0.22)', 'rgba(11,16,32,0.52)', 'rgba(11,16,32,0.94)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.tabs}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.value}
                  style={[styles.tab, activeTab === tab.value && styles.activeTab]}
                  onPress={() => setActiveTab(tab.value)}
                >
                  <Text style={[styles.tabText, activeTab === tab.value && styles.activeTabText]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.heroTitle}>MY WISHLIST</Text>
            <Text style={styles.heroSubtitle}>Your saved concerts and events, all in one spot.</Text>
            <View style={styles.searchBox}>
              <Search size={18} color="#FFFFFF" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search concerts, artists, or venues..."
                placeholderTextColor="#E0D9F4"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={17} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ImageBackground>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <LinearGradient colors={[C.purple, C.cyan]} style={styles.titleAccent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{filteredEvents.length} Saved Concerts</Text>
              <Text style={styles.sectionSubtitle}>Your favorite events in one place</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Dropdown
              label={categoryId}
              value={selectedCategoryLabel}
              options={categoryOptions}
              open={categoryOpen}
              onToggle={() => setCategoryOpen((value) => !value)}
              onSelect={(value) => {
                setCategoryId(String(value));
                setCategoryOpen(false);
              }}
            />
            <TouchableOpacity
              style={[styles.removeAllButton, (!savedIds.length || removingAll) && styles.disabledButton]}
              onPress={removeAll}
              disabled={!savedIds.length || removingAll}
            >
              {removingAll ? <ActivityIndicator size="small" color="#FF8298" /> : <Trash2 size={15} color="#FF8298" />}
              <Text style={styles.removeAllText}>Remove All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={C.purple} size="large" />
            <Text style={styles.stateText}>Loading your wishlist...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <Heart size={34} color={C.purple} />
            <Text style={styles.emptyTitle}>Wishlist unavailable</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadWishlist()}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredEvents.length ? (
          <View style={styles.grid}>
            {filteredEvents.map((event) => (
              <WishlistCard
                key={event.id}
                event={event}
                width={cardWidth}
                navigation={navigation}
                onRemove={removeOne}
                busy={busyIds.includes(Number(event.id))}
              />
            ))}
          </View>
        ) : (
          <View style={styles.stateBox}>
            <Heart size={38} color="#A78BFA" />
            <Text style={styles.emptyTitle}>
              {events.length ? 'No matching concerts' : 'Your wishlist is empty'}
            </Text>
            <Text style={styles.stateText}>
              {events.length
                ? 'Try changing your search, category, or tab.'
                : 'Save concerts you love and they will appear here.'}
            </Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.exploreButtonText}>Explore Concerts</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { color: C.white, fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: '#929BB7', fontSize: 10, marginTop: 4 },
  hero: {
    height: 178, borderRadius: 16, overflow: 'hidden',
    justifyContent: 'flex-end', backgroundColor: '#25204B',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
  },
  heroImage: { borderRadius: 16 },
  heroContent: { paddingHorizontal: 11, paddingVertical: 10 },
  tabs: {
    flexDirection: 'row', alignSelf: 'flex-start', flexWrap: 'nowrap',
    gap: 5, marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
    backgroundColor: 'rgba(15,18,40,0.18)',
  },
  activeTab: { backgroundColor: C.purple, borderColor: C.purple },
  tabText: { color: C.white, fontSize: 9, fontWeight: '800' },
  activeTabText: { color: C.white },
  heroTitle: {
    fontSize: 24, lineHeight: 28, fontWeight: '900',
    color: '#A78BFA', letterSpacing: 0.2,
    textShadowColor: 'rgba(34,211,238,0.4)', textShadowRadius: 10,
  },
  heroSubtitle: { color: C.white, fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 3, marginBottom: 8 },
  searchBox: {
    height: 40, borderRadius: 10, backgroundColor: 'rgba(84,86,222,0.78)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 9,
  },
  searchInput: { flex: 1, color: C.white, fontSize: 11, paddingVertical: 0 },
  sectionHeader: { marginTop: 23, marginBottom: 14, gap: 12 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleAccent: { width: 5, height: 38, borderRadius: 5 },
  sectionTitle: { color: C.white, fontSize: 20, fontWeight: '900' },
  sectionSubtitle: { color: '#929BB7', fontSize: 10, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 20 },
  dropdownWrap: { width: 145, position: 'relative', zIndex: 1 },
  dropdownWrapOpen: { zIndex: 1000, elevation: 20 },
  dropdownButton: {
    minHeight: 42, borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)', backgroundColor: '#151E36',
    paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 6,
  },
  dropdownValue: { color: C.white, fontSize: 10, fontWeight: '800', flex: 1 },
  dropdownMenu: {
    position: 'absolute', top: 47, left: 0, right: 0,
    maxHeight: 220, zIndex: 1001, elevation: 25,
    backgroundColor: '#171F3A', borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)', borderRadius: 10, overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 40, paddingHorizontal: 11, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownOptionText: { color: '#E5E7EF', fontSize: 10, fontWeight: '600' },
  dropdownOptionActive: { color: C.cyan, fontWeight: '900' },
  check: { color: C.cyan, fontWeight: '900' },
  removeAllButton: {
    minHeight: 42, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(195,4,55,0.35)',
    backgroundColor: 'rgba(195,4,55,0.10)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  removeAllText: { color: '#FF8298', fontSize: 9, fontWeight: '900' },
  disabledButton: { opacity: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  eventCard: { width: '100%', backgroundColor: '#202A4F', borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
  posterWrap: { height: 156, position: 'relative', backgroundColor: '#31245D' },
  poster: { width: '100%', height: '100%' },
  posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#242447', padding: 8 },
  fallbackBrand: { color: '#A78BFA', fontSize: 18, fontWeight: '900' },
  fallbackTag: { color: '#22D3EE', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },
  posterFallbackText: { color: C.white, fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  posterShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,22,0.12)' },
  statusBadge: { position: 'absolute', left: 10, top: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5 },
  statusText: { fontSize: 9, fontWeight: '900' },
  heartButton: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(11,17,34,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  wishlistIcon: { width: 19, height: 19 },
  priceBadge: {
    position: 'absolute', right: 10, bottom: 9, backgroundColor: 'rgba(11,17,34,0.95)',
    borderWidth: 1, borderColor: C.purple, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7,
  },
  priceText: { color: C.white, fontSize: 10, fontWeight: '900' },
  cardContent: { paddingHorizontal: 12, paddingVertical: 11 },
  cardLabel: { color: '#22D3EE', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  categoryText: { color: '#A78BFA', fontSize: 12, fontWeight: '800', marginTop: 4 },
  eventName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', lineHeight: 18, marginTop: 3, minHeight: 36 },
  description: { color: '#A9AAB4', fontSize: 10, lineHeight: 14, marginTop: 5, minHeight: 28 },
  cardDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', marginTop: 9, marginBottom: 8 },
  infoList: { gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  infoIcon: { width: 13, height: 13, marginTop: 1 },
  infoText: { color: '#D1D5E0', fontSize: 9, lineHeight: 13, flex: 1 },
  stateBox: {
    minHeight: 190, paddingHorizontal: 24, paddingVertical: 30,
    borderRadius: 13, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  stateText: { color: C.muted, fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 8 },
  emptyTitle: { color: C.white, fontSize: 15, fontWeight: '900', marginTop: 12 },
  exploreButton: { marginTop: 15, backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  exploreButtonText: { color: C.white, fontSize: 10, fontWeight: '900' },
  retryButton: { marginTop: 14, backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: C.white, fontSize: 10, fontWeight: '900' },
});
