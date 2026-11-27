import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, TextInput, Image,
  ImageBackground, TouchableOpacity, Modal, ActivityIndicator, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import {
  Search, SlidersHorizontal, MapPin, CalendarDays, ChevronRight,
  Music2, ChevronDown, Ticket, X, Bookmark, BookmarkCheck,
} from 'lucide-react-native';
import {
  fetchHomeConcerts, fetchHomeCategories, fetchHomeWishlist,
  setHomeWishlist,
} from '../../services/homeService';
import { subscribeWishlist, publishWishlistIds } from '../../services/wishlistStore';

const COLORS = {
  bg: '#0B1122', card: '#202A4F', purple: '#8B5CF6', cyan: '#22D3EE',
  primary: '#5456DE', accent: '#C30437', text: '#FFFFFF', muted: '#A9AAB4',
};
const ALL_CITIES = 'All Indonesia';
const CITIES = ['All Indonesia', 'Jakarta', 'Bandung', 'Surabaya', 'Bali', 'Yogyakarta', 'Medan', 'Semarang', 'Makassar'];
const STATUS = {
  coming_soon: { label: 'Coming Soon', color: '#F5B84E', bg: '#2E2723' },
  on_sale: { label: 'On Sale', color: '#26ADA0', bg: '#152B32' },
  sold_out: { label: 'Sold Out', color: '#FF8298', bg: '#3A202B' },
  ended: { label: 'Ended', color: '#AAB2C5', bg: '#252A3A' },
  sales_closed: { label: 'Sales Closed', color: '#AAB2C5', bg: '#252A3A' },
  not_available: { label: 'Sales Closed', color: '#AAB2C5', bg: '#252A3A' },
  ongoing: { label: 'LIVE NOW', color: '#26ADA0', bg: '#152B32' },
  completed: { label: 'Completed', color: '#AAB2C5', bg: '#252A3A' },
};
const DEFAULT_CATEGORY_ICON = require('../../assets/categories/category (1).png');
const CATEGORY_ICON_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api').replace(/\/api\/?$/, '').replace(/\/$/, '');
function getCategoryIcon(category) {
  const savedIcon = category?.icon ? String(category.icon) : null;
  if (!savedIcon) return DEFAULT_CATEGORY_ICON;
  const uri = /^https?:\/\//i.test(savedIcon) ? savedIcon : `${CATEGORY_ICON_BASE}${savedIcon.startsWith('/') ? '' : '/'}${savedIcon}`;
  return { uri };
}

const ICONS = {
  calendar: require('../../assets/icons/calendar (1).png'),
  flag: require('../../assets/icons/flag.png'),
  pin: require('../../assets/icons/pin.png'),
  organizer: require('../../assets/icons/circus.png'),
  wish: require('../../assets/icons/wishlist.png'),
  wishActive: require('../../assets/icons/wishlist(1).png'),
};

