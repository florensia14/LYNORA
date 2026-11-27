import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import HeaderActions from '../../components/HeaderActions';
import { INITIAL_ORDERS } from '../../data/orders';
import { updateStoredOrder } from '../../utils/orderStorage';
import { loadSettings, saveSettings } from '../../utils/settingsStorage';
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Ticket,
  Clock,
  Smartphone,
  Building2,
} from 'lucide-react-native';

const COLORS = {
  background: '#080B18',
  card: '#11162A',
  purple: '#8B5CF6',
  cyan: '#21D5E8',
  white: '#FFFFFF',
  muted: '#9299B2',
  border: '#252B43',
};

export default function PaymentScreen({ navigation, route }) {
  const order = route?.params || {};
  const concert = order.concert || {};
  const ticket = order.ticket || {};
  const quantity = Number(order.quantity || 1);
  const total = Number(order.total || 0);

  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const paymentUrl = order.paymentUrl || '';
  const [selectedMethod, setSelectedMethod] = useState('QRIS');

  useEffect(() => {
    let active = true;
    loadSettings()
      .then((settings) => {
        const supportedMethods = ['QRIS', 'GoPay', 'Bank Transfer', 'Card'];
        if (active && supportedMethods.includes(settings.defaultPaymentMethod)) {
          setSelectedMethod(settings.defaultPaymentMethod);
        }
      })
      .catch((error) => {
        Alert.alert(
          'Pengaturan pembayaran gagal dimuat',
          error.message || 'Silakan pilih metode pembayaran secara manual.',
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const handlePayment = () => {
    if (!selectedMethod) {
      Alert.alert('Pilih pembayaran', 'Silakan pilih metode pembayaran.');
      return;
    }

    setShowPaymentWebView(true);
  };

  const selectPaymentMethod = async (methodId) => {
    try {
      await saveSettings({ defaultPaymentMethod: methodId });
      setSelectedMethod(methodId);
    } catch (error) {
      Alert.alert(
        'Metode pembayaran gagal disimpan',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const confirmDemoPayment = async () => {
    const orderId = order.orderId || order.order?.id;
    if (orderId) {
      try {
        await updateStoredOrder(
          orderId,
          {
            status: 'Berhasil',
            statusDetail: 'Pembayaran Berhasil',
            action: 'Lihat Tiket',
            amount: total,
            price: `Rp ${Math.round(total).toLocaleString('id-ID')}`,
            unitPrice: Number(ticket.price || 0),
            quantity,
            paymentMethod: selectedMethod,
          },
          INITIAL_ORDERS,
        );
      } catch (error) {
        Alert.alert(
          'Pembayaran gagal disimpan',
          error.message || 'Silakan coba lagi.',
        );
        return;
      }

      setShowPaymentWebView(false);
      navigation.navigate('MainTab', { screen: 'History' });
      return;
    }

    setShowPaymentWebView(false);
    navigation.navigate('MainTab', { screen: 'MyTickets' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={COLORS.white} size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>PEMBAYARAN</Text>
        <HeaderActions navigation={navigation} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={['#25204B', '#151A35', '#11162A']}
          style={styles.statusCard}
        >
          <View style={styles.iconCircle}>
            <CreditCard color={COLORS.cyan} size={30} />
          </View>

          <Text style={styles.statusTitle}>Selesaikan Pembayaran</Text>
          <Text style={styles.statusDescription}>
            Periksa kembali pesanan sebelum melanjutkan pembayaran.
          </Text>

          <Text style={styles.totalLabel}>TOTAL PEMBAYARAN</Text>
          <Text style={styles.totalAmount}>{formatRupiah(total)}</Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>RINGKASAN PESANAN</Text>

        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Ticket color={COLORS.purple} size={21} />
            <Text style={styles.orderTitle}>Detail Tiket</Text>
          </View>

          <View style={styles.separator} />

          <Text style={styles.concertName}>
            {concert.title || concert.name || 'Konser LYNORA'}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kategori Tiket</Text>
            <Text style={styles.infoValue}>
              {ticket.name || ticket.type || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jumlah Tiket</Text>
            <Text style={styles.infoValue}>{quantity} tiket</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Harga Tiket</Text>
            <Text style={styles.infoValue}>
              {formatRupiah(ticket.price)}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Text style={styles.totalRowLabel}>Total</Text>
            <Text style={styles.totalRowValue}>
              {formatRupiah(total)}
            </Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <ShieldCheck color={COLORS.cyan} size={23} />

          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Pembayaran Aman</Text>
            <Text style={styles.noticeDescription}>
              Pesanan terlindungi dan siap diproses menggunakan metode
              pembayaran yang dipilih.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>METODE PEMBAYARAN</Text>

        {[
          { id: 'QRIS', label: 'QRIS', description: 'Scan menggunakan aplikasi pembayaran', Icon: Smartphone },
          { id: 'GoPay', label: 'GoPay', description: 'Pembayaran melalui GoPay', Icon: Smartphone },
          { id: 'Bank Transfer', label: 'Transfer Bank', description: 'Virtual account bank', Icon: Building2 },
          { id: 'Card', label: 'Kartu Kredit / Debit', description: 'Pembayaran menggunakan kartu', Icon: CreditCard },
        ].map((method) => {
          const MethodIcon = method.Icon;
          const selected = selectedMethod === method.id;

          return (
            <TouchableOpacity
              key={method.id}
              activeOpacity={0.85}
              onPress={() => selectPaymentMethod(method.id)}
              style={[
                styles.methodCard,
                selected && styles.methodCardSelected,
              ]}
            >
              <View style={styles.methodIcon}>
                <MethodIcon color={selected ? COLORS.cyan : COLORS.muted} size={21} />
              </View>

              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>{method.label}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>

              <View style={[styles.radioOuter, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={styles.pendingCard}>
          <Clock color="#FBBF24" size={19} />
          <Text style={styles.pendingText}>
            Status pesanan: Menunggu pembayaran
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePayment}
          style={styles.payButtonWrapper}
        >
          <LinearGradient
            colors={[COLORS.purple, '#6335C8']}
            style={styles.payButton}
          >
            <Text style={styles.payButtonText}>BAYAR SEKARANG</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Tiket akan tersedia di menu Tiket Saya setelah pembayaran berhasil
          dikonfirmasi.
        </Text>
      </ScrollView>
      <Modal
        visible={showPaymentWebView}
        animationType="slide"
        onRequestClose={() => setShowPaymentWebView(false)}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowPaymentWebView(false)}
            >
              <ArrowLeft color={COLORS.white} size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>MIDTRANS PAYMENT</Text>
            <HeaderActions navigation={navigation} />
          </View>

          {paymentUrl ? (
            <WebView
              source={{ uri: paymentUrl }}
              style={styles.webView}
              startInLoadingState
            />
          ) : (
            <View style={styles.webViewPlaceholder}>
              <View style={styles.paymentPlaceholderCard}>
                <View style={styles.paymentIconCircle}>
                  <CreditCard color={COLORS.cyan} size={34} />
                </View>

                <Text style={styles.webViewTitle}>
                  Pembayaran Midtrans
                </Text>

                <Text style={styles.webViewDescription}>
                  Konfirmasi pembayaran frontend sedang dipersiapkan.
                </Text>

                <View style={styles.waitingBadge}>
                  <Clock color="#FBBF24" size={15} />
                  <Text style={styles.waitingBadgeText}>
                    SIAP UNTUK PEMBAYARAN
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.demoConfirmButton}
                  onPress={confirmDemoPayment}
                >
                  <Text style={styles.demoConfirmText}>SIMULASI PEMBAYARAN BERHASIL</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 35,
  },
  webViewHeader: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webViewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  paymentPlaceholderCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 25,
    alignItems: 'center',
  },
  paymentIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#25234A',
    borderWidth: 1,
    borderColor: '#493B78',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#292313',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 22,
  },
  waitingBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  paymentHint: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  demoConfirmButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  demoConfirmText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
  webViewTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 18,
  },
  webViewDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 35,
  },
  statusCard: {
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#25234A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  statusDescription: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  totalLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 24,
  },
  totalAmount: {
    color: COLORS.cyan,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 7,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 13,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  concertName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  totalRowLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  totalRowValue: {
    color: COLORS.cyan,
    fontSize: 16,
    fontWeight: '900',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#102331',
    borderRadius: 15,
    padding: 15,
    marginTop: 18,
    gap: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 5,
  },
  noticeDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  methodCardSelected: {
    borderColor: COLORS.purple,
    backgroundColor: '#1B1B38',
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#202641',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  methodDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  radioOuter: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.cyan,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.cyan,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292313',
    borderRadius: 12,
    padding: 13,
    marginTop: 15,
    gap: 9,
  },
  pendingText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  payButtonWrapper: {
    marginTop: 23,
    borderRadius: 15,
    overflow: 'hidden',
  },
  payButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 15,
  },
});
