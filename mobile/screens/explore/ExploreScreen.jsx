import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  CalendarDays,
  Bookmark,
  Ticket,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';

const COLORS = {
  background: '#080B1C',
  card: '#111831',
  cardLight: '#17213D',
  purple: '#922EFF',
  purpleLight: '#B34CFF',
  cyan: '#21D5E8',
  white: '#FFFFFF',
  muted: '#929BB7',
};

const genres = [
  'Semua Genre',
  'Pop',
  'Rock',
  'Jazz',
  'EDM',
  'Hip-Hop',
  'Festival',
];

const concerts = [
  {
    id: 1,
    title: 'LANY — Soft World Tour',
    category: 'Pop',
    date: '20 Desember 2026',
    location: 'ICE BSD, Tangerang',
    price: 'Rp850.000',
    status: 'Tiket Tersedia',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900',
    organizer: 'Sound Entertainment',
    rating: '4.9',
  },
  {
    id: 2,
    title: 'Avenged Sevenfold',
    category: 'Rock',
    date: '25 Desember 2026',
    location: 'Jakarta International Stadium',
    price: 'Rp1.200.000',
    status: 'Segera Habis',
    image:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900',
    organizer: 'Music Production',
    rating: '4.8',
  },
  {
    id: 3,
    title: 'BLACKPINK WORLD TOUR',
    category: 'Pop',
    date: '10 Januari 2027',
    location: 'Gelora Bung Karno, Jakarta',
    price: 'Rp1.500.000',
    status: 'Tiket Tersedia',
    image:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900',
    organizer: 'YG Entertainment',
    rating: '5.0',
  },
  {
    id: 4,
    title: 'Synchronize Fest 2026',
    category: 'Festival',
    date: '18 Januari 2027',
    location: 'Gambir Expo, Jakarta',
    price: 'Rp650.000',
    status: 'Tiket Tersedia',
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900',
    organizer: 'Demajors',
    rating: '4.9',
  },
];

