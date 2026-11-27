import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Linking,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Ticket,
  Star,
  ChevronRight,
  Users,
  Music2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';

const MapView = Platform.OS === 'web'
  ? null
  : require('react-native-maps').default;

const Marker = Platform.OS === 'web'
  ? null
  : require('react-native-maps').Marker;


const COLORS = {
  background: '#080B1C',
  card: '#111831',
  cardLight: '#192342',
  purple: '#922EFF',
  purpleLight: '#B34CFF',
  cyan: '#21D5E8',
  white: '#FFFFFF',
  muted: '#929BB7',
  border: '#293451',
};

const defaultConcert = {
  id: 3,
  title: 'BLACKPINK WORLD TOUR',
  category: 'Pop',
  date: '10 Januari 2027',
  location: 'Gelora Bung Karno, Jakarta',
  price: 'Rp1.500.000',
  status: 'Tiket Tersedia',
  image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200',
  organizer: 'YG Entertainment',
  rating: '5.0',
  latitude: -6.2187,
  longitude: 106.8026,
};

const artists = [
  {
    name: 'JISOO',
    role: 'Vocalist',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
  },
  {
    name: 'JENNIE',
    role: 'Rapper',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500',
  },
  {
    name: 'ROSÉ',
    role: 'Vocalist',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500',
  },
  {
    name: 'LISA',
    role: 'Dancer & Rapper',
    image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=500',
  },
];

const ticketCategories = [
  { id: 1, name: 'CAT 1', type: 'Standing', price: 1500000, available: 'Tersedia' },
  { id: 2, name: 'CAT 2', type: 'Festival', price: 2200000, available: 'Tersedia' },
  { id: 3, name: 'VIP', type: 'Standing VIP', price: 3500000, available: 'Terbatas' },
];

const recommendations = [
  {
    title: 'LANY - Soft World Tour',
    date: '20 Desember 2026',
    price: 'Rp850.000',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=700',
  },
  {
    title: 'Avenged Sevenfold',
    date: '25 Desember 2026',
    price: 'Rp1.200.000',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=700',
  },
];

const formatPrice = (price) =>
  'Rp ' + Number(price).toLocaleString('id-ID');

