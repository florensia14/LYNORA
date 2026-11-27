
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Image,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';

import {
  Search,
  SlidersHorizontal,
  MapPin,
  CalendarDays,
  Bookmark,
  ChevronRight,
  Ticket,
  Music2,
  Play,
} from 'lucide-react-native';

const concerts = [
  {
    id: 1,
    status: 'ON SALE',
    name: 'LANY — Soft World Tour',
    category: 'Indie Pop',
    artist: 'Arena Tour',
    date: '30 Okt 2026',
    location: 'United States',
    price: 'Rp 850.000+',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900',
  },
  {
    id: 2,
    status: 'NEW',
    name: 'Avenged Sevenfold',
    category: 'Metal Rock',
    artist: 'Arena Tour',
    date: '09 Nov 2026',
    location: 'United States',
    price: 'Rp 605.000+',
    image:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900',
  },
];

const genres = ['Pop', 'Rock', 'Indie', 'Metal', 'Jazz'];

const recommendedConcert = {
  id: 5,
  title: 'Music Of The Spheres Tour',
  category: 'Pop Rock',
  date: '15 Desember 2026',
  location: 'Gelora Bung Karno, Jakarta',
  price: 'Rp1.250.000',
  status: 'Tiket Tersedia',
  image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900',
  organizer: 'Live Performance',
  rating: '4.9',
};

function SectionTitle({ title, action = 'See All', onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.seeAll}>{action}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.seeAll}>{action}</Text>
      )}
    </View>
  );
}

