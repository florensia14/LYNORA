
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
} from 'react-native';

import {
  Search,
  Heart,
  ChevronDown,
  SlidersHorizontal,
  MapPin,
  CalendarDays,
  Ticket,
  Home,
  Compass,
  Wallet,
  Trash2,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';

const COLORS = {
  background: '#080D1C',
  card: '#111A30',
  purple: '#7047F5',
  purpleLight: '#A78BFA',
  white: '#FFFFFF',
  muted: '#929BB2',
  border: '#27314B',
  green: '#20C997',
  red: '#F04472',
};

const initialConcerts = [
  {
    id: 1,
    name: 'LANY â€” Soft World Tour',
    category: 'Indie Pop',
    type: 'Arena Tour',
    date: '30 Okt 2026, 19:00 WIB',
    location: 'Indonesian Arena, Jakarta Pusat',
    organizer: 'Live Entertainment',
    price: 'Rp 850.000+',
    status: 'ON SALE',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900',
  },
  {
    id: 2,
    name: 'Avenged Sevenfold',
    category: 'Metal',
    type: 'World Tour',
    date: '09 Nov 2026, 19:00 WIB',
    location: 'Jakarta International Stadium',
    organizer: 'Music Production',
    price: 'Rp 605.000+',
    status: 'NEW',
    image:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900',
  },
  {
    id: 3,
    name: 'BLACKPINK WORLD TOUR',
    category: 'K-Pop',
    type: 'World Tour 2026',
    date: '19â€“21 Nov 2026',
    location: 'Gelora Bung Karno',
    organizer: 'YG Entertainment',
    price: 'Rp 1.250.000+',
    status: 'HOT',
    image:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900',
  },
  {
    id: 4,
    name: 'Synchronize Fest 2026',
    category: 'Multi Genre',
    type: 'Music Festival',
    date: '05 Des 2026',
    location: 'Gambir Expo, Jakarta',
    organizer: 'Synchronize Festival',
    price: 'Rp 450.000+',
    status: 'ON SALE',
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900',
  },
];

export default function WishlistScreen({ navigation }) {
  const [concerts, setConcerts] = useState(initialConcerts);
  const [activeTab, setActiveTab] = useState('Wishlist');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [sortVisible, setSortVisible] = useState(false);

  const filteredConcerts = concerts.filter((concert) => {
    const matchSearch = concert.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchCategory =
      category === 'Semua' || concert.category === category;

    return matchSearch && matchCategory;
  });

  const removeConcert = (id) => {
    setConcerts((current) =>
      current.filter((concert) => concert.id !== id)
    );
  };

  const renderConcert = (concert) => (
    <View style={styles.concertCard} key={concert.id}>
      <ImageBackground
        source={{ uri: concert.image }}
        style={styles.concertImage}
        imageStyle={styles.imageRadius}
      >
        <View style={styles.imageOverlay} />

        <View style={styles.imageTop}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{concert.status}</Text>
          </View>

          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => removeConcert(concert.id)}
          >
            <Heart size={19} color="#FFFFFF" fill="#F04472" />
          </TouchableOpacity>
        </View>

        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{concert.price}</Text>
        </View>
      </ImageBackground>

      <View style={styles.cardContent}>
        <Text style={styles.concertName}>{concert.name}</Text>

        <Text style={styles.concertCategory}>
          {concert.category} â€¢ {concert.type}
        </Text>

        <Text style={styles.description}>
          Nikmati penampilan musik secara langsung dan rasakan
          pengalaman konser yang tidak terlupakan.
        </Text>

        <View style={styles.infoRow}>
          <CalendarDays size={14} color={COLORS.muted} />
          <Text style={styles.infoText}>{concert.date}</Text>
        </View>

        <View style={styles.infoRow}>
          <MapPin size={14} color={COLORS.muted} />
          <Text style={styles.infoText}>{concert.location}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ticket size={14} color={COLORS.muted} />
          <Text style={styles.infoText}>
            Organized by: {concert.organizer}
          </Text>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <Text style={styles.availableText}>
            â€¢ Tiket Tersedia
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => navigation.navigate('Explore')}
            >
              <Text style={styles.buyButtonText}>Beli Tiket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => navigation.navigate('Explore')}
            >
              <Text style={styles.detailButtonText}>Detail</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="light-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Selamat Datang,</Text>
            <Text style={styles.userName}>Music Lovers ðŸ‘‹</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        {/* TOP TABS */}
        <View style={styles.topTabs}>
          {['Wishlist', 'Upcoming', 'Favorite'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.topTab,
                activeTab === tab && styles.activeTopTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.topTabText,
                  activeTab === tab && styles.activeTopTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>MY WISHLIST</Text>
          <Text style={styles.pageSubtitle}>
            Simpan konser favoritmu dan jangan sampai terlewat.
          </Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Search size={19} color={COLORS.muted} />

          <TextInput
            style={styles.searchInput}
            placeholder="Cari konser di wishlist kamu..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />

          <SlidersHorizontal size={19} color={COLORS.muted} />
        </View>

        {/* FILTER */}
        <View style={styles.filterHeader}>
          <View style={styles.totalContainer}>
            <View style={styles.greenDot} />
            <Text style={styles.totalText}>
              {filteredConcerts.length} Saved Concerts
            </Text>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setSortVisible(!sortVisible)}
            >
              <Text style={styles.filterText}>Category</Text>
              <ChevronDown size={14} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setSortVisible(!sortVisible)}
            >
              <Text style={styles.filterText}>Sort</Text>
              <ChevronDown size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {sortVisible && (
          <View style={styles.categoryOptions}>
            {['Semua', 'Indie Pop', 'Metal', 'K-Pop', 'Multi Genre'].map(
              (item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.categoryOption,
                    category === item && styles.selectedCategory,
                  ]}
                  onPress={() => {
                    setCategory(item);
                    setSortVisible(false);
                  }}
                >
                  <Text style={styles.categoryOptionText}>{item}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {/* CONCERT LIST */}
        {filteredConcerts.length > 0 ? (
          filteredConcerts.map(renderConcert)
        ) : (
          <View style={styles.emptyContainer}>
            <Heart size={45} color={COLORS.purpleLight} />
            <Text style={styles.emptyTitle}>
              Wishlist Kosong
            </Text>
            <Text style={styles.emptyText}>
              Belum ada konser yang sesuai dengan pencarianmu.
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  greeting: {
    color: COLORS.muted,
    fontSize: 12,
  },
  userName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  topTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTopTab: {
    backgroundColor: COLORS.purple,
  },
  topTabText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  activeTopTabText: {
    color: COLORS.white,
  },
  titleSection: {
    marginBottom: 15,
  },
  pageTitle: {
    color: COLORS.purpleLight,
    fontSize: 19,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  searchBox: {
    height: 45,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 18,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  totalText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 7,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: {
    color: COLORS.white,
    fontSize: 10,
  },
  categoryOptions: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryOption: {
    padding: 10,
    borderRadius: 7,
  },
  selectedCategory: {
    backgroundColor: COLORS.purple,
  },
  categoryOptionText: {
    color: COLORS.white,
    fontSize: 12,
  },
  concertCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 17,
  },
  concertImage: {
    height: 165,
    justifyContent: 'space-between',
    padding: 12,
  },
  imageRadius: {
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  imageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  heartButton: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: 'rgba(8,13,28,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(8,13,28,0.90)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  priceText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 13,
  },
  concertName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  concertCategory: {
    color: COLORS.purpleLight,
    fontSize: 11,
    marginTop: 5,
  },
  description: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 17,
    marginTop: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 9,
  },
  infoText: {
    color: COLORS.muted,
    fontSize: 10,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  availableText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 7,
  },
  buyButton: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailButton: {
    backgroundColor: '#26324D',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
  },
  detailButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 70,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 15,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
