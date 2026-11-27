
import React, { useCallback, useState } from 'react';
import HeaderActions from '../../components/HeaderActions';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { INITIAL_NOTIFICATIONS } from '../../data/notifications';
import {
  loadNotifications,
  saveNotifications,
} from '../../utils/notificationStorage';

import {
  ArrowLeft,
  Bell,
  Ticket,
  CalendarDays,
  Tag,
  CheckCheck,
  ChevronRight,
  Gift,
  Megaphone,
  CircleHelp,
  MapPin,
  Copy,
  Sparkles,
} from 'lucide-react-native';

const filters = ['All', 'Unread', 'Transactions & Payments'];

const getIcon = (type) => {
  switch (type) {
    case 'ticket':
      return Ticket;
    case 'event':
      return CalendarDays;
    case 'promo':
      return Gift;
    case 'announcement':
      return Megaphone;
    case 'support':
      return CircleHelp;
    default:
      return Bell;
  }
};

const getColor = (type) => {
  switch (type) {
    case 'ticket':
      return '#F87171';
    case 'event':
      return '#34D399';
    case 'promo':
      return '#FBBF24';
    case 'announcement':
      return '#A78BFA';
    case 'support':
      return '#C084FC';
    default:
      return '#A78BFA';
  }
};

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadNotifications()
        .then((storedNotifications) => {
          if (active) {
            setNotifications(storedNotifications);
          }
        })
        .catch((error) => {
          Alert.alert(
            'Notifikasi gagal dimuat',
            error.message || 'Silakan coba buka halaman ini kembali.',
          );
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const unreadCount = notifications.filter(
    (item) => item.unread
  ).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'Unread') {
      return item.unread;
    }

    if (activeFilter === 'Transactions & Payments') {
      return item.type === 'ticket' || item.type === 'event';
    }

    return true;
  });
  const todayNotifications = filteredNotifications.filter(
    (item) => item.time.includes('minutes') || item.time.includes('hours'),
  );
  const yesterdayNotifications = filteredNotifications.filter((item) =>
    item.time.includes('Yesterday'),
  );
  const weekNotifications = filteredNotifications.filter((item) =>
    item.time.includes('days'),
  );

  const saveUpdatedNotifications = async (updatedNotifications) => {
    try {
      await saveNotifications(updatedNotifications);
      setNotifications(updatedNotifications);
    } catch (error) {
      Alert.alert(
        'Perubahan notifikasi gagal disimpan',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const markRead = (id) => {
    const updatedNotifications = notifications.map((item) =>
      item.id === id ? { ...item, unread: false } : item,
    );
    return saveUpdatedNotifications(updatedNotifications);
  };

  const markAllRead = () => {
    return saveUpdatedNotifications(
      notifications.map((item) => ({ ...item, unread: false })),
    );
  };

  const openTickets = () => {
    navigation.navigate('MainTab', { screen: 'MyTickets' });
  };

  const openExplore = () => {
    navigation.navigate('MainTab', {
      screen: 'Explore',
      params: { search: 'Festival', searchTrigger: Date.now() },
    });
  };

  const openLocationGuide = async () => {
    const mapUrl =
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent('Jakarta International Stadium');
    try {
      await Linking.openURL(mapUrl);
    } catch (error) {
      Alert.alert(
        'Peta tidak dapat dibuka',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const copyPromoCode = async () => {
    try {
      await Clipboard.setStringAsync('LYNORA15');
      Alert.alert('Kode promo disalin', 'LYNORA15 siap ditempel.');
    } catch (error) {
      Alert.alert(
        'Kode promo gagal disalin',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const renderNotification = (item) => {
    const Icon = getIcon(item.type);
    const color = getColor(item.type);

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        style={[
          styles.notificationCard,
          item.unread && styles.unreadCard,
        ]}
        onPress={() => markRead(item.id)}
      >
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: `${color}20` },
          ]}
        >
          <Icon size={17} color={color} />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationTop}>
            <Text style={[styles.categoryLabel, { color }]}>
              {item.category}
            </Text>

            <Text style={styles.notificationTime}>
              {item.time}
            </Text>
          </View>

          <Text style={styles.notificationTitle}>
            {item.title}
          </Text>

          <Text style={styles.notificationMessage}>
            {item.message}
          </Text>

          {item.type === 'ticket' && (
            <View style={styles.notificationPosterRow}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400',
                }}
                style={styles.miniPoster}
              />

              <View style={styles.miniPosterInfo}>
                <Text style={styles.miniPosterTitle}>
                  H.E.R. WORLD TOUR 2026
                </Text>
                <Text style={styles.miniPosterSubtitle}>
                  Jakarta International Stadium
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewTicketButton}
                onPress={() => {
                  markRead(item.id);
                  openTickets();
                }}
              >
                <Text style={styles.viewTicketText}>View Ticket</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.type === 'event' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() => {
                  markRead(item.id);
                  Alert.alert(
                    'Informasi pengembalian dana',
                    'Rincian refund untuk notifikasi ini tidak tersedia pada data demo lokal. Tidak ada refund yang diproses.',
                  );
                }}
              >
                <Text style={styles.smallActionText}>
                  Full Refund Details
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() => {
                  markRead(item.id);
                  openLocationGuide();
                }}
              >
                <Text style={styles.smallActionText}>
                  Check Location Guide
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {item.type === 'promo' && (
            <TouchableOpacity
              style={styles.buyNowButton}
              onPress={() => {
                markRead(item.id);
                openExplore();
              }}
            >
              <Text style={styles.buyNowText}>Buy Now</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {item.unread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#080B18"
        barStyle="light-content"
      />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.avatarBorder}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              }}
              style={styles.avatar}
            />
          </View>

          <View>
            <Text style={styles.greeting}>Halo, Naya</Text>
            <Text style={styles.memberText}>
              Welcome to your unforgettable experience
            </Text>
          </View>
        </View>

        <HeaderActions navigation={navigation} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* MEMBERSHIP */}
        <View style={styles.membershipRow}>
          <View style={styles.memberBadge}>
            <Sparkles size={10} color="#34D399" />
            <Text style={styles.memberBadgeText}>
              LYNORA ELITE
            </Text>
          </View>

          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>
              3 CONCERT ACTIVITIES
            </Text>
          </View>
        </View>

        {/* PAGE TITLE */}
        <Text style={styles.pageTitle}>Notification Center</Text>

        <Text style={styles.pageDescription}>
          Latest updates on ticket purchases, payment confirmations,
          concert schedule changes, and exclusive promotions just for you.
        </Text>

        {/* FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.filterActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterActiveText,
                ]}
              >
                {filter === 'Unread'
                  ? `Unread (${unreadCount})`
                  : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {todayNotifications.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>
                TODAY'S IMPORTANT NOTIFICATIONS
              </Text>
              <Text style={styles.sectionCount}>
                {todayNotifications.filter((item) => item.unread).length} NEW
              </Text>
            </View>
            {todayNotifications.map(renderNotification)}
          </>
        )}

        {filteredNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Tidak ada notifikasi untuk filter ini.
            </Text>
          </View>
        )}

        {/* UPCOMING CONCERT */}
        {activeFilter === 'All' && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>
                YOUR UPCOMING CONCERT
              </Text>

              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.concertCard}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900',
                }}
                style={styles.concertPoster}
                resizeMode="cover"
              />

              <View style={styles.concertDetails}>
                <View style={styles.concertInfo}>
                  <Text style={styles.concertName}>
                    H.E.R. WORLD TOUR 2026
                  </Text>
                  <Text style={styles.concertVenue}>
                    <MapPin size={10} color="#9CA3AF" /> Jakarta International Stadium
                  </Text>
                </View>

                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownLabel}>
                    Kelola tiket konser di halaman Tiket Saya.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.openTicketButton}
                  onPress={openTickets}
                >
                  <Text style={styles.openTicketButtonText}>
                    Open Fast Track Ticket
                  </Text>
                  <ChevronRight size={15} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* PROMO CODE */}
        {activeFilter === 'All' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>
                SPECIAL PROMOTION
              </Text>
            </View>

            <View style={styles.promoCard}>
              <View style={styles.promoIcon}>
                <Tag size={19} color="#FBBF24" />
              </View>

              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>
                  15% Off Festival Asia Tour
                </Text>
                <Text style={styles.promoDescription}>
                  Enjoy your exclusive discount!
                </Text>
                <Text style={styles.promoCode}>Code: LYNORA15</Text>
              </View>

              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyPromoCode}
              >
                <Copy size={12} color="#FFFFFF" />
                <Text style={styles.copyButtonText}>Copy Code</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* YESTERDAY */}
        {yesterdayNotifications.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>
                YESTERDAY · UPDATES
              </Text>
            </View>
            {yesterdayNotifications.map(renderNotification)}
          </>
        )}

        {/* THIS WEEK */}
        {weekNotifications.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>
                THIS WEEK · ANNOUNCEMENTS & EVENT UPDATES
              </Text>
            </View>
            {weekNotifications.map(renderNotification)}
          </>
        )}

        {/* MARK ALL */}
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={markAllRead}
          disabled={unreadCount === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: unreadCount === 0 }}
        >
          <CheckCheck size={15} color="#A78BFA" />
          <Text style={styles.markAllText}>
            {unreadCount > 0
              ? 'Mark all notifications as read'
              : 'All notifications are read'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          YOU'RE ALL CAUGHT UP WITH LYNORA
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080B18',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2235',
  },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#171E32',
    borderWidth: 1,
    borderColor: '#2A324A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  avatarBorder: {
    width: 38,
    height: 38,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    padding: 2,
    marginRight: 10,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },

  greeting: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  memberText: {
    color: '#8992A8',
    fontSize: 8,
    marginTop: 3,
  },

  headerBell: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#171D30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#EC4899',
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 35,
  },

  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },

  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#103B32',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  memberBadgeText: {
    color: '#34D399',
    fontSize: 8,
    fontWeight: '800',
  },

  activeBadge: {
    backgroundColor: '#282044',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  activeBadgeText: {
    color: '#C4B5FD',
    fontSize: 8,
    fontWeight: '800',
  },

  pageTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 5,
  },

  pageDescription: {
    color: '#929BB0',
    fontSize: 10,
    lineHeight: 16,
    marginBottom: 15,
  },

  filterContainer: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 18,
  },

  filterButton: {
    backgroundColor: '#151C30',
    borderWidth: 1,
    borderColor: '#293149',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  filterActive: {
    backgroundColor: '#7438D8',
    borderColor: '#945BFF',
  },

  filterText: {
    color: '#A3ABC0',
    fontSize: 9,
    fontWeight: '700',
  },

  filterActiveText: {
    color: '#FFFFFF',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },

  sectionHeading: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  sectionCount: {
    color: '#34D399',
    fontSize: 8,
    fontWeight: '800',
  },

  emptyState: {
    backgroundColor: '#11192A',
    borderWidth: 1,
    borderColor: '#293149',
    borderRadius: 11,
    padding: 14,
    marginBottom: 10,
  },

  emptyStateText: {
    color: '#929BB0',
    fontSize: 10,
    textAlign: 'center',
  },

  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#11192A',
    borderWidth: 1,
    borderColor: '#222C43',
    borderRadius: 12,
    padding: 11,
    marginBottom: 9,
    position: 'relative',
  },

  unreadCard: {
    borderColor: '#47356F',
    backgroundColor: '#17172D',
  },

  notificationIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  notificationContent: {
    flex: 1,
    paddingRight: 5,
  },

  notificationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },

  categoryLabel: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  notificationTime: {
    color: '#78839A',
    fontSize: 7,
  },

  notificationTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 15,
    marginBottom: 4,
  },

  notificationMessage: {
    color: '#9CA6BA',
    fontSize: 8,
    lineHeight: 13,
  },

  unreadDot: {
    position: 'absolute',
    right: 9,
    top: 10,
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: '#22D3EE',
  },

  notificationPosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1222',
    borderRadius: 8,
    padding: 6,
    marginTop: 9,
  },

  miniPoster: {
    width: 43,
    height: 39,
    borderRadius: 5,
  },

  miniPosterInfo: {
    flex: 1,
    marginLeft: 7,
  },

  miniPosterTitle: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },

  miniPosterSubtitle: {
    color: '#8992A8',
    fontSize: 7,
    marginTop: 4,
  },

  viewTicketButton: {
    backgroundColor: '#6540D4',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6,
  },

  viewTicketText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
  },

  smallActionButton: {
    flex: 1,
    backgroundColor: '#202A40',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },

  smallActionText: {
    color: '#D0D7E5',
    fontSize: 7,
    fontWeight: '700',
  },

  buyNowButton: {
    backgroundColor: '#7138DC',
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  buyNowText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },

  upcomingSection: {
    marginTop: 8,
    marginBottom: 17,
  },

  liveBadge: {
    backgroundColor: '#103B32',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  liveBadgeText: {
    color: '#34D399',
    fontSize: 8,
    fontWeight: '900',
  },

  concertCard: {
    backgroundColor: '#11192A',
    borderWidth: 1,
    borderColor: '#293149',
    borderRadius: 13,
    padding: 8,
  },

  concertPoster: {
    width: '100%',
    height: 135,
    borderRadius: 8,
  },

  concertDetails: {
    paddingHorizontal: 4,
    paddingTop: 10,
  },

  concertInfo: {
    marginBottom: 10,
  },

  concertName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  concertVenue: {
    color: '#9CA6BA',
    fontSize: 8,
    marginTop: 5,
  },

  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0B1324',
    borderRadius: 9,
    paddingVertical: 10,
    marginBottom: 9,
  },

  countdownItem: {
    alignItems: 'center',
  },

  countdownNumber: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '900',
  },

  countdownLabel: {
    color: '#8992A8',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },

  openTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#7438D8',
    borderRadius: 8,
    paddingVertical: 10,
  },

  openTicketButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151C30',
    borderWidth: 1,
    borderColor: '#34304C',
    borderRadius: 11,
    padding: 11,
    marginBottom: 17,
  },

  promoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#42331B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  promoContent: {
    flex: 1,
    marginLeft: 9,
  },

  promoTitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  promoDescription: {
    color: '#929BB0',
    fontSize: 8,
    marginTop: 3,
  },

  promoCode: {
    color: '#FBBF24',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },

  copyButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6,
  },

  copyButtonText: {
    color: '#111827',
    fontSize: 7,
    fontWeight: '900',
  },

  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#17172D',
    borderWidth: 1,
    borderColor: '#44346D',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },

  markAllText: {
    color: '#B7A5F7',
    fontSize: 9,
    fontWeight: '800',
  },

  footerText: {
    color: '#606B82',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 20,
  },
});
