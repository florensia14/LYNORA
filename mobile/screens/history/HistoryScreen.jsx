import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Modal,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import { useFocusEffect } from '@react-navigation/native';
import { INITIAL_ORDERS } from '../../data/orders';
import { loadOrders, saveOrders } from '../../utils/orderStorage';

import {
  MapPin,
  Receipt,
  ChevronRight,
  CircleCheck,
  Clock,
  XCircle,
} from 'lucide-react-native';

const COLORS = {
  background: '#080D1C',
  card: '#111A30',
  cardLight: '#18233D',
  purple: '#922EFF',
  purpleLight: '#B9A0FF',
  white: '#FFFFFF',
  muted: '#8995B0',
  border: '#27314B',
  green: '#24D6A0',
  yellow: '#FFC247',
  red: '#FF647C',
};

const FILTERS = ['Semua', 'Berhasil', 'Menunggu', 'Batal'];

const getOrderAmount = (order) =>
  Number(order.amount || String(order.price || '').replace(/[^\d]/g, '') || 0);

const formatCompactCurrency = (amount) => {
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })}M`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

export default function HistoryScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [orderToCancel, setOrderToCancel] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadOrders(INITIAL_ORDERS)
        .then((storedOrders) => {
          if (isActive) {
            setOrders(storedOrders);
          }
        })
        .catch((error) => {
          Alert.alert(
            'Pesanan gagal dimuat',
            error.message || 'Silakan coba buka halaman ini kembali.',
          );
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const filteredOrders =
    activeFilter === 'Semua'
      ? orders
      : orders.filter((order) => order.status === activeFilter);
  const successfulCount = orders.filter(
    (order) => order.status === 'Berhasil',
  ).length;
  const pendingCount = orders.filter(
    (order) => order.status === 'Menunggu',
  ).length;
  const totalSpent = orders
    .filter((order) => order.status === 'Berhasil')
    .reduce((total, order) => total + getOrderAmount(order), 0);

  const openPayment = (order) => {
    navigation.navigate('Payment', {
      orderId: order.id,
      order,
      concert: {
        title: order.event,
        location: order.location,
        date: order.date,
        image: order.poster,
      },
      ticket: {
        name: order.category,
        price: order.unitPrice || getOrderAmount(order) / order.quantity,
      },
      quantity: order.quantity,
      total: getOrderAmount(order),
    });
  };

  const openCheckout = (order) => {
    navigation.navigate('Checkout', {
      orderId: order.id,
      concert: {
        title: order.event,
        location: order.location,
        date: order.date,
        image: order.poster,
        category: order.category,
      },
      ticket: {
        name: order.category,
        price: order.unitPrice || getOrderAmount(order) / order.quantity,
      },
      quantity: order.quantity,
    });
  };

  const openTicket = (order) => {
    navigation.navigate('TicketDetail', {
      ticket: {
        title: order.event,
        date: order.date,
        venue: order.location,
        image: order.poster,
      },
      qrValue: `LYNORA-ORDER-${order.id}`,
    });
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) {
      return;
    }

    const updatedOrders = orders.map((order) =>
      order.id === orderToCancel.id
        ? {
            ...order,
            status: 'Batal',
            statusDetail: 'Dibatalkan',
            action: 'Pesan Ulang',
          }
        : order,
    );

    try {
      await saveOrders(updatedOrders);
      setOrders(updatedOrders);
      setOrderToCancel(null);
    } catch (error) {
      Alert.alert(
        'Pesanan gagal dibatalkan',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Berhasil') return COLORS.green;
    if (status === 'Menunggu') return COLORS.yellow;
    return COLORS.red;
  };

  const getStatusIcon = (status) => {
    if (status === 'Berhasil') return CircleCheck;
    if (status === 'Menunggu') return Clock;
    return XCircle;
  };

  const handleAction = (order) => {
    if (order.status === 'Berhasil') {
      openTicket(order);
    } else if (order.status === 'Menunggu') {
      openPayment(order);
    } else {
      openCheckout(order);
    }
  };

  const renderOrder = (order) => {
    const StatusIcon = getStatusIcon(order.status);
    const statusColor = getStatusColor(order.status);

    return (
      <View style={styles.orderCard} key={order.id}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>#ORD-{order.id}</Text>
            <Text style={styles.orderDate}>{order.date}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${statusColor}18`,
                borderColor: `${statusColor}55`,
              },
            ]}
          >
            <StatusIcon size={11} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {order.statusDetail}
            </Text>
          </View>
        </View>

        <View style={styles.eventContainer}>
          <Image
            source={{ uri: order.poster }}
            style={styles.eventImage}
            resizeMode="cover"
          />

          <View style={styles.eventContent}>
            <Text style={styles.eventName}>{order.event}</Text>

            <View style={styles.eventLocation}>
              <MapPin size={10} color={COLORS.muted} />
              <Text style={styles.eventLocationText}>
                {order.location}
              </Text>
            </View>

            <Text style={styles.categoryText}>
              {order.category} (x{order.quantity})
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Rp</Text>
            <Text style={styles.priceText}>
              {order.price.replace('Rp ', '')}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          {order.status === 'Berhasil' && (
            <TouchableOpacity
              style={styles.invoiceButton}
              onPress={() =>
                navigation.navigate('TransactionDetail', { order })
              }
            >
              <Text style={styles.invoiceText}>Lihat Invoice</Text>
            </TouchableOpacity>
          )}

          {order.status === 'Menunggu' && (
            <TouchableOpacity
              onPress={() => setOrderToCancel(order)}
              accessibilityRole="button"
              accessibilityLabel={`Batalkan pesanan ${order.event}`}
            >
              <Text style={styles.cancelText}>Batalkan</Text>
            </TouchableOpacity>
          )}

          {order.status === 'Batal' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('TransactionDetail', { order })}
            >
              <Text style={styles.invoiceText}>Detail Riwayat</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleAction(order)}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={['#A52EFF', '#7438F5']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>{order.action}</Text>
              <ChevronRight size={13} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greeting}>Halo, Naya</Text>
            <Text style={styles.greetingSubtitle}>
              Temukan info konser terbarumu
            </Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.eyebrow}>LYNORA PASSBOARD</Text>
          <Text style={styles.title}>MY ORDERS</Text>
        </View>

        <View style={styles.summaryContainer}>
          <TouchableOpacity
            style={styles.summaryCard}
            onPress={() => setActiveFilter('Semua')}
            accessibilityRole="button"
            accessibilityLabel="Tampilkan semua pesanan"
          >
            <Text style={styles.summaryNumber}>{orders.length}</Text>
            <Text style={styles.summaryLabel}>Total Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.summaryCard}
            onPress={() => setActiveFilter('Berhasil')}
            accessibilityRole="button"
            accessibilityLabel="Tampilkan pesanan berhasil"
          >
            <Text style={[styles.summaryNumber, { color: COLORS.green }]}>
              {successfulCount}
            </Text>
            <Text style={styles.summaryLabel}>Berhasil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.summaryCard}
            onPress={() => setActiveFilter('Menunggu')}
            accessibilityRole="button"
            accessibilityLabel="Tampilkan pesanan yang diproses"
          >
            <Text style={[styles.summaryNumber, { color: COLORS.yellow }]}>
              {pendingCount}
            </Text>
            <Text style={styles.summaryLabel}>Diproses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.summaryCard}
            onPress={() => setActiveFilter('Berhasil')}
            accessibilityRole="button"
            accessibilityLabel="Tampilkan pesanan yang sudah dibayar"
          >
            <Text style={[styles.summaryNumber, { fontSize: 11 }]}>
              {formatCompactCurrency(totalSpent)}
            </Text>
            <Text style={styles.summaryLabel}>Pengeluaran</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterButton,
                  isActive && styles.activeFilterButton,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.activeFilterText,
                  ]}
                >
                  {filter} (
                  {filter === 'Semua'
                    ? orders.length
                    : orders.filter((order) => order.status === filter).length}
                  )
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredOrders.length > 0 ? (
          filteredOrders.map(renderOrder)
        ) : (
          <View style={styles.emptyContainer}>
            <Receipt size={35} color={COLORS.purpleLight} />
            <Text style={styles.emptyTitle}>Belum Ada Pesanan</Text>
            <Text style={styles.emptyDescription}>
              Pesanan dengan kategori ini belum tersedia.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <Modal
        visible={Boolean(orderToCancel)}
        transparent
        animationType="fade"
        onRequestClose={() => setOrderToCancel(null)}
      >
        {orderToCancel && (
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>Batalkan Pesanan?</Text>
              <Text style={styles.confirmDescription}>
                Pesanan #{orderToCancel.id} untuk {orderToCancel.event} akan
                ditandai sebagai dibatalkan di perangkat ini.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.keepOrderButton}
                  onPress={() => setOrderToCancel(null)}
                >
                  <Text style={styles.keepOrderText}>Jangan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelOrderButton}
                  onPress={confirmCancelOrder}
                >
                  <Text style={styles.cancelOrderText}>Ya, Batalkan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 13,
    paddingTop: 38,
  },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },

  greeting: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  greetingSubtitle: {
    color: COLORS.muted,
    fontSize: 8,
    marginTop: 3,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  notificationButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  avatar: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: '#A84BCE',
    borderWidth: 2,
    borderColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },

  titleSection: {
    marginBottom: 12,
  },

  eyebrow: {
    color: COLORS.purpleLight,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  summaryContainer: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 13,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 5,
    minHeight: 53,
    justifyContent: 'center',
  },

  summaryNumber: {
    color: COLORS.purpleLight,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 6,
  },

  filterScroll: {
    marginBottom: 17,
    marginHorizontal: -13,
  },

  filterContainer: {
    paddingHorizontal: 13,
    gap: 6,
  },

  filterButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  activeFilterButton: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },

  filterText: {
    color: '#A7B0C5',
    fontSize: 8,
    fontWeight: '600',
  },

  activeFilterText: {
    color: COLORS.white,
  },

  orderCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 9,
    marginBottom: 10,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 9,
  },

  orderInfo: {
    flex: 1,
    marginRight: 5,
  },

  orderId: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '800',
  },

  orderDate: {
    color: COLORS.muted,
    fontSize: 7,
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 5,
    maxWidth: 105,
  },

  statusText: {
    fontSize: 7,
    fontWeight: '700',
    flexShrink: 1,
  },

  eventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  eventImage: {
    width: 42,
    height: 55,
    borderRadius: 6,
    backgroundColor: COLORS.cardLight,
  },

  eventContent: {
    flex: 1,
  },

  eventName: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },

  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  eventLocationText: {
    color: COLORS.muted,
    fontSize: 6,
    flexShrink: 1,
  },

  categoryText: {
    color: COLORS.purpleLight,
    fontSize: 6,
    marginTop: 5,
  },

  priceContainer: {
    alignItems: 'flex-end',
    maxWidth: 88,
  },

  priceLabel: {
    color: COLORS.white,
    fontSize: 7,
  },

  priceText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },

  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },

  invoiceButton: {
    paddingVertical: 5,
  },

  invoiceText: {
    color: COLORS.muted,
    fontSize: 8,
  },

  cancelText: {
    color: COLORS.red,
    fontSize: 8,
    fontWeight: '600',
  },

  actionButton: {
    borderRadius: 7,
    overflow: 'hidden',
  },

  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  actionText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '800',
  },

  emptyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    padding: 28,
  },

  emptyTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyDescription: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 7,
    textAlign: 'center',
  },

  bottomSpace: {
    height: 25,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  confirmModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
  },

  confirmTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },

  confirmDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },

  keepOrderButton: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  keepOrderText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },

  cancelOrderButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 8,
  },

  cancelOrderText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