export default function ConcertDetailScreen({ navigation, route }) {
  const concert = route?.params?.concert || defaultConcert;
  const [selectedTicket, setSelectedTicket] = useState(ticketCategories[0]);
  const mapLatitude = concert.latitude !== null &&
    concert.latitude !== undefined &&
    concert.latitude !== '' &&
    Number.isFinite(Number(concert.latitude)) &&
    Number(concert.latitude) >= -90 &&
    Number(concert.latitude) <= 90
      ? Number(concert.latitude)
      : -6.2088;
  const mapLongitude = concert.longitude !== null &&
    concert.longitude !== undefined &&
    concert.longitude !== '' &&
    Number.isFinite(Number(concert.longitude)) &&
    Number(concert.longitude) >= -180 &&
    Number(concert.longitude) <= 180
      ? Number(concert.longitude)
      : 106.8456;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Detail Konser</Text>

          <View style={styles.headerActions}>
            <HeaderActions navigation={navigation} />
          </View>
        </View>

        {/* CONCERT BANNER */}
        <View style={styles.heroWrapper}>
          <ImageBackground
            source={{ uri: concert.image || defaultConcert.image }}
            style={styles.heroImage}
            imageStyle={styles.heroImageRadius}
          >
            <LinearGradient
              colors={['rgba(5,8,24,0.05)', 'rgba(5,8,24,0.95)']}
              style={styles.heroGradient}
            >
              <View style={styles.heroTop}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE EVENT</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {concert.category || 'POP'}
                  </Text>
                </View>
              </View>

              <View style={styles.heroBottom}>
                <Text style={styles.heroLabel}>EXCLUSIVE CONCERT</Text>
                <Text style={styles.heroTitle}>{concert.title}</Text>
                <View style={styles.heroRating}>
                  <Star size={13} color="#FFC857" fill="#FFC857" />
                  <Text style={styles.ratingText}>
                    {concert.rating || '5.0'} / 5.0
                  </Text>
                  <Text style={styles.ratingDivider}>•</Text>
                  <Text style={styles.ratingText}>Konser pilihan</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* QUICK INFO */}
        <View style={styles.quickInfo}>
          <View style={styles.quickInfoItem}>
            <CalendarDays size={18} color={COLORS.purpleLight} />
            <Text style={styles.quickLabel}>TANGGAL</Text>
            <Text style={styles.quickValue}>{concert.date}</Text>
          </View>

          <View style={styles.quickDivider} />

          <View style={styles.quickInfoItem}>
            <MapPin size={18} color={COLORS.cyan} />
            <Text style={styles.quickLabel}>LOKASI</Text>
            <Text style={styles.quickValue}>Jakarta</Text>
          </View>

          <View style={styles.quickDivider} />

          <View style={styles.quickInfoItem}>
            <Ticket size={18} color="#FFB547" />
            <Text style={styles.quickLabel}>HARGA MULAI</Text>
            <Text style={styles.quickValue}>{concert.price}</Text>
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <SectionTitle title="Tentang Konser" subtitle="Informasi acara" />

          <Text style={styles.description}>
            Saksikan penampilan spektakuler dalam BLACKPINK WORLD TOUR.
            Nikmati pengalaman konser yang penuh energi, musik, dan momen
            tak terlupakan bersama para penggemar.
          </Text>

          <View style={styles.organizerCard}>
            <View style={styles.organizerIcon}>
              <Music2 size={20} color={COLORS.purpleLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.organizerLabel}>PENYELENGGARA</Text>
              <Text style={styles.organizerName}>
                {concert.organizer || 'YG Entertainment'}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>
        </View>

        {/* ARTIST LINEUP */}
        <View style={styles.section}>
          <SectionTitle title="Lineup & Artist Profile" subtitle="Meet the performers" />

          <View style={styles.artistGrid}>
            {artists.map((artist) => (
              <View key={artist.name} style={styles.artistCard}>
                <Image source={{ uri: artist.image }} style={styles.artistImage} />
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.artistRole}>{artist.role}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* EVENT SCHEDULE */}
        <View style={styles.section}>
          <SectionTitle title="Event Schedule" subtitle="Rangkaian acara konser" />

          <View style={styles.scheduleCard}>
            <ScheduleItem time="15.00 WIB" title="Open Gate" description="Pintu masuk venue dibuka" />
            <ScheduleItem time="17.00 WIB" title="Pre-show" description="Persiapan dan hiburan pembuka" />
            <ScheduleItem time="19.00 WIB" title="Main Performance" description="Penampilan utama konser" last />
          </View>          <View style={styles.locationCard}>
            <View style={styles.locationMapWrap}>
              {Platform.OS !== 'web' ? (
                <MapView
                  style={styles.realMap}
                  initialRegion={{
                    latitude: mapLatitude,
                    longitude: mapLongitude,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                  }}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: mapLatitude,
                      longitude: mapLongitude,
                    }}
                    title={concert.location || 'Lokasi Konser'}
                  />
                </MapView>
              ) : (
                <View style={styles.mapUnavailable}>
                  <MapPin size={30} color={COLORS.cyan} />
                  <Text style={styles.mapUnavailableText}>
                    {Platform.OS === 'web' ? 'Buka aplikasi Android untuk melihat peta' : 'Peta lokasi belum tersedia'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.locationInfo}>
              <View style={styles.locationHeadingRow}>
                <View style={styles.locationIcon}>
                  <MapPin size={19} color={COLORS.cyan} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>
                    {concert.location || 'Lokasi belum tersedia'}
                  </Text>
                  <Text style={styles.locationSub}>
                    Lokasi penyelenggaraan konser
                  </Text>
                </View>

                <ChevronRight size={19} color={COLORS.muted} />
              </View>

              <View style={styles.locationDivider} />

              <TouchableOpacity
                style={styles.accessRow}
                activeOpacity={0.8}
                disabled={!concert.location}
                onPress={() => {
                  if (concert.location) {
                    Linking.openURL(
                      'https://www.google.com/maps/search/?api=1&query=' +
                      encodeURIComponent(concert.location)
                    ).catch(() => {});
                  }
                }}
              >
                <View>
                  <Text style={styles.accessTitle}>AKSES VENUE</Text>
                  <Text style={styles.accessDescription}>
                    Ketuk untuk melihat lokasi dan petunjuk arah menuju venue.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* TICKET CATEGORY */}
        <View style={styles.section}>
          <SectionTitle title="Ticket Category" subtitle="Pilih kategori tiketmu" />

          {ticketCategories.map((item) => {
            const active = selectedTicket.id === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.ticketCard, active && styles.ticketCardActive]}
                onPress={() => setSelectedTicket(item)}
                activeOpacity={0.8}
              >
                <View style={styles.ticketLeft}>
                  <View style={[styles.ticketRadio, active && styles.ticketRadioActive]}>
                    {active && <View style={styles.ticketRadioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>{item.name}</Text>
                    <Text style={styles.ticketType}>{item.type}</Text>
                    <Text style={styles.ticketAvailability}>{item.available}</Text>
                  </View>
                </View>

                <View style={styles.ticketRight}>
                  <Text style={styles.ticketPrice}>{formatPrice(item.price)}</Text>
                  <Text style={styles.ticketPerPerson}>/ orang</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.selectedInfo}>
            <Users size={15} color={COLORS.cyan} />
            <Text style={styles.selectedInfoText}>
              Kategori terpilih: {selectedTicket.name}
            </Text>
          </View>
        </View>

        {/* RECOMMENDATION */}
        <View style={styles.section}>
          <SectionTitle title="You Might Also Like" subtitle="Konser lainnya untukmu" />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recommendations.map((item) => (
              <TouchableOpacity key={item.title} style={styles.recommendCard}>
                <Image source={{ uri: item.image }} style={styles.recommendImage} />
                <View style={styles.recommendInfo}>
                  <Text style={styles.recommendTitle}>{item.title}</Text>
                  <Text style={styles.recommendDate}>{item.date}</Text>
                  <Text style={styles.recommendPrice}>{item.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 115 }} />
      </ScrollView>

      {/* BOTTOM BOOKING BAR */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>HARGA TIKET</Text>
          <Text style={styles.bottomPrice}>{formatPrice(selectedTicket.price)}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Booking', {
              concert,
              ticket: selectedTicket,
            })
          }
        >
          <LinearGradient
            colors={['#B34CFF', '#7428E8']}
            style={styles.bookButton}
          >
            <Ticket size={17} color={COLORS.white} />
            <Text style={styles.bookButtonText}>PILIH TIKET</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <View style={styles.sectionHeading}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.headingLine} />
    </View>
  );
}

