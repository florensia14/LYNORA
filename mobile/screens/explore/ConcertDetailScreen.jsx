import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, StatusBar, ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, MapPin, CalendarDays, Ticket, Music2, Users,
  Clock3, ChevronRight, ShieldCheck, Info, ExternalLink, ChevronDown,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';
import { fetchConcertById } from '../../services/concertService';
import { API_BASE_URL } from '../../services/api';
import { fetchHomeWishlist, setHomeWishlist, fetchHomeConcerts } from '../../services/homeService';
import {
  getWishlistIds, publishWishlistIds, subscribeWishlist,
} from '../../services/wishlistStore';

const C = {
  bg: '#0B1122', panel: '#151E36', card: '#202A4F',
  purple: '#8B5CF6', cyan: '#22D3EE', primary: '#5456DE',
  white: '#FFFFFF', muted: '#A9B0C5', border: 'rgba(139,92,246,0.32)',
  green: '#26ADA0', yellow: '#F5B84E', red: '#FF8298',
};

const ICONS = {
  wish: require('../../assets/icons/wishlist.png'),
  wishActive: require('../../assets/icons/wishlist(1).png'),
  calendar: require('../../assets/icons/calendar (1).png'),
  location: require('../../assets/icons/location (1).png'),
  price: require('../../assets/icons/ticket (1).png'),
  organizer: require('../../assets/icons/spotlight.png'),
};

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Price unavailable';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n);
}
function dateLabel(value) {
  if (!value) return 'Date to be announced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }).format(date) + ' WIB';
}
function lifecycle(event) {
  const life = String(event.lifecycle_status || '').toLowerCase();
  const sales = String(event.sales_status || '').toLowerCase();
  if (life === 'ongoing') return { label: 'LIVE NOW', color: C.green, bg: '#152B32' };
  if (life === 'completed' || sales === 'ended') return { label: 'COMPLETED', color: '#B8C0D4', bg: '#292F42' };
  if (sales === 'coming_soon') return { label: 'COMING SOON', color: C.yellow, bg: '#2E2723' };
  if (sales === 'sold_out') return { label: 'SOLD OUT', color: C.red, bg: '#3A202B' };
  if (sales === 'sales_closed' || sales === 'not_available') return { label: 'SALES CLOSED', color: '#B8C0D4', bg: '#292F42' };
  return { label: 'ON SALE', color: C.green, bg: '#152B32' };
}
function SectionHeading({ title, subtitle, right }) {
  return (
    <View style={S.sectionHead}>
      <View style={S.sectionHeadLeft}>
        <LinearGradient colors={[C.purple, C.cyan]} style={S.sectionBar} />
        <View style={{ flex: 1 }}>
          <Text style={S.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={S.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}
function Panel({ children, style }) {
  return <View style={[S.panel, style]}>{children}</View>;
}
function InfoRow({ icon, label, value }) {
  return (
    <View style={S.infoRow}>
      <View style={S.infoIconWrap}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={S.infoLabel}>{label}</Text>
        <Text style={S.infoValue}>{value || 'To be announced'}</Text>
      </View>
    </View>
  );
}


function resolveImageUri(value) {
  if (!value) return null;

  const raw =
    typeof value === 'string'
      ? value
      : value.url || value.uri || value.path;

  if (!raw || typeof raw !== 'string') return null;

  let uri = raw.trim();
  if (!uri) return null;

  const serverOrigin = API_BASE_URL.replace(/\/api\/?$/i, '');

  if (uri.startsWith('//')) {
    uri = `https:${uri}`;
  }

  // Handle localhost URLs from backend uploads
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(uri)) {
    const pathname = uri.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
      ''
    );

    return `${serverOrigin}${pathname}`;
  }

  // Absolute URL
  if (/^https?:\/\//i.test(uri)) {
    return uri;
  }

  // Relative URL
  if (uri.startsWith('/')) {
    return `${serverOrigin}${uri}`;
  }

  if (uri.startsWith('uploads/') || uri.startsWith('storage/')) {
    return `${serverOrigin}/${uri}`;
  }

  return null;
}


function PosterImage({ uri, style, resizeMode = 'cover' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [uri]);
  if (!uri || failed) {
    return (
      <View style={[style, S.posterImageFallback]}>
        <Music2 size={28} color={C.purple} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
      fadeDuration={150}
    />
  );
}

export default function ConcertDetailScreen({ navigation, route }) {
  const routeConcert = route?.params?.concert || {};
  const eventId = Number(route?.params?.eventId || routeConcert.id);
  const [concert, setConcert] = useState(routeConcert);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [wishlistIds, setWishlistIds] = useState(getWishlistIds());
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [similarConcerts, setSimilarConcerts] = useState([]);
  const [openFaq, setOpenFaq] = useState(1);
  const [mapCoordinate, setMapCoordinate] = useState(null);

  const loadDetail = useCallback(async (refresh = false) => {
    if (!Number.isFinite(eventId) || eventId <= 0) {
      setLoadError('ID konser tidak valid.');
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setLoadError('');
    try {
      const detail = await fetchConcertById(eventId);
      // Keep the exact poster passed from the tapped Explore/Home card.
      // Some detail API responses omit poster fields, which previously made
      // the image disappear intermittently after the fetch completed.
      const cardPoster = routeConcert.hero_image_url || routeConcert.banner_url
        || routeConcert.poster_url || routeConcert.poster_image_url
        || routeConcert.event_poster || routeConcert.image_url
        || routeConcert.poster?.url || routeConcert.poster
        || routeConcert.image?.url || routeConcert.image;
      const detailPoster = detail.hero_image_url || detail.banner_url
        || detail.poster_url || detail.poster_image_url
        || detail.event_poster || detail.image_url
        || detail.poster?.url || detail.poster
        || detail.image?.url || detail.image;
      setConcert({
        ...routeConcert,
        ...detail,
        poster_url: detailPoster || cardPoster,
        hero_image_url: detail.hero_image_url || routeConcert.hero_image_url,
        banner_url: detail.banner_url || routeConcert.banner_url,
        image: detailPoster || cardPoster,
      });
      setSelectedTicketId((current) => {
        const stillExists = detail.ticket_categories?.some((ticket) => Number(ticket.id) === Number(current));
        return stillExists ? current : (detail.ticket_categories?.[0]?.id ?? null);
      });
    } catch (error) {
      setLoadError(error?.message || 'Detail konser gagal dimuat dari server.');
      // Keep the concert summary passed from Home/Explore visible if detail endpoint is unavailable.
      if (!routeConcert?.id) setConcert(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, routeConcert?.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  useEffect(() => subscribeWishlist(setWishlistIds), []);

  useEffect(() => {
    let active = true;
    fetchHomeConcerts().then((rows) => {
      if (active) setSimilarConcerts(rows.filter((item) => Number(item.id) !== Number(eventId)).slice(0, 10));
    }).catch((error) => console.warn('[LYNORA Detail] Similar concerts unavailable:', error?.message || error));
    return () => { active = false; };
  }, [eventId]);

  useEffect(() => {
    let active = true;
    fetchHomeWishlist()
      .then((ids) => { if (active) publishWishlistIds(ids); })
      .catch((error) => console.warn('[LYNORA Detail] Wishlist sync failed:', error?.message || error));
    return () => { active = false; };
  }, []);

  const saved = wishlistIds.includes(Number(concert?.id));
  const tickets = useMemo(
    () => Array.isArray(concert?.ticket_categories) ? concert.ticket_categories : [],
    [concert],
  );
  const selectedTicket = tickets.find((item) => Number(item.id) === Number(selectedTicketId)) || tickets[0];
  const status = concert ? lifecycle(concert) : null;
  const salesStatus = String(concert?.sales_status || '').toLowerCase();
  const eventEnded = status?.label === 'COMPLETED';
  const canBuy = Boolean(
    selectedTicket && Number(selectedTicket.remaining ?? 0) > 0
    && !eventEnded && salesStatus === 'on_sale'
  );

  const toggleWishlist = async () => {
    if (!concert?.id || wishlistBusy) return;
    const id = Number(concert.id);
    const wasSaved = getWishlistIds().includes(id);
    setWishlistBusy(true);
    try {
      await setHomeWishlist(id, wasSaved);
      const current = getWishlistIds();
      publishWishlistIds(wasSaved
        ? current.filter((value) => value !== id)
        : [...current, id]);
    } catch (error) {
      Alert.alert('Wishlist belum diperbarui', error?.message || 'Coba lagi sebentar.');
    } finally {
      setWishlistBusy(false);
    }
  };

  const openMaps = () => {
    const query = concert?.venue_address || concert?.venue_name || concert?.location;
    if (!query) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`)
      .catch(() => Alert.alert('Tidak dapat membuka peta', 'Coba buka lokasi melalui aplikasi Maps.'));
  };

  const bookTicket = () => {
    if (!selectedTicket) {
      Alert.alert('Tiket belum tersedia', 'Kategori tiket belum dipublikasikan oleh organizer.');
      return;
    }
    if (!canBuy) {
      Alert.alert('Penjualan belum tersedia', 'Tiket konser ini belum dapat dibeli saat ini.');
      return;
    }
    const mappedConcert = {
      ...concert,
      title: concert.name || concert.title,
      image: concert.poster_url || concert.image,
      category: concert.category_name || concert.category,
      date: concert.start_date || concert.date,
      location: [concert.venue_name, concert.venue_address].filter(Boolean).join(', ') || concert.location,
    };
    navigation.navigate('Checkout', {
      concert: mappedConcert,
      ticket: selectedTicket,
      quantity: 1,
    });
  };

  if (loading && !concert?.id) {
    return (
      <View style={S.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={false} />
        <View style={S.loadingWrap}>
          <ActivityIndicator size="large" color={C.purple} />
          <Text style={S.loadingText}>Memuat detail konser...</Text>
        </View>
      </View>
    );
  }

  if (!concert?.id) {
    return (
      <View style={S.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={false} />
        <View style={S.errorWrap}>
          <Info size={34} color={C.yellow} />
          <Text style={S.errorTitle}>Detail konser tidak ditemukan</Text>
          <Text style={S.errorText}>{loadError || 'Konser mungkin sudah tidak tersedia.'}</Text>
          <TouchableOpacity style={S.primaryButton} onPress={() => loadDetail(true)}>
            <Text style={S.primaryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.backTextButton}>
            <Text style={S.backText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const poster = resolveImageUri(concert.hero_image_url || concert.banner_url || concert.poster_url
    || concert.poster_image_url || concert.event_poster || concert.image_url
    || concert.poster?.url || concert.poster || concert.image?.url || concert.image);
  const heroImageSource = poster;
  const latitude = Number(concert.latitude ?? concert.venue_latitude ?? concert.lat ?? concert.venue?.latitude);
  const longitude = Number(concert.longitude ?? concert.venue_longitude ?? concert.lng ?? concert.lon ?? concert.venue?.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const mapAddress = [concert.venue_name || concert.venue?.name, concert.venue_address || concert.venue?.address || concert.location].filter(Boolean).join(', ');

  useEffect(() => {
    let active = true;
    if (hasCoordinates) {
      setMapCoordinate({ latitude, longitude });
      return () => { active = false; };
    }
    setMapCoordinate(null);
    if (!mapAddress) return () => { active = false; };
    const lookup = async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(mapAddress)}`, { headers: { Accept: 'application/json' } });
        const results = await response.json();
        if (!active || !Array.isArray(results) || !results[0]) return;
        const lat = Number(results[0].lat);
        const lon = Number(results[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) setMapCoordinate({ latitude: lat, longitude: lon });
      } catch (error) {
        console.warn('[LYNORA Detail] Venue geocoding failed:', error?.message || error);
      }
    };
    lookup();
    return () => { active = false; };
  }, [hasCoordinates, latitude, longitude, mapAddress]);
  const name = concert.name || concert.title || 'Concert';
  const category = concert.category_name || concert.category || 'Live Concert';
  const venue = concert.venue_name || concert.location || 'Venue to be announced';
  const venueAddress = concert.venue_address || '';
  const artists = Array.isArray(concert.artists) ? concert.artists : [];
  const schedule = Array.isArray(concert.schedule) ? concert.schedule : [];

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={false} />
      <View style={S.topBar}>
        <TouchableOpacity style={S.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={20} color={C.white} />
        </TouchableOpacity>
        <View style={S.topTitleWrap}>
          <Text style={S.topTitle}>Concert Details</Text>
          <Text style={S.topSubtitle}>Discover your next live experience</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDetail(true)} tintColor={C.purple} colors={[C.purple]} />}
      >
        {!!loadError && (
          <View style={S.warningBox}>
            <Info size={15} color={C.yellow} />
            <Text style={S.warningText}>{loadError} Menampilkan ringkasan konser dari halaman sebelumnya.</Text>
          </View>
        )}

        <View style={S.heroWrap}>
          {poster ? (
            <View style={S.hero}>
              <PosterImage uri={heroImageSource} style={StyleSheet.absoluteFillObject} />
              <LinearGradient colors={['rgba(7,12,29,0.08)', 'rgba(7,12,29,0.58)', 'rgba(7,12,29,0.98)']} style={S.heroShade}>
                <View style={S.heroTop}>
                  <View style={[S.statusBadge, { backgroundColor: status.bg }]}>
                    <View style={[S.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[S.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <Text style={S.categoryBadge}>{category}</Text>
                </View>
                <View style={S.heroBottom}>
                  <Text style={S.heroEyebrow}>LYNORA LIVE EXPERIENCE</Text>
                  <Text style={S.heroTitle} numberOfLines={3}>{name}</Text>
                  <View style={S.heroMeta}>
                    <CalendarDays size={14} color={C.cyan} />
                    <Text style={S.heroMetaText} numberOfLines={2}>{dateLabel(concert.start_date || concert.date)}</Text>
                  </View>
                  <View style={S.heroMeta}>
                    <MapPin size={14} color={C.cyan} />
                    <Text style={S.heroMetaText} numberOfLines={2}>{venue}{venueAddress ? `, ${venueAddress}` : ''}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <LinearGradient colors={['#30205B', '#202A4F', C.bg]} style={[S.hero, S.heroFallback]}>
              <View style={S.heroTop}>
                <Text style={S.categoryBadge}>{category}</Text>
                <View style={[S.statusBadge, { backgroundColor: status.bg }]}><Text style={[S.statusText, { color: status.color }]}>{status.label}</Text></View>
              </View>
              <Music2 size={42} color="#B9A0FF" />
              <Text style={S.heroTitle}>{name}</Text>
              <Text style={S.heroMetaText}>{dateLabel(concert.start_date || concert.date)}</Text>
            </LinearGradient>
          )}
          <TouchableOpacity
            style={S.heroWishlist}
            onPress={toggleWishlist}
            disabled={wishlistBusy}
            activeOpacity={0.8}
            accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {wishlistBusy ? <ActivityIndicator size="small" color={C.white} /> : (
              <Image source={saved ? ICONS.wishActive : ICONS.wish} style={S.wishlistIcon} resizeMode="contain" />
            )}
          </TouchableOpacity>
        </View>

        <View style={S.quickGrid}>
          <View style={S.quickItem}>
            <Image source={ICONS.calendar} style={S.quickImageIcon} />
            <Text style={S.quickLabel}>DATE & TIME</Text>
            <Text style={S.quickValue}>{dateLabel(concert.start_date || concert.date)}</Text>
          </View>
          <View style={S.quickItem}>
            <Image source={ICONS.location} style={S.quickImageIcon} />
            <Text style={S.quickLabel}>LOCATION</Text>
            <Text style={S.quickValue}>{venue}</Text>
          </View>
          <View style={S.quickItem}>
            <Image source={ICONS.price} style={S.quickImageIcon} />
            <Text style={S.quickLabel}>STARTING PRICE</Text>
            <Text style={S.quickValue}>{tickets.length ? money(Math.min(...tickets.map((item) => Number(item.price) || 0))) : money(concert.price)}</Text>
          </View>
        </View>

        <Panel>
          <SectionHeading title="About the Concert" subtitle="Event information" />
          <Text style={S.bodyText}>{concert.description || `Experience an unforgettable night at ${name}. Get ready for an incredible live performance, an immersive stage production, and a memorable celebration with fellow music fans.`}</Text>
          <View style={S.organizerCard}>
            <View style={S.organizerIconWrap}><Image source={ICONS.organizer} style={S.organizerIcon} /></View>
            <View style={{ flex: 1 }}>
              <Text style={S.infoCellLabel}>ORGANIZER</Text>
              <Text style={S.organizerName}>{concert.organizer_name || concert.organizer || 'LYNORA Organizer'}</Text>
            </View>
            <View style={S.verifiedPill}><Text style={S.verifiedText}>VERIFIED</Text></View>
          </View>
        </Panel>

        <Panel>
          <SectionHeading title="Lineup & Artist Profile" subtitle="Meet the performers" />
          {artists.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.artistList}>
              {artists.map((artist, index) => {
                // Use this event's own card poster for every lineup tile,
                // never a hard-coded artist/group poster.
                const artistPhoto = poster;
                return (
                  <View key={`${artist.id || artist.name || 'artist'}-${index}`} style={S.artistCard}>
                    <PosterImage uri={artistPhoto} style={S.artistImage} />
                    <Text style={S.artistName} numberOfLines={1}>{artist.name || `Performer ${index + 1}`}</Text>
                    {!!artist.role && <Text style={S.artistCountry} numberOfLines={1}>{artist.role}</Text>}
                    {!!artist.bio && <Text style={S.artistBio} numberOfLines={3}>{artist.bio}</Text>}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={S.artistPosterFeature}>
              <PosterImage uri={poster} style={S.artistPosterImage} />
              <Text style={S.artistName} numberOfLines={2}>{name}</Text>
              <Text style={S.artistCountry}>CONCERT LINEUP</Text>
              <Text style={S.artistBio}>Official concert poster and featured performers</Text>
            </View>
          )}
        </Panel>

        <Panel>
          <SectionHeading title="Event Schedule" subtitle="Event rundown" />
          {schedule.length ? schedule.map((item, index) => (
            <View key={`${item.time || 'time'}-${index}`} style={S.scheduleRow}>
              <Text style={S.scheduleTimeText}>{item.time || 'TBA'}</Text>
              <View style={S.scheduleDetails}><Text style={S.scheduleTitle}>{item.title || 'Event activity'}</Text>{!!item.description && <Text style={S.mutedText}>{item.description}</Text>}</View>
            </View>
          )) : [
            ['4:00 PM', 'Gates open and merch booths start'],
            ['6:30 PM', 'Entry for Floor and Lower Tribune closes'],
            ['7:30 PM', 'Show starts'],
            ['~10:00 PM', 'Show ends and staggered exit begins'],
          ].map(([time, title]) => <View key={time} style={S.scheduleRow}><Text style={S.scheduleTimeText}>{time}</Text><View style={S.scheduleDetails}><Text style={S.scheduleTitle}>{title}</Text></View></View>)}
        </Panel>

        <Panel>
          <SectionHeading title="Ticket Rules" subtitle="Please read before purchasing" />
          <View style={S.detailGrid}>
            {[['Purchase limit', 'Up to 4 tickets per ID and per day. Each ticket is valid for one person.'], ['E-ticket delivery', 'Delivered to My Tickets after payment is confirmed.'], ['Name & ID check', 'Bring the ID used at purchase. Floor tickets are verified at the wristband counter.'], ['Payment options', 'Cards, e-wallets, virtual accounts and eligible installment options.']].map(([title, body]) => <View key={title} style={S.detailTile}><Text style={S.detailTileTitle}>{title}</Text><Text style={S.detailTileText}>{body}</Text></View>)}
          </View>
        </Panel>

        <Panel>
          <SectionHeading title="Getting There" subtitle="Venue & facilities" />
          <View style={S.detailGrid}>
            {[['MRT', 'Check the nearest station and walking access to the venue.'], ['Park & ride', 'Use designated parking areas and official shuttle services when available.'], ['Ride-hailing', 'Follow the venue drop-off and pick-up point instructions.'], ['Facilities', 'Check venue information for food stalls, prayer rooms and first aid.']].map(([title, body]) => <View key={title} style={S.detailTile}><Text style={S.detailTileTitle}>{title}</Text><Text style={S.detailTileText}>{body}</Text></View>)}
          </View>
          <View style={S.mapPreview}>
            {mapCoordinate ? (
              <MapView
                style={S.mapPreviewImage}
                initialRegion={{ ...mapCoordinate, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
                region={{ ...mapCoordinate, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
                scrollEnabled zoomEnabled rotateEnabled={false} pitchEnabled={false}
              >
                <Marker coordinate={mapCoordinate} title={venue} description={venueAddress || mapAddress} />
              </MapView>
            ) : (
              <View style={S.mapPreviewFallback}>
                <ActivityIndicator size="large" color={C.cyan} />
                <Text style={S.mapFallbackTitle}>Memuat peta venue...</Text>
                <Text style={S.mapFallbackText}>Lokasi sedang dicari dari alamat venue.</Text>
              </View>
            )}
            <View style={S.mapCaption}><MapPin size={14} color={C.cyan} /><Text style={S.mapCaptionText} numberOfLines={2}>{venue}{venueAddress ? ` · ${venueAddress}` : ''}</Text></View>
          </View>
          <TouchableOpacity style={S.mapButton} onPress={openMaps} disabled={!venueAddress && !concert.venue_name && !concert.location}><ExternalLink size={15} color={C.white} /><Text style={S.mapButtonText}>Open in Google Maps</Text></TouchableOpacity>
        </Panel>

        <Panel>
          <SectionHeading title="Terms & Conditions" subtitle="Important event policies" />
          {['Tickets are non-transferable except through LYNORA Shield resale.','Guests under 17 must be accompanied by an adult with a valid ticket.','Professional cameras, drones, outside food and drinks, and sharp objects are prohibited.','The promoter may change the schedule or running order without prior notice.','Duplicated or resold tickets outside official channels will be rejected at the gate.'].map((item, index) => <View key={index} style={S.bulletRow}><View style={S.bullet} /><Text style={S.bodyTextSmall}>{item}</Text></View>)}
        </Panel>

        <Panel>
          <SectionHeading title="Frequently Asked Questions" subtitle="Need help with your ticket?" />
          {[['How will I receive my ticket?', 'Your e-ticket will appear in My Tickets after your payment is confirmed.'],['Can I get a refund or resell my ticket?', 'Refunds follow the promoter’s policy. You can resell safely through LYNORA Shield when eligible.'],['What can I bring into the stadium?', 'Please follow the venue rules and the prohibited-items policy shared before the event.'],['Is there an age limit?', 'Age requirements are set by the organizer and venue. Check the event announcement before purchasing.'],['What if the show is cancelled or rescheduled?', 'Updates and eligible refund information will be shared through official LYNORA notifications.']].map(([q,a],index) => <View key={q} style={S.faqItem}><TouchableOpacity style={S.faqQuestion} onPress={() => setOpenFaq(openFaq === index ? -1 : index)}><Text style={S.faqQuestionText}>{q}</Text><ChevronDown size={16} color={C.white} /></TouchableOpacity>{openFaq === index && <Text style={S.faqAnswer}>{a}</Text>}</View>)}
        </Panel>

        <Panel>
          <SectionHeading title="Ticket Categories" subtitle="Choose your ticket" />
          {tickets.length ? tickets.map((ticket) => {
            const active = Number(ticket.id) === Number(selectedTicket?.id);
            const remaining = Number(ticket.remaining ?? 0);
            const available = remaining > 0;
            return (
              <TouchableOpacity
                key={String(ticket.id)}
                activeOpacity={0.85}
                disabled={!available || salesStatus !== 'on_sale'}
                onPress={() => setSelectedTicketId(Number(ticket.id))}
                style={[S.ticketCard, active && S.ticketCardActive, (!available || salesStatus !== 'on_sale') && S.ticketUnavailable]}
              >
                <View style={{ flex: 1 }}>
                  <View style={S.ticketNameRow}>
                    <Text style={S.ticketName}>{ticket.name}</Text>
                    {active && <Text style={S.selectedTag}>SELECTED</Text>}
                  </View>
                  {!!ticket.benefit && <Text style={S.ticketBenefit}>{ticket.benefit}</Text>}
                  <Text style={[S.ticketStock, { color: available ? C.green : C.red }]}>{available ? `${remaining} tickets available` : 'Sold out'}</Text>
                </View>
                <Text style={S.ticketPrice}>{money(ticket.price)}</Text>
              </TouchableOpacity>
            );
          }) : <Text style={S.mutedText}>Ticket categories have not been published yet.</Text>}
          {!!selectedTicket && (
            <View style={S.selectedSummary}>
              <Text style={S.selectedSummaryLabel}>Selected ticket</Text>
              <Text style={S.selectedSummaryValue}>{selectedTicket.name} · {money(selectedTicket.price)}</Text>
            </View>
          )}
        </Panel>

        {!!similarConcerts.length && <View style={S.similarSection}>
          <SectionHeading title="Similar concerts you may like" subtitle="Discover more live experiences" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.similarList}>
            {similarConcerts.map((item) => <TouchableOpacity key={String(item.id)} style={S.similarCard} activeOpacity={0.85} onPress={() => navigation.push('ConcertDetail', { concert: item, eventId: item.id })}>
              {item.poster_url || item.image_url ? <Image source={{ uri: item.poster_url || item.image_url }} style={S.similarImage} /> : <View style={[S.similarImage, S.artistPlaceholder]}><Music2 size={24} color={C.purple} /></View>}
              <View style={S.similarCardBody}><Text style={S.similarName} numberOfLines={2}>{item.name || item.title}</Text><Text style={S.similarCategory}>{item.category_name || 'Live Concert'}</Text><Text style={S.similarPrice}>{money(item.price)}</Text><Text style={S.similarVenue} numberOfLines={1}>{item.venue_name || 'Venue TBA'}</Text></View>
            </TouchableOpacity>)}
          </ScrollView>
        </View>}

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={S.bottomBar}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={S.bottomLabel}>STARTING FROM</Text>
          <Text style={S.bottomPrice} numberOfLines={1}>{selectedTicket ? money(selectedTicket.price) : money(concert.price)}</Text>
        </View>
        <TouchableOpacity style={[S.buyButton, !canBuy && S.buyButtonDisabled]} onPress={bookTicket} activeOpacity={0.85}>
          <Ticket size={17} color={C.white} />
          <Text style={S.buyButtonText}>{canBuy ? 'Buy Ticket' : eventEnded ? 'Event Ended' : 'Unavailable'}</Text>
          <ChevronRight size={16} color={C.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: { minHeight: 58, paddingHorizontal: 15, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.14)', backgroundColor: '#0D1427' },
  backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.border },
  topTitleWrap: { flex: 1 },
  topTitle: { color: C.white, fontSize: 15, fontWeight: '900' },
  topSubtitle: { color: C.muted, fontSize: 10, marginTop: 2 },
  scrollContent: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 24, gap: 13 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.muted, fontSize: 13 },
  errorWrap: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { color: C.white, fontSize: 18, fontWeight: '900', marginTop: 14 },
  errorText: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  primaryButton: { backgroundColor: C.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, marginTop: 18 },
  primaryButtonText: { color: C.white, fontSize: 13, fontWeight: '900' },
  backTextButton: { padding: 12 },
  backText: { color: '#B9A0FF', fontWeight: '800' },
  warningBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#2E2723', borderColor: 'rgba(245,184,78,0.3)', borderWidth: 1, borderRadius: 10, padding: 11 },
  warningText: { color: '#F5D28B', fontSize: 11, lineHeight: 16, flex: 1 },
  heroWrap: { position: 'relative' },
  hero: { minHeight: 265, borderRadius: 18, overflow: 'hidden', justifyContent: 'space-between' },
  posterImageFallback: { backgroundColor: '#202A4F', alignItems: 'center', justifyContent: 'center' },
  heroShade: { flex: 1, minHeight: 265, borderRadius: 18, padding: 15, justifyContent: 'space-between' },
  heroFallback: { padding: 16, alignItems: 'flex-start' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  categoryBadge: { color: C.white, fontSize: 10, fontWeight: '900', borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(139,92,246,0.8)', paddingHorizontal: 11, paddingVertical: 7 },
  heroBottom: { gap: 6, paddingRight: 45 },
  heroEyebrow: { color: '#C7B8FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: C.white, fontSize: 25, fontWeight: '900', lineHeight: 30 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  heroMetaText: { color: '#F0F2FA', fontSize: 11, fontWeight: '700', flex: 1, lineHeight: 16 },
  heroWishlist: { position: 'absolute', right: 13, bottom: 14, width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(8,13,32,0.88)', alignItems: 'center', justifyContent: 'center' },
  wishlistIcon: { width: 21, height: 21 },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickItem: { flex: 1, minWidth: 0, padding: 12, borderRadius: 13, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, gap: 6 },
  quickLabel: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  quickImageIcon: { width: 25, height: 25, resizeMode: 'contain', alignSelf: 'center' },
  quickValue: { color: C.white, fontSize: 10, fontWeight: '800', lineHeight: 15, textAlign: 'center' },
  panel: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  sectionHeadLeft: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  sectionBar: { width: 4, borderRadius: 4 },
  sectionTitle: { color: C.white, fontSize: 15, fontWeight: '900' },
  sectionSubtitle: { color: C.muted, fontSize: 10, marginTop: 3 },
  bodyText: { color: '#D5DAE8', fontSize: 12, lineHeight: 19 },
  bodyTextSmall: { color: '#C2C9DA', fontSize: 11, lineHeight: 17, flex: 1 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  infoCell: { width: '48%', backgroundColor: '#10182E', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoCellLabel: { color: '#8792AC', fontSize: 8, fontWeight: '900' },
  infoCellValue: { color: C.cyan, fontSize: 11, fontWeight: '800', marginTop: 5 },
  artistList: { gap: 10, paddingRight: 3 },
  artistPosterFeature: { width: 220, padding: 10, borderRadius: 14, backgroundColor: '#10182E', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
  artistPosterImage: { width: '100%', height: 138, borderRadius: 10, backgroundColor: '#252B46' },
  organizerCard: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 15, padding: 11, borderRadius: 13, backgroundColor: '#10182E', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  organizerIconWrap: { width: 54, height: 54, borderRadius: 13, backgroundColor: '#39245F', alignItems: 'center', justifyContent: 'center' },
  organizerIcon: { width: 29, height: 29, resizeMode: 'contain' },
  organizerName: { color: C.white, fontSize: 12, fontWeight: '900', marginTop: 5 },
  verifiedPill: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: '#123C3A' },
  verifiedText: { color: '#54D5C4', fontSize: 8, fontWeight: '900' },
  artistCard: { width: 132, padding: 9, borderRadius: 12, backgroundColor: '#10182E', borderWidth: 1, borderColor: 'rgba(139,92,246,0.18)' },
  artistImage: { width: '100%', height: 112, borderRadius: 9, backgroundColor: '#252B46' },
  artistPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  artistName: { color: C.white, fontSize: 12, fontWeight: '900', marginTop: 8 },
  artistCountry: { color: C.cyan, fontSize: 10, marginTop: 3 },
  artistBio: { color: C.muted, fontSize: 9, lineHeight: 13, marginTop: 5 },
  mutedText: { color: C.muted, fontSize: 11, lineHeight: 17 },
  scheduleRow: { flexDirection: 'row', gap: 11, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)' },
  scheduleTime: { width: 88, flexDirection: 'row', gap: 5, alignItems: 'center' },
  scheduleTimeText: { color: C.cyan, fontSize: 14, fontWeight: '900', width: 92 },
  scheduleDetails: { flex: 1, gap: 3 },
  scheduleTitle: { color: C.white, fontSize: 11, fontWeight: '800' },
  venueCard: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: '#10182E', borderRadius: 12, padding: 12 },
  venueIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#12303B', alignItems: 'center', justifyContent: 'center' },
  venueName: { color: C.white, fontSize: 12, fontWeight: '900' },
  venueAddress: { color: C.muted, fontSize: 10, marginTop: 4, lineHeight: 15 },
  mapPreview: { marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: '#10182E' },
  mapPreviewImage: { width: '100%', height: 165, backgroundColor: '#202A4F' },
  mapPreviewFallback: { height: 165, alignItems: 'center', justifyContent: 'center', padding: 18, gap: 7 },
  mapFallbackTitle: { color: C.white, fontSize: 12, fontWeight: '900' },
  mapFallbackText: { color: C.muted, fontSize: 10, textAlign: 'center', lineHeight: 15 },
  mapCaption: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  mapCaptionText: { color: C.white, fontSize: 10, fontWeight: '700', flex: 1 },
  mapButton: { marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 11 },
  mapButtonText: { color: '#C9B9FF', fontSize: 11, fontWeight: '800' },
  ticketCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#10182E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 9 },
  ticketCardActive: { borderColor: C.purple, backgroundColor: 'rgba(139,92,246,0.13)' },
  ticketUnavailable: { opacity: 0.48 },
  ticketNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketName: { color: C.white, fontSize: 12, fontWeight: '900' },
  selectedTag: { color: '#D8C9FF', fontSize: 8, fontWeight: '900', backgroundColor: 'rgba(139,92,246,0.22)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  ticketBenefit: { color: C.muted, fontSize: 10, marginTop: 5, lineHeight: 15 },
  ticketStock: { fontSize: 9, fontWeight: '800', marginTop: 5 },
  ticketPrice: { color: '#C6B3FF', fontSize: 12, fontWeight: '900' },
  selectedSummary: { backgroundColor: 'rgba(84,86,222,0.16)', borderRadius: 10, padding: 11, marginTop: 2 },
  selectedSummaryLabel: { color: C.muted, fontSize: 9, fontWeight: '800' },
  selectedSummaryValue: { color: C.white, fontSize: 11, fontWeight: '900', marginTop: 4 },
  bulletRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 9 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan, marginTop: 5 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  detailTile: { width: '48%', minHeight: 100, padding: 11, borderRadius: 11, backgroundColor: '#10182E' },
  detailTileTitle: { color: C.white, fontSize: 11, fontWeight: '900', marginBottom: 8 },
  detailTileText: { color: C.muted, fontSize: 9, lineHeight: 14 },
  faqItem: { borderRadius: 9, backgroundColor: '#10182E', marginTop: 7, overflow: 'hidden' },
  faqQuestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, gap: 8 },
  faqQuestionText: { color: C.white, fontSize: 10, fontWeight: '800', flex: 1 },
  faqAnswer: { color: C.muted, fontSize: 10, lineHeight: 15, paddingHorizontal: 11, paddingBottom: 12 },
  similarSection: { gap: 12 },
  similarList: { gap: 11, paddingRight: 4 },
  similarCard: { width: 190, borderRadius: 13, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  similarImage: { width: '100%', height: 112, backgroundColor: '#252B46' },
  similarCardBody: { padding: 10, gap: 6 },
  similarName: { color: C.white, fontSize: 11, fontWeight: '900', minHeight: 30 },
  similarCategory: { color: '#B99AFF', fontSize: 10, fontWeight: '800' },
  similarPrice: { color: C.white, fontSize: 11, fontWeight: '900' },
  similarVenue: { color: C.muted, fontSize: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 7 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#0D1427' },
  bottomLabel: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  bottomPrice: { color: '#C6B3FF', fontSize: 16, fontWeight: '900', marginTop: 3 },
  buyButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 12, backgroundColor: C.primary },
  buyButtonDisabled: { backgroundColor: '#3A4059', opacity: 0.8 },
  buyButtonText: { color: C.white, fontSize: 12, fontWeight: '900' },
});