function ConcertCard({ item, navigation }) {
  return (
    <View style={styles.concertCard}>
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.concertImage}
      >
        <View style={styles.imageTopRow}>
          <Text
            style={[
              styles.statusBadge,
              item.status === 'NEW' && styles.newBadge,
            ]}
          >
            {item.status}
          </Text>

          <TouchableOpacity style={styles.bookmarkButton}>
            <Bookmark size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>{item.price}</Text>
        </View>
      </ImageBackground>

      <View style={styles.concertContent}>
        <Text style={styles.concertName}>{item.name}</Text>

        <Text style={styles.concertCategory}>
          {item.category} · {item.artist}
        </Text>

        <Text style={styles.concertDescription}>
          Nikmati penampilan musik secara langsung dan rasakan pengalaman
          konser yang tidak terlupakan.
        </Text>

        <View style={styles.detailRow}>
          <CalendarDays size={13} color="#9CA3B8" />
          <Text style={styles.detailText}>
            {item.date}, 19:00 WIB
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MapPin size={13} color="#9CA3B8" />
          <Text style={styles.detailText}>
            From: {item.location}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ticket size={13} color="#9CA3B8" />
          <Text style={styles.detailText}>
            Organized by: Live Entertainment
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Music2 size={13} color="#9CA3B8" />
          <Text style={styles.detailText}>
            Indonesian Arena, Jakarta Pusat
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.availableText}>
            • Tiket Tersedia
          </Text>

          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => navigation.navigate('ConcertDetail', { concert: item })}
          >
            <Text style={styles.detailButtonText}>
              Detail & Tiket
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const genreScrollRef = useRef(null);
  const [selectedGenre, setSelectedGenre] = useState('Pop');
  const [searchText, setSearchText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);

  const genreMatchedConcerts = concerts.filter((item) => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      `${item.name} ${item.category} ${item.artist} ${item.location}`
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesGenre =
      selectedGenre === 'Pop' ||
      item.category.toLowerCase().includes(selectedGenre.toLowerCase());

    return matchesSearch && matchesGenre;
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#080D1C"
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandWrap}>
            <View style={styles.logoIcon}>
              <Music2 size={17} color="#FFFFFF" />
            </View>

            <View>
              <Text style={styles.logo}>LYNORA</Text>
              <Text style={styles.tagline}>
                Hello, Music Lovers. Enjoy the moment.
              </Text>
            </View>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setFilterVisible(false);
              navigation.navigate('Explore', {
                search: searchText,
                genre: selectedGenre,
              });
            }}
          >
            <Search size={16} color="#858DA5" />
          </TouchableOpacity>

          <TextInput
            placeholder="Cari artis, konser, atau lokasi..."
            placeholderTextColor="#858DA5"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={() => {
              setFilterVisible(false);
              navigation.navigate('Explore', {
                search: searchText,
                genre: selectedGenre,
              });
            }}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setFilterVisible((visible) => !visible)}
          >
            <SlidersHorizontal size={16} color="#A9B0C5" />
          </TouchableOpacity>
        </View>

        {filterVisible && (
          <View style={styles.homeFilterPanel}>
            {genres.map((genre) => {
              const active = selectedGenre === genre;
              return (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.homeFilterChip,
                    active && styles.homeFilterChipActive,
                  ]}
                  onPress={() => {
                    setSelectedGenre(genre);
                    setFilterVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.homeFilterText,
                      active && styles.homeFilterTextActive,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* FEATURED BANNER */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000',
          }}
          style={styles.featuredBanner}
        >
          <LinearGradient
            colors={[
              'rgba(9,13,29,0.20)',
              'rgba(9,13,29,0.95)',
            ]}
            style={styles.featuredOverlay}
          >
            <View style={styles.featuredTop}>
              <Text style={styles.availableBadge}>
                TERSEDIA
              </Text>

              <Text style={styles.featuredPrice}>
                Mulai Rp 1.250.000
              </Text>
            </View>

            <View>
              <Text style={styles.featuredSmall}>
                WORLD TOUR 2026
              </Text>

              <Text style={styles.featuredTitle}>
                BLACKPINK WORLD TOUR
              </Text>

              <Text style={styles.featuredArtist}>
                [BORN PINK] JAKARTA
              </Text>

              <View style={styles.featuredInfo}>
                <CalendarDays size={11} color="#B9B2FF" />

                <Text style={styles.featuredInfoText}>
                  19–21 Nov 2026
                </Text>

                <MapPin size={11} color="#B9B2FF" />

                <Text style={styles.featuredInfoText}>
                  Gelora Bung Karno
                </Text>
              </View>

              <View style={styles.featuredButtons}>
                <TouchableOpacity
            style={styles.buyButton}
            onPress={() =>
              navigation.navigate('ConcertDetail', {
                concert: {
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
                },
              })
            }
          >
                  <Ticket size={13} color="#FFFFFF" />

                  <Text style={styles.buyButtonText}>
                    Beli Tiket Sekarang
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.playButton}>
                  <Play
                    size={14}
                    color="#FFFFFF"
                    fill="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* GENRE */}
        <SectionTitle
          title="Browse by Genre"
          action="Semua"
          onAction={() => setSelectedGenre('Pop')}
        />

        <ScrollView
          ref={genreScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreList}
        >
          {genres.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreButton,
                selectedGenre === genre && styles.genreActive,
              ]}
              onPress={() => setSelectedGenre(genre)}
              activeOpacity={0.8}
            >
              <Music2
                size={12}
                color={selectedGenre === genre ? '#FFFFFF' : '#AAB1C6'}
              />

              <Text
                style={[
                  styles.genreText,
                  selectedGenre === genre && styles.genreTextActive,
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.moreGenre}
            onPress={() => genreScrollRef.current?.scrollToEnd({ animated: true })}
          >
            <ChevronRight size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </ScrollView>

        {/* UPCOMING CONCERT */}
        <SectionTitle title="Upcoming Concert" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.upcomingList}
        >
          {genreMatchedConcerts.length > 0 ? (
            genreMatchedConcerts.map((item) => (
              <ConcertCard
                key={item.id}
                item={item}
                navigation={navigation}
              />
            ))
          ) : (
            <View style={styles.genreEmpty}>
              <Music2 size={28} color="#8D70FF" />
              <Text style={styles.genreEmptyText}>
                Belum ada konser {selectedGenre}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* RECOMMENDED */}
        <SectionTitle
          title="Recommended For You"
          onAction={() => navigation.navigate('Explore')}
        />

        <TouchableOpacity
          style={styles.recommendedCard}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('ConcertDetail', {
              concert: recommendedConcert,
            })
          }
        >
          <Image
            source={{ uri: recommendedConcert.image }}
            style={styles.recommendedImage}
          />

          <View style={styles.recommendedInfo}>
            <Text style={styles.recommendedCategory}>
              {recommendedConcert.category.toUpperCase()}
            </Text>

            <Text style={styles.recommendedTitle}>
              {recommendedConcert.title}
            </Text>

            <Text style={styles.recommendedSubtitle}>
              Coldplay · Live Performance
            </Text>

            <Text style={styles.recommendedPrice}>
              Mulai {recommendedConcert.price}
            </Text>
          </View>

          <View style={styles.recommendArrow}>
            <ChevronRight size={16} color="#A99BFF" />
          </View>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080D1C',
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#6655ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },

  tagline: {
    color: '#A8B0C5',
    fontSize: 8,
    marginTop: 2,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerIcon: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#1A2036',
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F04B79',
    top: 5,
    right: 6,
  },

  profileCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#343A59',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8E80FF',
  },

  searchContainer: {
    height: 36,
    marginHorizontal: 13,
    backgroundColor: '#171E32',
    borderRadius: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#242C45',
  },

  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 10,
    paddingVertical: 0,
  },

  homeFilterPanel: {
    marginHorizontal: 13,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A324A',
    backgroundColor: '#171E32',
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  homeFilterChip: {
    height: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A324A',
    backgroundColor: '#171E32',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  homeFilterChipActive: {
    backgroundColor: '#6848F5',
    borderColor: '#8069FF',
  },

  homeFilterText: {
    color: '#B2B9CD',
    fontSize: 9,
  },

  homeFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  featuredBanner: {
    height: 185,
    marginHorizontal: 13,
    marginTop: 14,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#202744',
  },

  featuredOverlay: {
    flex: 1,
    padding: 11,
    justifyContent: 'space-between',
    borderRadius: 15,
  },

  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  availableBadge: {
    color: '#FFFFFF',
    backgroundColor: '#E43F6D',
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },

  featuredPrice: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(10,13,28,0.8)',
    padding: 6,
    borderRadius: 5,
  },

  featuredSmall: {
    color: '#B7A9FF',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },

  featuredArtist: {
    color: '#C0B4FF',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 3,
  },

  featuredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },

  featuredInfoText: {
    color: '#E2E4EF',
    fontSize: 8,
    marginRight: 5,
  },

  featuredButtons: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },

  buyButton: {
    flex: 1,
    height: 30,
    backgroundColor: '#6848F5',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  playButton: {
    width: 30,
    height: 30,
    backgroundColor: '#272D43',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionHeader: {
    marginHorizontal: 13,
    marginTop: 18,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  sectionLine: {
    width: 3,
    height: 15,
    backgroundColor: '#8D70FF',
    borderRadius: 3,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  seeAll: {
    color: '#FF5685',
    fontSize: 9,
    fontWeight: 'bold',
  },

  genreList: {
    paddingHorizontal: 13,
    gap: 7,
  },

  genreButton: {
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: '#171E32',
    borderWidth: 1,
    borderColor: '#2A324A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  genreActive: {
    backgroundColor: '#6848F5',
    borderColor: '#8069FF',
  },

  genreText: {
    color: '#B2B9CD',
    fontSize: 9,
  },

  genreTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  moreGenre: {
    width: 28,
    height: 28,
    borderRadius: 20,
    backgroundColor: '#171E32',
    justifyContent: 'center',
    alignItems: 'center',
  },

  upcomingList: {
    paddingHorizontal: 7,
  },
  genreEmpty: {
    width: 278,
    height: 120,
    marginHorizontal: 6,
    borderRadius: 15,
    backgroundColor: '#111A2E',
    borderWidth: 1,
    borderColor: '#28314A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreEmptyText: {
    color: '#AEB6C9',
    fontSize: 10,
    marginTop: 8,
  },

  concertCard: {
    width: 278,
    marginHorizontal: 6,
    marginBottom: 13,
    borderRadius: 15,
    backgroundColor: '#111A2E',
    borderWidth: 1,
    borderColor: '#28314A',
    overflow: 'hidden',
  },

  concertImage: {
    height: 145,
    justifyContent: 'space-between',
    padding: 10,
  },

  imageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusBadge: {
    color: '#FFFFFF',
    backgroundColor: '#10A77A',
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },

  newBadge: {
    backgroundColor: '#D9366D',
  },

  bookmarkButton: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: 'rgba(8,13,28,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  priceBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(8,13,28,0.85)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },

  priceBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  concertContent: {
    padding: 11,
  },

  concertName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  concertCategory: {
    color: '#A99BFF',
    fontSize: 9,
    marginTop: 4,
  },

  concertDescription: {
    color: '#929CB3',
    fontSize: 8,
    lineHeight: 13,
    marginTop: 8,
    marginBottom: 7,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  },

  detailText: {
    color: '#AEB6C9',
    fontSize: 8,
    flex: 1,
  },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#28314A',
    marginTop: 10,
    paddingTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  availableText: {
    color: '#36D6A1',
    fontSize: 8,
    fontWeight: 'bold',
  },

  detailButton: {
    backgroundColor: '#28314D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },

  detailButtonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  recommendedCard: {
    marginHorizontal: 13,
    backgroundColor: '#151D33',
    borderWidth: 1,
    borderColor: '#29324C',
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  recommendedImage: {
    width: 53,
    height: 53,
    borderRadius: 8,
  },

  recommendedInfo: {
    flex: 1,
  },

  recommendedCategory: {
    color: '#43BDF5',
    fontSize: 8,
    fontWeight: 'bold',
  },

  recommendedTitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
  },

  recommendedSubtitle: {
    color: '#929CB3',
    fontSize: 8,
    marginTop: 3,
  },

  recommendedPrice: {
    color: '#C1B5FF',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 5,
  },

  recommendArrow: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: '#29234D',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
