import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ticket,
  Download,
  CircleCheck,
  Clock,
  XCircle,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';
import { exportInvoicePdf } from '../../utils/invoicePdf';

const COLORS = {
  background: '#080D1C',
  card: '#111A30',
  purple: '#922EFF',
  purpleLight: '#B9A0FF',
  cyan: '#00D9E8',
  green: '#24D6A0',
  yellow: '#FFC247',
  red: '#FF647C',
  white: '#FFFFFF',
  muted: '#8995B0',
  border: '#27314B',
};

export default function TransactionDetailScreen({ navigation, route }) {
  const order = route?.params?.order || {
    id: '9821',
    date: '14 Oct 2026, 20:15 WIB',
    event: 'BLACKPINK WORLD TOUR - Jakarta',
    location: 'Gelora Bung Karno (GBK)',
    category: 'CAT 1 - VIP Soundcheck',
    quantity: 2,
    price: 'Rp 3.200.000',
    status: 'Berhasil',
    poster: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&h=400&fit=crop',
  };

  const statusColor =
    order.status === 'Berhasil'
      ? COLORS.green
      : order.status === 'Menunggu'
        ? COLORS.yellow
        : COLORS.red;
  const StatusIcon =
    order.status === 'Berhasil'
      ? CircleCheck
      : order.status === 'Menunggu'
        ? Clock
        : XCircle;

  const getAmount = () =>
    Number(order.amount || String(order.price || '').replace(/[^\d]/g, '') || 0);

  const openPayment = () => {
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
          price: order.unitPrice || getAmount() / order.quantity,
        },
        quantity: order.quantity,
        total: getAmount(),
    });
  };

  const reorder = () => {
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
          price: order.unitPrice || getAmount() / order.quantity,
        },
        quantity: order.quantity,
    });
  };

  const downloadInvoice = async () => {
    try {
        await exportInvoicePdf(order);
        if (Platform.OS === 'web') {
          Alert.alert(
            'Invoice',
            'Pilih “Save as PDF” pada jendela cetak untuk menyimpan invoice.',
          );
        }
    } catch (error) {
        Alert.alert(
          'Invoice gagal dibuat',
          error.message || 'Silakan coba lagi.',
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <HeaderActions navigation={navigation} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.summaryCard}>
          {order.poster ? (
            <Image source={{ uri: order.poster }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Ticket size={28} color={COLORS.purpleLight} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId}>#ORD-{order.id}</Text>
            <Text style={styles.eventTitle}>{order.event}</Text>
            <View style={styles.statusRow}>
              <StatusIcon size={15} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {order.statusDetail || order.status}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Informasi Pesanan</Text>
        <View style={styles.infoCard}>
          <InfoRow icon={CalendarDays} label="Tanggal Pesanan" value={order.date} />
          <InfoRow icon={MapPin} label="Lokasi" value={order.location} />
          <InfoRow icon={Ticket} label="Kategori" value={order.category} />
          <InfoRow icon={Ticket} label="Jumlah Tiket" value={`${order.quantity} tiket`} />
        </View>

        <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Pembayaran</Text>
            <Text style={styles.price}>{order.price}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Metode Pembayaran</Text>
            <Text style={styles.value}>{order.paymentMethod || 'QRIS'}</Text>
          </View>
        </View>

        {order.status === 'Berhasil' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                navigation.navigate('TicketDetail', {
                  ticket: {
                    title: order.event,
                    date: order.date,
                    venue: order.location,
                    image: order.poster,
                  },
                  qrValue: `LYNORA-ORDER-${order.id}`,
                })
              }
            >
              <Ticket size={17} color={COLORS.white} />
              <Text style={styles.primaryText}>LIHAT E-TICKET</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={downloadInvoice}
              accessibilityRole="button"
              accessibilityLabel={`Unduh invoice pesanan ${order.id}`}
            >
              <Download size={17} color={COLORS.purpleLight} />
            </TouchableOpacity>
          </View>
        ) : order.status === 'Menunggu' ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openPayment}
          >
            <Text style={styles.primaryText}>BAYAR SEKARANG</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={reorder}
          >
            <Text style={styles.primaryText}>PESAN ULANG</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon size={16} color={COLORS.cyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 72,
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 12,
  },
  poster: { width: 82, height: 105, borderRadius: 10 },
  posterFallback: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderId: { color: COLORS.cyan, fontSize: 11, fontWeight: '800' },
  eventTitle: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    marginTop: 5,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 7,
  },
  label: { color: COLORS.muted, fontSize: 11 },
  value: { color: COLORS.white, fontSize: 12, fontWeight: '700', marginTop: 3 },
  price: { color: COLORS.purpleLight, fontSize: 15, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  primaryText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});
