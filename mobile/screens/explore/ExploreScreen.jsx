
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Image, ImageBackground,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import {
  Search, MapPin, CalendarDays, ChevronDown, X, ArrowUpDown, Music2, Flag, DollarSign, Grid2X2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import {
  fetchHomeConcerts, fetchHomeCategories, fetchHomeWishlist,
  setHomeWishlist,
} from '../../services/homeService';
import { subscribeWishlist, publishWishlistIds } from '../../services/wishlistStore';

const COLORS = {
  bg: '#0B1122',
  card: '#202A4F',
  panel: '#151E36',
  purple: '#8B5CF6',
  cyan: '#22D3EE',
  primary: '#5456DE',
  accent: '#C30437',
  white: '#FFFFFF',
  muted: '#A9AAB4',
};

const ALL_CITIES = 'All Indonesia';

const CITIES = [
  ALL_CITIES, 'Jakarta', 'Bandung', 'Surabaya', 'Bali',
  'Yogyakarta', 'Medan', 'Semarang', 'Makassar',
];

const DATE_FILTERS = [
  { value: 'all', label: 'Any date' },
  { value: 'this-month', label: 'This month' },
  { value: 'next-month', label: 'Next month' },
  { value: '3-months', label: 'Next 3 months' },
];

const PRICE_FILTERS = [
  { value: 'all', label: 'Any price' },
  { value: 'lt-500', label: 'Under Rp 500.000' },
  { value: '500-1000', label: 'Rp 500.000 – 1.000.000' },
  { value: '1000-2000', label: 'Rp 1.000.000 – 2.000.000' },
  { value: 'gt-2000', label: 'Above Rp 2.000.000' },
];

const SORTS = [
  { value: 'relevant', label: 'Most Relevant' },
  { value: 'date', label: 'Soonest Date' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

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

const CATEGORY_ICONS = {
  pop: require('../../assets/categories/microphone.png'),
  rock: require('../../assets/categories/hand.png'),
  'hip-hop': require('../../assets/categories/boombox.png'),
  'hip hop': require('../../assets/categories/boombox.png'),
  edm: require('../../assets/categories/technology.png'),
  kpop: require('../../assets/categories/disco-ball.png'),
  'k-pop': require('../../assets/categories/disco-ball.png'),
  indie: require('../../assets/categories/wave-sound.png'),
  festival: require('../../assets/categories/festivall.png'),
};

const DEFAULT_CATEGORY_ICON = require('../../assets/categories/category (1).png');

const ICONS = {
  calendar: require('../../assets/icons/calendar (1).png'),
  pin: require('../../assets/icons/pin.png'),
  organizer: require('../../assets/icons/circus.png'),
  wish: require('../../assets/icons/wishlist.png'),
  wishActive: require('../../assets/icons/wishlist(1).png'),
};

function money(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return 'Price unavailable';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function dateLabel(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date).replace(',', ' ·');
}

function statusFor(item) {
  const lifecycle = String(item.lifecycle_status || '').toLowerCase();

  if (lifecycle === 'ongoing') return STATUS.ongoing;
  if (lifecycle === 'completed') return STATUS.completed;

  return STATUS[String(item.sales_status || '').toLowerCase()]
    || STATUS.sales_closed;
}

function inCity(item, city) {
  if (city === ALL_CITIES) return true;

  const place = `${item.venue_name || ''} ${item.venue_address || ''}`.toLowerCase();

  const aliases = city === 'Bali'
    ? ['bali', 'denpasar', 'badung']
    : city === 'Yogyakarta'
      ? ['yogyakarta', 'jogja']
      : [city.toLowerCase()];

  return aliases.some((word) => place.includes(word));
}

function inDate(item, filter) {
  if (filter === 'all') return true;

  const date = new Date(item.start_date || '');

  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  if (filter === 'this-month') {
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth();
  }

  if (filter === 'next-month') {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return date.getFullYear() === next.getFullYear()
      && date.getMonth() === next.getMonth();
  }

  if (filter === '3-months') {
    const limit = new Date(now);
    limit.setMonth(limit.getMonth() + 3);

    return date >= now && date <= limit;
  }

  return true;
}

function inPrice(item, filter) {
  if (filter === 'all') return true;

  if (item.price == null || !Number.isFinite(Number(item.price))) {
    return false;
  }

  const price = Number(item.price);

  if (filter === 'lt-500') return price < 500000;
  if (filter === '500-1000') return price >= 500000 && price <= 1000000;
  if (filter === '1000-2000') return price > 1000000 && price <= 2000000;
  if (filter === 'gt-2000') return price > 2000000;

  return true;
}

function matchesCategory(item, selectedCategory) {
  if (
    selectedCategory === 'all'
    || selectedCategory === 'All'
    || selectedCategory === 'All categories'
    || selectedCategory == null
  ) {
    return true;
  }

  const selectedId = String(selectedCategory).trim();
  const itemCategoryId = String(item.category_id ?? '').trim();

  const selectedName = String(selectedCategory).trim().toLowerCase();
  const itemCategoryName = String(item.category_name ?? '').trim().toLowerCase();

  return itemCategoryId === selectedId || itemCategoryName === selectedName;
}

/* DROPDOWN */

function InlineDropdown({
  label,
  value,
  selectedValue,
  options,
  open,
  onToggle,
  onSelect,
  icon: Icon,
  containerStyle,
}) {
  return (
    <View
      style={[
        styles.dropdownWrap,
        containerStyle,
        open && styles.dropdownWrapOpen,
      ]}
    >
      {label ? <Text style={styles.filterLabel}>{label}</Text> : null}

      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        {Icon ? <Icon size={17} color="#FFFFFF" /> : null}

        <Text style={styles.dropdownValue} numberOfLines={1}>
          {value}
        </Text>

        <ChevronDown size={16} color="#C5CAD8" />
      </TouchableOpacity>

      {open ? (
        <View style={styles.dropdownMenu}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.dropdownScroll}
          >
            {options.map((option) => {
              const isSelected = String(selectedValue) === String(option.value);

              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={styles.dropdownOption}
                  activeOpacity={0.7}
                  onPress={() => onSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.dropdownOptionActive,
                    ]}
                  >
                    {option.label}
                  </Text>

                  {isSelected ? (
                    <Text style={styles.checkMark}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function SectionHeading({ title, subtitle, right }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.headingLeft}>
        <LinearGradient
          colors={[COLORS.purple, COLORS.cyan]}
          style={styles.headingBar}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {right}
    </View>
  );
}

function ConcertTile({ item, navigation, saved, onSave, width }) {
  const status = statusFor(item);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { width }]}
      onPress={() => navigation.navigate('ConcertDetail', { concert: item })}
    >
      <View style={styles.posterWrap}>
        {item.poster_url ? (
          <Image
            source={{ uri: item.poster_url }}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#31245D', '#202A4F', '#0B1122']}
            style={styles.posterFallback}
          >
            <Music2 size={28} color="#A78BFA" />

            <Text style={styles.fallbackName} numberOfLines={2}>
              {item.name}
            </Text>

            <Text style={styles.fallbackTag}>LYNORA LIVE</Text>
          </LinearGradient>
        )}

        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onSave(item)}
          hitSlop={8}
          accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Image
            source={saved ? ICONS.wishActive : ICONS.wish}
            style={styles.saveIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{money(item.price)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>
          {item.category_name || 'Live Concert'}
        </Text>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {item.description || `Enjoy an unforgettable live concert experience${item.venue_name ? ` at ${item.venue_name}` : ''}.`}
        </Text>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Image source={ICONS.calendar} style={styles.metaIcon} />
          <Text style={styles.metaText} numberOfLines={2}>
            {dateLabel(item.start_date)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Image source={ICONS.pin} style={styles.metaIcon} />
          <Text style={styles.metaText} numberOfLines={2}>
            {item.venue_name || 'Venue to be announced'}
          </Text>
        </View>

        {item.organizer_name ? (
          <View style={styles.metaRow}>
            <Image source={ICONS.organizer} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.organizer_name}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen({ navigation, route }) {
  const { width: screenWidth } = useWindowDimensions();

  const [concerts, setConcerts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);

  const [search, setSearch] = useState(route?.params?.search || '');

  const [categoryFilter, setCategoryFilter] = useState(
    route?.params?.genre || 'all'
  );

  const [city, setCity] = useState(ALL_CITIES);
  const [dateFilter, setDateFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sort, setSort] = useState('relevant');

  const [openDropdown, setOpenDropdown] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [savingIds, setSavingIds] = useState([]);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const [events, cats] = await Promise.all([
        fetchHomeConcerts(),
        fetchHomeCategories().catch(() => []),
      ]);

      setConcerts(events);
      setCategories(cats);

      try {
        const ids = await fetchHomeWishlist();
        setWishlistIds(ids);
        publishWishlistIds(ids);
      } catch (wishlistError) {
        console.warn(
          '[LYNORA Explore] Wishlist unavailable:',
          wishlistError.message
        );
      }
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load concerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => subscribeWishlist(setWishlistIds), []);

  useEffect(() => {
    if (route?.params?.search !== undefined) {
      setSearch(route.params.search || '');
    }

    if (route?.params?.genre !== undefined) {
      setCategoryFilter(route.params.genre || 'all');
    }
  }, [
    route?.params?.search,
    route?.params?.genre,
    route?.params?.searchTrigger,
  ]);

  const results = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const rows = concerts.filter((item) => {
      const haystack = [
        item.name,
        item.artist,
        item.category_name,
        item.venue_name,
        item.venue_address,
        item.organizer_name,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      const matchSearch = !keyword || haystack.includes(keyword);
      const matchCategory = matchesCategory(item, categoryFilter);

      return (
        matchSearch
        && matchCategory
        && inCity(item, city)
        && inDate(item, dateFilter)
        && inPrice(item, priceFilter)
      );
    });

    if (sort === 'date') {
      rows.sort(
        (a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0)
      );
    }

    if (sort === 'price-low') {
      rows.sort(
        (a, b) => Number(a.price ?? Infinity) - Number(b.price ?? Infinity)
      );
    }

    if (sort === 'price-high') {
      rows.sort(
        (a, b) => Number(b.price ?? -Infinity) - Number(a.price ?? -Infinity)
      );
    }

    return rows;
  }, [
    concerts,
    search,
    categoryFilter,
    city,
    dateFilter,
    priceFilter,
    sort,
  ]);

  const handleWishlist = useCallback(async (item) => {
    const id = Number(item.id);

    if (savingIds.includes(id)) return;

    const alreadySaved = wishlistIds.includes(id);

    setSavingIds((current) => [...current, id]);

    try {
      await setHomeWishlist(id, alreadySaved);

      setWishlistIds((current) => {
        const next = alreadySaved
          ? current.filter((value) => value !== id)
          : [...current, id];
        publishWishlistIds(next);
        return next;
      });
    } catch (saveError) {
      console.warn(
        '[LYNORA Explore] Wishlist update failed:',
        saveError.message
      );
    } finally {
      setSavingIds((current) => current.filter((value) => value !== id));
    }
  }, [wishlistIds, savingIds]);

  const cardGap = 12;
  const horizontalPadding = 30;

  const cardWidth = Math.max(
    150,
    (screenWidth - horizontalPadding - cardGap) / 2
  );

  const activeFilters = [
    city !== ALL_CITIES,
    dateFilter !== 'all',
    priceFilter !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCity(ALL_CITIES);
    setDateFilter('all');
    setPriceFilter('all');
    setSort('relevant');
    setCategoryFilter('all');
    setSearch('');
    setOpenDropdown(null);
  };

  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...categories.map((item) => ({
      value: String(item.id ?? item.category_id),
      label: item.name ?? item.category_name,
    })),
  ];

  const dateOptions = DATE_FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const priceOptions = PRICE_FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const locationOptions = CITIES.map((item) => ({
    value: item,
    label: item,
  }));

  const sortOptions = SORTS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const categoryLabel = categoryOptions.find(
    (item) => String(item.value) === String(categoryFilter)
  )?.label || (
    categoryOptions.find(
      (item) => String(item.label).toLowerCase() === String(categoryFilter).toLowerCase()
    )?.label || 'All categories'
  );

  const selectDropdown = (setter) => (value) => {
    setter(value);
    setOpenDropdown(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.bg}
        translucent={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor="#A78BFA"
            colors={['#8B5CF6']}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandWrap}>
            <View style={styles.logoIcon}>
              <Music2 size={17} color="#FFFFFF" />
            </View>

            <View>
              <Text style={styles.logo}>LYNORA</Text>
              <Text style={styles.tagline}>
                Discover your next live experience.
              </Text>
            </View>
          </View>

          <HeaderActions navigation={navigation} />
        </View>

        <ImageBackground
          source={require('../../assets/auth/home.jpg')}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={[
              'rgba(11,17,34,0.30)',
              'rgba(11,17,34,0.58)',
              'rgba(11,17,34,0.92)',
            ]}
            style={StyleSheet.absoluteFill}
          />

          <Text style={styles.eyebrow}>DISCOVER LIVE EXPERIENCES</Text>

          <Text style={styles.heroTitle}>EXPLORE CONCERTS</Text>

          <Text style={styles.heroDescription}>
            Discover amazing concerts and live events around you.
          </Text>

          <View style={styles.heroControls}>
            <View style={styles.searchBox}>
              <Search size={18} color="#FFFFFF" />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search concerts, artists, or venues..."
                placeholderTextColor="#D0D4E2"
                style={styles.searchInput}
                returnKeyType="search"
              />

              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={17} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <InlineDropdown
              containerStyle={styles.locationDropdown}
              label=""
              value={city}
              selectedValue={city}
              options={locationOptions}
              open={openDropdown === 'location'}
              onToggle={() => setOpenDropdown(
                openDropdown === 'location' ? null : 'location'
              )}
              onSelect={selectDropdown(setCity)}
              icon={Flag}
            />
          </View>
        </ImageBackground>

        <View style={styles.resultsSection}>
          <SectionHeading
            title="All Concerts"
            subtitle="Find the perfect concert for you"
            right={
              <View style={styles.countPill}>
                <Text style={styles.countText}>
                  {results.length} EVENTS
                </Text>
              </View>
            }
          />

          <View style={styles.filtersStack}>
            <InlineDropdown
              label="CATEGORY"
              value={categoryLabel}
              selectedValue={categoryFilter}
              options={categoryOptions}
              open={openDropdown === 'category'}
              onToggle={() => setOpenDropdown(
                openDropdown === 'category' ? null : 'category'
              )}
              onSelect={selectDropdown(setCategoryFilter)}
              icon={Grid2X2}
            />

            <InlineDropdown
              label="DATE"
              value={DATE_FILTERS.find(
                (item) => item.value === dateFilter
              )?.label || 'Any date'}
              selectedValue={dateFilter}
              options={dateOptions}
              open={openDropdown === 'date'}
              onToggle={() => setOpenDropdown(
                openDropdown === 'date' ? null : 'date'
              )}
              onSelect={selectDropdown(setDateFilter)}
              icon={CalendarDays}
            />

            <InlineDropdown
              label="PRICE"
              value={PRICE_FILTERS.find(
                (item) => item.value === priceFilter
              )?.label || 'Any price'}
              selectedValue={priceFilter}
              options={priceOptions}
              open={openDropdown === 'price'}
              onToggle={() => setOpenDropdown(
                openDropdown === 'price' ? null : 'price'
              )}
              onSelect={selectDropdown(setPriceFilter)}
              icon={DollarSign}
            />
          </View>

          <View style={styles.sortRow}>
            <Text style={styles.resultText}>
              Showing {results.length} concerts
            </Text>

            <InlineDropdown
              label="SORT BY"
              value={SORTS.find(
                (item) => item.value === sort
              )?.label || 'Most Relevant'}
              selectedValue={sort}
              options={sortOptions}
              open={openDropdown === 'sort'}
              onToggle={() => setOpenDropdown(
                openDropdown === 'sort' ? null : 'sort'
              )}
              onSelect={selectDropdown(setSort)}
              icon={ArrowUpDown}
            />
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#A78BFA" size="large" />
              <Text style={styles.loadingText}>Loading concerts...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                Unable to load concerts
              </Text>

              <Text style={styles.emptyText}>{error}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadData()}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : results.length ? (
            <View style={styles.grid}>
              {results.map((item) => (
                <ConcertTile
                  key={item.id}
                  item={item}
                  navigation={navigation}
                  saved={wishlistIds.includes(Number(item.id))}
                  onSave={handleWishlist}
                  width={cardWidth}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Search size={30} color="#8B92A8" />

              <Text style={styles.emptyTitle}>No concerts found</Text>

              <Text style={styles.emptyText}>
                Try another keyword or adjust your filters.
              </Text>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>
                  Clear all filters
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollContent: {
    paddingBottom: 18,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  logoIcon: {
    width: 32,
    height: 32,
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
    fontSize: 9,
    marginTop: 2,
  },

  hero: {
    marginHorizontal: 15,
    marginTop: 3,
    padding: 14,
    minHeight: 195,
    justifyContent: 'flex-end',
    borderRadius: 16,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
    backgroundColor: '#151B35',
    zIndex: 10,
  },

  heroImage: {
    borderRadius: 16,
  },

  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },

  locationDropdown: {
    flex: 0,
    width: 132,
  },

  eyebrow: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 7,
    letterSpacing: 0.3,
  },

  heroDescription: {
    color: '#C1C7D8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    marginBottom: 13,
  },

  searchBox: {
    height: 46,
    borderRadius: 10,
    backgroundColor: 'rgba(84,86,222,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    gap: 9,
    flex: 1,
    minWidth: 0,
  },

  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11,
    paddingVertical: 0,
  },

  sectionHeading: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  headingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  headingBar: {
    width: 4,
    height: 29,
    borderRadius: 4,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: '#929BB7',
    fontSize: 9,
    marginTop: 3,
  },

  resultsSection: {
    marginTop: 24,
    zIndex: 5,
  },

  countPill: {
    backgroundColor: '#202A4F',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  countText: {
    color: '#A78BFA',
    fontSize: 8,
    fontWeight: '900',
  },

  sortRow: {
    paddingHorizontal: 16,
    marginTop: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 4,
  },

  resultText: {
    color: '#A9AAB4',
    fontSize: 10,
    flex: 1,
  },

  filtersStack: {
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 2,
    zIndex: 5,
  },

  dropdownWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    zIndex: 1,
  },

  dropdownWrapOpen: {
    zIndex: 999,
    elevation: 20,
  },

  filterLabel: {
    color: '#A9B0C5',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  dropdownButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
    backgroundColor: '#1B2342',
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  dropdownValue: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    flex: 1,
  },

  dropdownMenu: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 190,
    zIndex: 1000,
    elevation: 25,
    borderRadius: 10,
    backgroundColor: '#171F3A',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
    overflow: 'hidden',
  },

  dropdownScroll: {
    maxHeight: 190,
  },

  dropdownOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },

  dropdownOptionText: {
    color: '#E5E7EF',
    fontSize: 10,
    fontWeight: '600',
  },

  dropdownOptionActive: {
    color: COLORS.cyan,
    fontWeight: '900',
  },

  checkMark: {
    color: COLORS.cyan,
    fontSize: 15,
    fontWeight: '900',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    gap: 12,
    justifyContent: 'space-between',
  },

  card: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
    backgroundColor: COLORS.card,
    marginBottom: 1,
  },

  posterWrap: {
    height: 112,
    position: 'relative',
    backgroundColor: '#31245D',
  },

  poster: {
    width: '100%',
    height: '100%',
  },

  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },

  fallbackName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },

  fallbackTag: {
    color: COLORS.cyan,
    fontSize: 7,
    letterSpacing: 1.5,
    marginTop: 3,
  },

  statusBadge: {
    position: 'absolute',
    left: 7,
    top: 7,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxWidth: '72%',
  },

  statusText: {
    fontSize: 7,
    fontWeight: '900',
  },

  saveButton: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(11,17,34,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveIcon: {
    width: 16,
    height: 16,
  },

  priceBadge: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    backgroundColor: 'rgba(11,17,34,0.94)',
    borderWidth: 1,
    borderColor: COLORS.purple,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxWidth: '90%',
  },

  priceText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },

  cardBody: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  cardCategory: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '900',
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    marginTop: 3,
  },

  description: {
    color: '#A9AAB4',
    fontSize: 8,
    lineHeight: 11,
    marginTop: 4,
    minHeight: 22,
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
    marginTop: 7,
    marginBottom: 6,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 5,
  },

  metaIcon: {
    width: 11,
    height: 11,
    marginTop: 1,
  },

  metaText: {
    color: '#D1D5E0',
    fontSize: 7.5,
    lineHeight: 10,
    flex: 1,
  },

  loading: {
    paddingVertical: 45,
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    color: '#A9AAB4',
    fontSize: 11,
  },

  emptyBox: {
    marginHorizontal: 15,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#151E36',
    alignItems: 'center',
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
  },

  emptyText: {
    color: '#9CA3B8',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 15,
  },

  retryButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
  },

  clearButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },

  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