export default function ExploreScreen({ navigation, route }) {
  const [search, setSearch] = useState(route?.params?.search || '');
  const [selectedGenre, setSelectedGenre] = useState(
    route?.params?.genre === 'Pop'
      ? 'Pop'
      : route?.params?.genre || 'Semua Genre'
  );
  const [bookmarked, setBookmarked] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortMode, setSortMode] = useState('Terbaru');

  useEffect(() => {
    if (route?.params?.search !== undefined) {
      setSearch(route.params.search);
    }
  }, [route?.params?.search, route?.params?.searchTrigger]);

  const filteredConcerts = concerts.filter((concert) => {
    const matchGenre =
      selectedGenre === 'Semua Genre' ||
      concert.category === selectedGenre;

    const searchText = search.trim().toLowerCase();
    const matchSearch =
      !searchText ||
      `${concert.title} ${concert.category} ${concert.location} ${concert.organizer}`
        .toLowerCase()
        .includes(searchText);

    return matchGenre && matchSearch;
  }).slice().sort((a, b) => {
    if (sortMode === 'Harga Terendah') {
      return Number(a.price.replace(/\D/g, '')) - Number(b.price.replace(/\D/g, ''));
    }
    if (sortMode === 'Rating Tertinggi') {
      return Number(b.rating) - Number(a.rating);
    }
    return b.id - a.id;
  });

  const toggleBookmark = (id) => {
    setBookmarked((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const openDetail = (concert) => {
    navigation?.navigate('ConcertDetail', { concert });
  };

  const openBooking = (concert) => {
    const startingPrice = Number(
      String(concert.price || '').replace(/[^\d]/g, ''),
    );

    navigation?.navigate('Booking', {
      concert,
      ticket: {
        id: 1,
        name: 'CAT 1',
        price: startingPrice,
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="light-content"
      />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            LYNORA<Text style={styles.logoDot}>.</Text>
          </Text>
          <Text style={styles.tagline}>Experience Every Moment.</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* EXPLORE BANNER */}
        <LinearGradient
          colors={['#32105F', '#17133C', '#101A36']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroSmall}>TEMUKAN PENGALAMAN BARU</Text>
          <Text style={styles.heroTitle}>EXPLORE CONCERTS</Text>
          <Text style={styles.heroDescription}>
            Temukan konser terbaik dan nikmati pengalaman musik
            yang tidak terlupakan.
          </Text>

          <View style={styles.searchContainer}>
            <Search size={19} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari konser, artis, atau lokasi..."
              placeholderTextColor={COLORS.muted}
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity
              style={styles.searchFilter}
              onPress={() => setFilterVisible((value) => !value)}
            >
              <SlidersHorizontal size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* GENRE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Kategori Genre</Text>
              <Text style={styles.sectionSubtitle}>
                Pilih musik favoritmu
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreList}
          >
            {genres.map((genre) => {
              const active = selectedGenre === genre;

              return (
                <TouchableOpacity
                  key={genre}
                  onPress={() => setSelectedGenre(genre)}
                  style={[
                    styles.genreChip,
                    active && styles.genreChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.genreText,
                      active && styles.genreTextActive,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* CONCERT LIST */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Semua Konser
              </Text>
              <Text style={styles.sectionSubtitle}>
                Temukan konser yang cocok untukmu
              </Text>
            </View>

            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setFilterVisible((value) => !value)}
            >
              <SlidersHorizontal size={16} color={COLORS.cyan} />
              <Text style={styles.sortText}>Filter</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.resultText}>
            Menampilkan {filteredConcerts.length} konser
          </Text>

          {filterVisible && (
            <View style={styles.filterPanel}>
              {['Terbaru', 'Harga Terendah', 'Rating Tertinggi'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.filterOption,
                    sortMode === mode && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setSortMode(mode);
                    setFilterVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      sortMode === mode && styles.filterOptionTextActive,
                    ]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.concertList}
          >
          {filteredConcerts.map((concert) => (
            <View key={concert.id} style={styles.concertCard}>
              {/* IMAGE */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: concert.image }}
                  style={styles.concertImage}
                  resizeMode="cover"
                />

                <LinearGradient
                  colors={['transparent', 'rgba(5,8,24,0.75)']}
                  style={styles.imageGradient}
                />

                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      concert.status === 'Segera Habis' && {
                        backgroundColor: '#FFB547',
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {concert.status}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.bookmarkButton}
                  onPress={() => toggleBookmark(concert.id)}
                >
                  <Bookmark
                    size={18}
                    color={
                      bookmarked.includes(concert.id)
                        ? COLORS.purpleLight
                        : COLORS.white
                    }
                    fill={
                      bookmarked.includes(concert.id)
                        ? COLORS.purpleLight
                        : 'transparent'
                    }
                  />
                </TouchableOpacity>

                <View style={styles.imageCategory}>
                  <Text style={styles.imageCategoryText}>
                    {concert.category.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* CONCERT INFO */}
              <View style={styles.concertInfo}>
                <View style={styles.concertTitleRow}>
                  <Text style={styles.concertTitle}>
                    {concert.title}
                  </Text>

                  <View style={styles.rating}>
                    <Star
                      size={12}
                      color="#FFC857"
                      fill="#FFC857"
                    />
                    <Text style={styles.ratingText}>
                      {concert.rating}
                    </Text>
                  </View>
                </View>

                <Text style={styles.organizer}>
                  Oleh {concert.organizer}
                </Text>

                <View style={styles.infoRow}>
                  <CalendarDays size={15} color={COLORS.cyan} />
                  <Text style={styles.infoText}>
                    {concert.date}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <MapPin size={15} color={COLORS.cyan} />
                  <Text style={styles.infoText}>
                    {concert.location}
                  </Text>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>
                      Mulai dari
                    </Text>
                    <Text style={styles.price}>
                      {concert.price}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.detailButton}
                      onPress={() => openDetail(concert)}
                    >
                      <Text style={styles.detailButtonText}>
                        Detail
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openBooking(concert)}
                    >
                      <LinearGradient
                        colors={['#A52DFF', '#7428E8']}
                        style={styles.buyButton}
                      >
                        <Ticket size={15} color={COLORS.white} />
                        <Text style={styles.buyButtonText}>
                          Beli Tiket
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
          </ScrollView>

          {filteredConcerts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Search size={35} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>
                Konser tidak ditemukan
              </Text>
              <Text style={styles.emptyText}>
                Coba kata kunci atau kategori lainnya.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 25 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 2,
  },
  logoDot: {
    color: COLORS.purpleLight,
  },
  tagline: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 0.6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#FF4F8B',
    top: 7,
    right: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#34245F',
    borderWidth: 1,
    borderColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 10,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 17,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#49306F',
  },
  heroSmall: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  heroDescription: {
    color: '#B8C0D9',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 15,
  },
  searchContainer: {
    height: 45,
    borderRadius: 11,
    backgroundColor: '#0C1229',
    borderWidth: 1,
    borderColor: '#303A5A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 11,
    paddingVertical: 0,
  },
  searchFilter: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 23,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  genreList: {
    gap: 8,
    paddingTop: 13,
    paddingBottom: 3,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#273251',
  },
  genreChipActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  genreText: {
    color: '#B4BDD5',
    fontSize: 10,
    fontWeight: '700',
  },
  genreTextActive: {
    color: COLORS.white,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  sortText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '700',
  },
  resultText: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  filterPanel: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterOption: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273251',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterOptionActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  filterOptionText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  filterOptionTextActive: {
    color: COLORS.white,
  },
  concertList: {
    gap: 12,
    paddingRight: 16,
  },
  concertCard: {
    width: 300,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#273251',
    marginBottom: 16,
  },
  imageWrapper: {
    height: 155,
    position: 'relative',
  },
  concertImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 65,
  },
  statusBadge: {
    position: 'absolute',
    top: 11,
    left: 11,
    backgroundColor: 'rgba(7,13,30,0.9)',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: '#30E6A0',
  },
  statusText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  bookmarkButton: {
    position: 'absolute',
    right: 11,
    top: 11,
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(7,13,30,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCategory: {
    position: 'absolute',
    bottom: 11,
    left: 12,
    backgroundColor: 'rgba(146,46,255,0.9)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  imageCategoryText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  concertInfo: {
    padding: 13,
  },
  concertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  concertTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: '#FFD16A',
    fontSize: 10,
    fontWeight: '800',
  },
  organizer: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    color: '#C1C9DF',
    fontSize: 10,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#293451',
    marginVertical: 11,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 5,
  },
  priceLabel: {
    color: COLORS.muted,
    fontSize: 9,
  },
  price: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailButton: {
    borderWidth: 1,
    borderColor: '#59627E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  detailButtonText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginTop: 5,
  },
  pageArrow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageActive: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageActiveText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
  pageNumber: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberText: {
    color: COLORS.muted,
    fontSize: 11,
  },
});