function ScheduleItem({ time, title, description, last }) {
  return (
    <View style={styles.scheduleItem}>
      <View style={styles.timeline}>
        <View style={styles.timelineDot} />
        {!last && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.scheduleContent}>
        <Text style={styles.scheduleTime}>{time}</Text>
        <Text style={styles.scheduleTitle}>{title}</Text>
        <Text style={styles.scheduleDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroWrapper: {
    marginHorizontal: 15,
    marginTop: 3,
  },
  heroImage: {
    height: 225,
    justifyContent: 'space-between',
  },
  heroImageRadius: {
    borderRadius: 16,
  },
  heroGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveBadge: {
    backgroundColor: '#B51F62',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
  },
  categoryBadge: {
    backgroundColor: 'rgba(146,46,255,0.9)',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },
  heroBottom: {
    gap: 6,
  },
  heroLabel: {
    color: '#D9B8FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
  },
  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    color: '#E2E5F2',
    fontSize: 10,
  },
  ratingDivider: {
    color: COLORS.muted,
  },
  quickInfo: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 13,
    paddingVertical: 15,
    paddingHorizontal: 9,
    backgroundColor: COLORS.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  quickInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  quickLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  quickValue: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickDivider: {
    width: 1,
    height: 43,
    backgroundColor: COLORS.border,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  headingLine: {
    width: 35,
    height: 3,
    borderRadius: 5,
    backgroundColor: COLORS.purpleLight,
  },
  description: {
    color: '#BEC6DD',
    fontSize: 11,
    lineHeight: 19,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  organizerIcon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: '#30204F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  organizerName: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  verifiedBadge: {
    backgroundColor: '#123B3B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#55E6BD',
    fontSize: 8,
    fontWeight: '900',
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 11,
  },
  artistCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 10,
  },
  artistImage: {
    width: '100%',
    height: 125,
  },
  artistName: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 9,
    marginHorizontal: 10,
  },
  artistRole: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 3,
    marginHorizontal: 10,
  },
  scheduleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleItem: {
    flexDirection: 'row',
    minHeight: 65,
  },
  timeline: {
    width: 22,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: COLORS.purpleLight,
    marginTop: 3,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#49306F',
    marginVertical: 3,
  },
  scheduleContent: {
    flex: 1,
    paddingBottom: 15,
  },
  scheduleTime: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '800',
  },
  scheduleTitle: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  scheduleDescription: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 3,
  },
  locationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 11,
    overflow: 'hidden',
  },
  locationMapWrap: {
    height: 150,
    width: '100%',
    position: 'relative',
    backgroundColor: '#17243A',
  },
  realMap: {
    width: '100%',
    height: '100%',
  },
  mapUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17243A',
    gap: 9,
  },
  mapUnavailableText: {
    color: COLORS.muted,
    fontSize: 12,
  },  locationInfo: {
    padding: 13,
  },
  locationHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  accessRow: {
    gap: 5,
  },
  accessTitle: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  accessDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
  },
  locationIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#123344',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationName: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  locationSub: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 4,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 10,
  },
  ticketCardActive: {
    borderColor: COLORS.purpleLight,
    backgroundColor: '#21183C',
  },
  ticketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  ticketRadio: {
    width: 17,
    height: 17,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketRadioActive: {
    borderColor: COLORS.purpleLight,
  },
  ticketRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: COLORS.purpleLight,
  },
  ticketName: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },
  ticketType: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 3,
  },
  ticketAvailability: {
    color: '#55E6BD',
    fontSize: 8,
    marginTop: 4,
  },
  ticketRight: {
    alignItems: 'flex-end',
  },
  ticketPrice: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '900',
  },
  ticketPerPerson: {
    color: COLORS.muted,
    fontSize: 8,
    marginTop: 3,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
  },
  selectedInfoText: {
    color: COLORS.cyan,
    fontSize: 9,
  },
  recommendCard: {
    width: 205,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 11,
  },
  recommendImage: {
    width: '100%',
    height: 105,
  },
  recommendInfo: {
    padding: 10,
  },
  recommendTitle: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
  recommendDate: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 5,
  },
  recommendPrice: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#10172D',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 17,
    paddingTop: 12,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  bottomPrice: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },
});