function formatPrice(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'Price unavailable';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
}
function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }).format(date).replace(',', ' ·');
}
function statusFor(concert) {
  const life = String(concert.lifecycle_status || '').toLowerCase();
  if (life === 'ongoing') return STATUS.ongoing;
  if (life === 'completed') return STATUS.completed;
  return STATUS[String(concert.sales_status || '').toLowerCase()] || STATUS.sales_closed;
}
function isInCity(concert, city) {
  const place = `${concert.venue_name || ''} ${concert.venue_address || ''}`.toLowerCase();
  if (city === ALL_CITIES) return true;
  const aliases = city === 'Bali' ? ['bali', 'denpasar', 'badung'] : city === 'Yogyakarta' ? ['yogyakarta', 'jogja'] : [city.toLowerCase()];
  return aliases.some((word) => place.includes(word));
}
function SectionHeading({ title, action, onAction, extra }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionTitleWrap}>
        <LinearGradient colors={[COLORS.purple, COLORS.cyan]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {extra || (action ? <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity> : null)}
    </View>
  );
}
function InfoRow({ icon, children }) {
  return <View style={styles.infoRow}><Image source={icon} style={styles.infoIcon} resizeMode="contain"/><Text style={styles.infoText} numberOfLines={2}>{children}</Text></View>;
}
function ConcertCard({ item, index, label, navigation, wishlisted, onWishlist }) {
  const status = statusFor(item);
  const artistCountry = item.artist_country || 'To be announced';
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.concertCard} onPress={() => navigation.navigate('ConcertDetail', { concert: item })}>
      <View style={styles.posterWrap}>
        {item.poster_url ? <ImageBackground source={{ uri: item.poster_url }} style={styles.poster} imageStyle={styles.posterImage} /> : <View style={styles.posterFallback}><Text style={styles.fallbackBrand}>LYNORA</Text><Text style={styles.fallbackName}>{item.name}</Text><Text style={styles.fallbackTag}>LIVE EXPERIENCE</Text></View>}
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
        <TouchableOpacity style={styles.wishlistButton} onPress={() => onWishlist(item)} hitSlop={8}>
          <Image source={wishlisted ? ICONS.wishActive : ICONS.wish} style={styles.wishlistIcon} resizeMode="contain" />
        </TouchableOpacity>
        <View style={styles.priceBadge}><Text style={styles.priceText}>{formatPrice(item.price)}</Text></View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>{label} #{index + 1}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category_name || 'Live Concert'}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>{item.description || (item.venue_name ? `Enjoy an unforgettable live concert experience at ${item.venue_name}.` : 'Enjoy an unforgettable live concert experience.')}</Text>
        <View style={styles.cardDivider} />
        <View style={styles.infoList}>
          <InfoRow icon={ICONS.calendar}>{formatDate(item.start_date)}</InfoRow>
          <InfoRow icon={ICONS.flag}>From: {artistCountry}</InfoRow>
          <InfoRow icon={ICONS.pin}>{item.venue_name || 'Venue to be announced'}{item.venue_address ? `, ${item.venue_address}` : ''}</InfoRow>
          {item.organizer_name ? <InfoRow icon={ICONS.organizer}>Organized by: {item.organizer_name}</InfoRow> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
function HorizontalConcertSection({ title, items, label, navigation, wishlistIds, onWishlist, emptyText, extra, onSeeAll }) {
  return (
    <View style={styles.section}>
      <SectionHeading title={title} extra={extra} action="See All" onAction={onSeeAll}/>
      {items.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
        {items.slice(0, 8).map((item, index) => <ConcertCard key={`${label}-${item.id}`} item={item} index={index} label={label} navigation={navigation} wishlisted={wishlistIds.includes(Number(item.id))} onWishlist={onWishlist} />)}
      </ScrollView> : <View style={styles.emptyBox}><Text style={styles.emptyText}>{emptyText || 'No concerts available right now.'}</Text></View>}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [concerts, setConcerts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [city, setCity] = useState(ALL_CITIES);
  const [cityModal, setCityModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setLoadError('');
    try {
      const [eventRows, categoryRows] = await Promise.all([fetchHomeConcerts(), fetchHomeCategories().catch(() => [])]);
      setConcerts(eventRows);
      setCategories(categoryRows);
      try { const ids = await fetchHomeWishlist(); setWishlistIds(ids); publishWishlistIds(ids); } catch (error) { console.warn('[LYNORA Home] Wishlist unavailable:', error.message); }
    } catch (error) {
      setLoadError(error?.message || 'Unable to load concerts.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => subscribeWishlist(setWishlistIds), []);

  const filteredConcerts = useMemo(() => concerts.filter((item) => {
    const keyword = searchText.trim().toLowerCase();
    const matchesSearch = !keyword || [item.name, item.artist, item.category_name, item.venue_name, item.venue_address, item.organizer_name].some((value) => String(value || '').toLowerCase().includes(keyword));
    const matchesGenre = selectedGenre === 'All' || String(item.category_name || '').toLowerCase() === selectedGenre.toLowerCase();
    return matchesSearch && matchesGenre;
  }), [concerts, searchText, selectedGenre]);

  const upcoming = useMemo(() => filteredConcerts.filter((item) => item.sales_status !== 'ended').sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).slice(0, 8), [filteredConcerts]);
  const upcomingIds = useMemo(() => new Set(upcoming.map((item) => item.id)), [upcoming]);
  const recommended = useMemo(() => {
    const rest = filteredConcerts.filter((item) => !upcomingIds.has(item.id));
    const pool = rest.length ? rest : filteredConcerts;
    return [...pool.filter((item) => item.sales_status === 'on_sale'), ...pool.filter((item) => item.sales_status !== 'on_sale')].slice(0, 8);
  }, [filteredConcerts, upcomingIds]);
  const nearYou = useMemo(() => filteredConcerts.filter((item) => isInCity(item, city)), [filteredConcerts, city]);
  const trending = useMemo(() => filteredConcerts.filter((item) => item.sales_status === 'on_sale').slice(0, 8), [filteredConcerts]);
  const heroItems = useMemo(() => {
    const ordered = [...upcoming, ...recommended, ...trending];
    const seen = new Set();
    return ordered.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return Boolean(item.hero_image_url || item.poster_url || item.banner_url || item.image_url);
    }).slice(0, 8);
  }, [upcoming, recommended, trending]);
  const hero = heroItems.length ? heroItems[heroIndex % heroItems.length] : (upcoming[0] || recommended[0] || trending[0]);

  useEffect(() => {
    if (heroItems.length < 2) { setHeroIndex(0); return undefined; }
    const timer = setInterval(() => setHeroIndex((current) => (current + 1) % heroItems.length), 4500);
    return () => clearInterval(timer);
  }, [heroItems]);

  const handleWishlist = useCallback(async (item) => {
    const id = Number(item.id); const exists = wishlistIds.includes(id);
    try {
      await setHomeWishlist(id, exists);
      setWishlistIds((current) => {
        const next = exists ? current.filter((value) => value !== id) : [...current, id];
        publishWishlistIds(next);
        return next;
      });
    } catch (error) { console.warn('[LYNORA Home] Wishlist update failed:', error.message); }
  }, [wishlistIds]);

  const goExplore = () => navigation.navigate('Explore', { search: searchText, genre: selectedGenre === 'All' ? undefined : selectedGenre });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} translucent={false}/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#A78BFA" colors={['#8B5CF6']}/> }>
        <View style={styles.header}>
          <View style={styles.brandWrap}><View style={styles.logoIcon}><Music2 size={17} color="#FFFFFF"/></View><View><Text style={styles.logo}>LYNORA</Text><Text style={styles.tagline}>Hello, Music Lovers. Enjoy the moment.</Text></View></View>
          <HeaderActions navigation={navigation}/>
        </View>
        <View style={styles.searchContainer}><Search size={16} color="#858DA5"/><TextInput placeholder="Search concerts, artists, or venues..." placeholderTextColor="#858DA5" style={styles.searchInput} value={searchText} onChangeText={setSearchText} returnKeyType="search" onSubmitEditing={goExplore}/><TouchableOpacity onPress={goExplore}><SlidersHorizontal size={16} color="#A9B0C5"/></TouchableOpacity></View>
        {hero ? (
          <View style={[styles.heroWrap, { width: screenWidth - 30 }]}>
            <TouchableOpacity activeOpacity={0.92} style={StyleSheet.absoluteFill} onPress={() => navigation.navigate('ConcertDetail', { concert: hero })}>
              {hero.hero_image_url || hero.poster_url || hero.banner_url || hero.image_url ? (
                <ImageBackground
                  key={String(hero.id)}
                  source={{ uri: hero.hero_image_url || hero.poster_url || hero.banner_url || hero.image_url }}
                  style={styles.heroImage}
                  imageStyle={styles.heroImageStyle}
                  onError={(event) => console.warn('[LYNORA Hero] Image failed:', event.nativeEvent?.error)}
                >
                  <LinearGradient colors={['rgba(7,10,24,0.28)', 'rgba(7,10,24,0.62)', 'rgba(7,10,24,0.96)']} locations={[0, 0.48, 1]} style={styles.heroOverlay}>
                    <View style={styles.heroTop}>
                      <Text style={styles.heroBadge}>{statusFor(hero).label.toUpperCase()}</Text>
                      <Text style={styles.heroPrice}>{formatPrice(hero.price)}</Text>
                    </View>
                    <View style={styles.heroBottomContent}>
                      <Text style={styles.heroEyebrow}>FEATURED CONCERT</Text>
                      <Text style={styles.heroTitle} numberOfLines={2}>{hero.name}</Text>
                      <View style={styles.heroMeta}>
                        <CalendarDays size={13} color="#B9B2FF"/>
                        <Text style={styles.heroMetaText} numberOfLines={1}>{formatDate(hero.start_date)}</Text>
                      </View>
                      <View style={styles.heroMeta}>
                        <MapPin size={13} color="#B9B2FF"/>
                        <Text style={styles.heroMetaText} numberOfLines={2}>{hero.venue_name || 'Venue to be announced'}{hero.venue_address ? `, ${hero.venue_address}` : ''}</Text>
                      </View>
                      <View style={styles.heroActions}>
                        <View style={styles.heroCta}><Ticket size={15} color="#FFFFFF"/><Text style={styles.heroCtaText}>View Concert & Tickets</Text></View>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={wishlistIds.includes(Number(hero.id)) ? 'Remove from wishlist' : 'Save to wishlist'}
                          activeOpacity={0.8}
                          style={[styles.heroSaveButton, wishlistIds.includes(Number(hero.id)) && styles.heroSaveButtonActive]}
                          onPress={() => handleWishlist(hero)}
                        >
                          {wishlistIds.includes(Number(hero.id)) ? <BookmarkCheck size={20} color="#FFFFFF"/> : <Bookmark size={20} color="#FFFFFF"/>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              ) : (
                <LinearGradient colors={['#202A4F', '#0B1122']} style={styles.heroOverlay}>
                  <View style={styles.heroTop}><Text style={styles.heroBadge}>{statusFor(hero).label.toUpperCase()}</Text><Text style={styles.heroPrice}>{formatPrice(hero.price)}</Text></View>
                  <View style={styles.heroBottomContent}><Text style={styles.heroEyebrow}>FEATURED CONCERT</Text><Text style={styles.heroTitle}>{hero.name}</Text><Text style={styles.heroMetaText}>Poster belum tersedia</Text><View style={styles.heroActions}><View style={styles.heroCta}><Ticket size={15} color="#FFFFFF"/><Text style={styles.heroCtaText}>View Concert & Tickets</Text></View><TouchableOpacity style={styles.heroSaveButton} onPress={() => handleWishlist(hero)}><Bookmark size={20} color="#FFFFFF"/></TouchableOpacity></View></View>
                </LinearGradient>
              )}
            </TouchableOpacity>
            {heroItems.length > 1 ? (
              <View pointerEvents="box-none" style={styles.heroDotsWrap}>
                {heroItems.map((item, index) => <TouchableOpacity key={item.id} onPress={() => setHeroIndex(index)} style={[styles.heroDot, index === heroIndex % heroItems.length && styles.heroDotActive]}/>) }
              </View>
            ) : null}
          </View>
        ) : null}

        {loading ? <View style={styles.loading}><ActivityIndicator color="#A78BFA"/><Text style={styles.loadingText}>Loading concerts...</Text></View> : loadError ? <View style={styles.errorBox}><Text style={styles.errorText}>{loadError}</Text><TouchableOpacity onPress={() => loadData()} style={styles.retryButton}><Text style={styles.retryText}>Try Again</Text></TouchableOpacity></View> : <>
          <HorizontalConcertSection title="Upcoming Concert" items={upcoming} label="Featured" navigation={navigation} wishlistIds={wishlistIds} onWishlist={handleWishlist} onSeeAll={goExplore}/>
          <View style={styles.section}>
            <SectionHeading title="Browse by Genre"/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreList}>
              {[{ name: 'All', icon: DEFAULT_CATEGORY_ICON }, ...categories.map((item) => ({ name: item.name, icon: getCategoryIcon(item) }))].map((genre) => {
                const active = selectedGenre === genre.name;
                const count = concerts.filter((item) => String(item.category_name || '').toLowerCase() === genre.name.toLowerCase()).length;
                return <TouchableOpacity key={genre.name} style={[styles.genreCard, active && styles.genreCardActive]} onPress={() => setSelectedGenre(genre.name)} activeOpacity={0.85}><Image source={genre.icon} style={styles.genreIcon} resizeMode="contain"/><Text style={[styles.genreName, active && styles.genreNameActive]} numberOfLines={1}>{genre.name}</Text><Text style={[styles.genreCount, active && styles.genreCountActive]}>{count} Events</Text></TouchableOpacity>;
              })}
            </ScrollView>
          </View>
          <HorizontalConcertSection title="Recommended For You" items={recommended} label="Recommended" navigation={navigation} wishlistIds={wishlistIds} onWishlist={handleWishlist} onSeeAll={goExplore}/>
          <HorizontalConcertSection title="Near You" items={nearYou} label="Nearby" navigation={navigation} wishlistIds={wishlistIds} onWishlist={handleWishlist} onSeeAll={goExplore} extra={<TouchableOpacity style={styles.cityPicker} onPress={() => setCityModal(true)}><MapPin size={13} color="#FFFFFF"/><Text style={styles.cityText}>{city}</Text><ChevronDown size={13} color="#FFFFFF"/></TouchableOpacity>} emptyText={`No concerts in ${city === ALL_CITIES ? 'Indonesia' : city} right now.`}/>
          <HorizontalConcertSection title="Trending Now" items={trending} label="Trending" navigation={navigation} wishlistIds={wishlistIds} onWishlist={handleWishlist} onSeeAll={goExplore}/>
        </>}
        <View style={{ height: 28 }}/>
      </ScrollView>
      <Modal visible={cityModal} transparent animationType="fade" onRequestClose={() => setCityModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCityModal(false)}>
          <View style={styles.cityModal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Choose Location</Text><TouchableOpacity onPress={() => setCityModal(false)}><X size={20} color="#FFFFFF"/></TouchableOpacity></View>
            <ScrollView>{CITIES.map((name) => <TouchableOpacity key={name} style={styles.cityOption} onPress={() => { setCity(name); setCityModal(false); }}><Text style={[styles.cityOptionText, city === name && styles.cityOptionActive]}>{name}</Text>{city === name ? <Text style={styles.checkMark}>✓</Text> : null}</TouchableOpacity>)}</ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 9 }, logoIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#6655ED', alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 }, tagline: { color: '#A8B0C5', fontSize: 9, marginTop: 2 },
  searchContainer: { height: 42, marginHorizontal: 15, backgroundColor: '#171E32', borderRadius: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#242C45' },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 12, paddingVertical: 0 },
  scrollContent: { paddingBottom: 18 }, heroWrap: { height: 205, marginHorizontal: 15, marginTop: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#202A4F', borderWidth: 1, borderColor: 'rgba(139,92,246,0.45)', alignSelf: 'center' }, heroImage: { flex: 1 }, heroImageStyle: { resizeMode: 'cover' }, heroOverlay: { flex: 1, padding: 14, justifyContent: 'space-between', backgroundColor: 'rgba(7,10,24,0.08)' }, heroBottomContent: { paddingBottom: 15 }, heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11 }, heroSaveButton: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,17,34,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)' }, heroSaveButtonActive: { backgroundColor: COLORS.primary, borderColor: '#A78BFA' }, heroDotsWrap: { position: 'absolute', bottom: 9, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }, heroDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.30)' }, heroDotActive: { width: 20, backgroundColor: 'rgba(255,255,255,0.72)' }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroBadge: { backgroundColor: COLORS.accent, color: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, fontSize: 9, fontWeight: '900' }, heroPrice: { backgroundColor: 'rgba(11,17,34,0.85)', color: '#FFFFFF', padding: 7, borderRadius: 6, fontSize: 10, fontWeight: '800' }, heroEyebrow: { color: '#B7A9FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, heroTitle: { color: '#FFFFFF', fontSize: 21, lineHeight: 25, fontWeight: '900', marginTop: 5 }, heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 }, heroMetaText: { color: '#E2E5F0', fontSize: 9, flexShrink: 1 }, heroCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 9 }, heroCtaText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  section: { marginTop: 24, paddingTop: 2 }, sectionHeading: { marginHorizontal: 16, marginBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }, sectionBar: { width: 4, height: 27, borderRadius: 4 }, sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', flexShrink: 1 }, sectionAction: { color: '#E54869', fontSize: 11, fontWeight: '800' },
  horizontalCards: { paddingHorizontal: 15, paddingBottom: 5, gap: 12 }, concertCard: { width: 278, overflow: 'hidden', borderRadius: 13, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)', backgroundColor: COLORS.card }, posterWrap: { height: 156, position: 'relative', backgroundColor: '#31245D' }, poster: { width: '100%', height: '100%' }, posterImage: { resizeMode: 'cover' }, posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#242447', padding: 15 }, fallbackBrand: { color: '#A78BFA', fontSize: 24, fontWeight: '900' }, fallbackName: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center' }, fallbackTag: { color: COLORS.cyan, fontSize: 8, letterSpacing: 2, marginTop: 5 },
  statusBadge: { position: 'absolute', left: 10, top: 10, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5 }, statusText: { fontSize: 9, fontWeight: '900' }, wishlistButton: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(11,17,34,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }, wishlistIcon: { width: 19, height: 19 }, priceBadge: { position: 'absolute', right: 10, bottom: 9, backgroundColor: 'rgba(11,17,34,0.95)', borderWidth: 1, borderColor: COLORS.purple, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 }, priceText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  cardBody: { paddingHorizontal: 12, paddingVertical: 11 }, cardLabel: { color: COLORS.cyan, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }, cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', lineHeight: 18, marginTop: 3 }, cardCategory: { color: '#A78BFA', fontSize: 12, fontWeight: '800', marginTop: 4 }, cardDescription: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginTop: 5, minHeight: 28 }, cardDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', marginTop: 9, marginBottom: 8 }, infoList: { gap: 6 }, infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, infoIcon: { width: 13, height: 13, marginTop: 1 }, infoText: { color: '#D1D5E0', fontSize: 9, lineHeight: 13, flex: 1 }, cardFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', marginTop: 10, paddingTop: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardFooterText: { color: '#26ADA0', fontSize: 9, fontWeight: '800' }, detailLink: { flexDirection: 'row', alignItems: 'center', gap: 2 }, detailLinkText: { color: '#22D3EE', fontSize: 10, fontWeight: '900' },
  genreList: { paddingHorizontal: 15, gap: 9, paddingBottom: 4 }, genreCard: { width: 102, minHeight: 96, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#161624', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 9 }, genreCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, genreIcon: { width: 27, height: 27, marginBottom: 5 }, genreName: { color: '#D1D5E0', fontSize: 11, fontWeight: '900' }, genreNameActive: { color: '#FFFFFF' }, genreCount: { color: '#8F98AE', fontSize: 8, marginTop: 3 }, genreCountActive: { color: 'rgba(255,255,255,0.8)' },
  cityPicker: { maxWidth: 155, minHeight: 34, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(139,92,246,0.6)', backgroundColor: '#1B2342', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, cityText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', flexShrink: 1 }, emptyBox: { marginHorizontal: 15, paddingVertical: 23, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#151E36', alignItems: 'center' }, emptyText: { color: '#9CA3B8', fontSize: 11, textAlign: 'center' }, loading: { paddingVertical: 40, alignItems: 'center', gap: 10 }, loadingText: { color: '#A9AAB4', fontSize: 11 }, errorBox: { margin: 16, padding: 18, backgroundColor: '#251B31', borderRadius: 12 }, errorText: { color: '#FF8298', fontSize: 12 }, retryButton: { marginTop: 12, backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, alignSelf: 'flex-start' }, retryText: { color: '#FFFFFF', fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 25 }, cityModal: { maxHeight: '70%', backgroundColor: '#171B31', borderRadius: 17, borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)', padding: 15 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }, modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, cityOption: { paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }, cityOptionText: { color: '#D1D5E0', fontSize: 13 }, cityOptionActive: { color: '#A78BFA', fontWeight: '900' }, checkMark: { color: COLORS.cyan, fontWeight: '900' },
});
