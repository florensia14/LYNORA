import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Clock3,
  Ticket,
  Users,
  Minus,
  Plus,
  User,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  Building2,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react-native';

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
  green: '#35D6A2',
  yellow: '#FFC857',
};

const defaultConcert = {
  title: 'BLACKPINK WORLD TOUR',
  category: 'POP',
  date: '10 Januari 2027',
  location: 'Gelora Bung Karno, Jakarta',
  image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200',
};

const ticketCategories = [
  {
    id: 1,
    name: 'CAT 1',
    description: 'Area standing',
    price: 1500000,
    stock: 'Tersedia',
    color: '#B34CFF',
  },
  {
    id: 2,
    name: 'CAT 2',
    description: 'Area festival',
    price: 2200000,
    stock: 'Tersedia',
    color: '#21D5E8',
  },
  {
    id: 3,
    name: 'VIP',
    description: 'Area standing VIP',
    price: 3500000,
    stock: 'Terbatas',
    color: '#FF6B9D',
  },
];

const formatPrice = (price) =>
  'Rp ' + Number(price || 0).toLocaleString('id-ID');

export default function BookingScreen({ navigation, route }) {
  const concert = route?.params?.concert || defaultConcert;
  const initialTicket = route?.params?.ticket;

  const [selectedTicket, setSelectedTicket] = useState(() => {
    if (initialTicket) {
      const matched = ticketCategories.find(
        (item) => item.id === initialTicket.id
      );

      return matched
        ? {
            ...matched,
            price: Number(initialTicket.price) || matched.price,
          }
        : {
        ...ticketCategories[0],
        name: initialTicket.name || ticketCategories[0].name,
        price: Number(initialTicket.price) || ticketCategories[0].price,
      };
    }

    return ticketCategories[0];
  });

  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState('QRIS');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  const adminFee = 5000;
  const subtotal = selectedTicket.price * quantity;
  const total = subtotal + adminFee;

  const handleOrder = () => {
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      Alert.alert(
        'Data belum lengkap',
        'Silakan lengkapi nama, email, dan nomor telepon pemesan.'
      );
      return;
    }

    navigation.navigate('Checkout', {
      concert: concert,
      ticket: selectedTicket,
      quantity: quantity,
      buyerName: buyerName,
      buyerEmail: buyerEmail,
      buyerPhone: buyerPhone,
      payment: payment,
      adminFee: adminFee,
      subtotal: subtotal,
      total: total,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={19} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pemesanan Tiket</Text>
          <Text style={styles.headerSubtitle}>Lengkapi pesanan konsermu</Text>
        </View>

        <HeaderActions navigation={navigation} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stepRow}>
          <View style={styles.stepActive}>
            <Text style={styles.stepNumber}>01</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepNumberInactive}>02</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepNumberInactive}>03</Text>
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabelActive}>Pilih Tiket</Text>
            <Text style={styles.stepLabel}>Pembayaran</Text>
            <Text style={styles.stepLabel}>Selesai</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>LYNORA BOOKING</Text>
            <Text style={styles.sectionTitle}>Detail Konser</Text>
          </View>
          <View style={styles.secureBadge}>
            <ShieldCheck size={12} color={COLORS.green} />
            <Text style={styles.secureText}>Secure Order</Text>
          </View>
        </View>

        <View style={styles.concertCard}>
          <ImageBackground
            source={{ uri: concert.image || defaultConcert.image }}
            style={styles.concertImage}
            imageStyle={styles.concertImageRadius}
          >
            <LinearGradient
              colors={['rgba(5,8,24,0.05)', 'rgba(5,8,24,0.95)']}
              style={styles.concertGradient}
            >
              <View style={styles.concertBadge}>
                <Text style={styles.concertBadgeText}>TIKET RESMI</Text>
              </View>
              <View>
                <Text style={styles.concertCategory}>
                  {concert.category || 'MUSIC EVENT'}
                </Text>
                <Text style={styles.concertTitle}>{concert.title}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>

          <View style={styles.concertInfo}>
            <View style={styles.infoRow}>
              <CalendarDays size={14} color={COLORS.purpleLight} />
              <Text style={styles.infoText}>
                {concert.date || defaultConcert.date}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={14} color={COLORS.cyan} />
              <Text style={styles.infoText}>
                {concert.location || defaultConcert.location}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Clock3 size={14} color={COLORS.yellow} />
              <Text style={styles.infoText}>Open Gate 15.00 WIB</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>CHOOSE YOUR SEAT</Text>
            <Text style={styles.sectionTitle}>Kategori & Jenis Tiket</Text>
            <Text style={styles.sectionSubtitle}>
              Pilih kategori tiket yang kamu inginkan
            </Text>
          </View>
        </View>

        {ticketCategories.map((item) => {
          const active = selectedTicket.id === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              style={[
                styles.ticketCard,
                active && styles.ticketCardActive,
              ]}
              onPress={() => setSelectedTicket(item)}
            >
              <View style={styles.ticketTop}>
                <View style={styles.ticketNameRow}>
                  <View
                    style={[
                      styles.ticketColor,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={styles.ticketName}>{item.name}</Text>
                </View>

                <View
                  style={[
                    styles.stockBadge,
                    item.stock === 'Terbatas' && styles.stockLimited,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      item.stock === 'Terbatas' && styles.stockTextLimited,
                    ]}
                  >
                    {item.stock}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketDescription}>
                {item.description}
              </Text>

              <View style={styles.ticketBottom}>
                <View>
                  <Text style={styles.ticketPriceLabel}>Harga per tiket</Text>
                  <Text style={styles.ticketPrice}>
                    {formatPrice(item.price)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    active && styles.radioActive,
                  ]}
                >
                  {active && <View style={styles.radioInner} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>TICKET QUANTITY</Text>
            <Text style={styles.sectionTitle}>Jumlah Tiket</Text>
          </View>
          <Text style={styles.maxTicket}>Maks. 4 tiket</Text>
        </View>

        <View style={styles.quantityCard}>
          <View style={styles.quantityInfo}>
            <Ticket size={20} color={COLORS.purpleLight} />
            <View>
              <Text style={styles.quantityTitle}>Jumlah pembelian</Text>
              <Text style={styles.quantitySubtitle}>
                {selectedTicket.name}
              </Text>
            </View>
          </View>

          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus size={15} color={COLORS.white} />
            </TouchableOpacity>

            <Text style={styles.quantityValue}>{quantity}</Text>

            <TouchableOpacity
              style={styles.quantityButtonActive}
              onPress={() => setQuantity(Math.min(4, quantity + 1))}
            >
              <Plus size={15} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>BUYER INFORMATION</Text>
            <Text style={styles.sectionTitle}>Data Pemesan</Text>
            <Text style={styles.sectionSubtitle}>
              Masukkan informasi pemesan tiket
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Nama Lengkap</Text>
          <View style={styles.inputWrapper}>
            <User size={16} color={COLORS.muted} />
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor="#68738E"
              value={buyerName}
              onChangeText={setBuyerName}
            />
          </View>

          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputWrapper}>
            <Mail size={16} color={COLORS.muted} />
            <TextInput
              style={styles.input}
              placeholder="nama@email.com"
              placeholderTextColor="#68738E"
              keyboardType="email-address"
              autoCapitalize="none"
              value={buyerEmail}
              onChangeText={setBuyerEmail}
            />
          </View>

          <Text style={styles.inputLabel}>Nomor Telepon</Text>
          <View style={styles.inputWrapper}>
            <Phone size={16} color={COLORS.muted} />
            <TextInput
              style={styles.input}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor="#68738E"
              keyboardType="phone-pad"
              value={buyerPhone}
              onChangeText={setBuyerPhone}
            />
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>PAYMENT METHOD</Text>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
            <Text style={styles.sectionSubtitle}>
              Pilih metode pembayaran yang tersedia
            </Text>
          </View>
        </View>

        {[
          { id: 'QRIS', name: 'QRIS', detail: 'Scan QR untuk membayar', icon: 'qr' },
          { id: 'Transfer Bank', name: 'Transfer Bank', detail: 'Virtual account bank', icon: 'bank' },
          { id: 'E-Wallet', name: 'E-Wallet', detail: 'Dompet digital', icon: 'wallet' },
        ].map((item) => {
          const active = payment === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.paymentCard,
                active && styles.paymentCardActive,
              ]}
              onPress={() => setPayment(item.id)}
            >
              <View style={styles.paymentIcon}>
                {item.icon === 'qr' && (
                  <CreditCard size={19} color={COLORS.purpleLight} />
                )}
                {item.icon === 'bank' && (
                  <Building2 size={19} color={COLORS.cyan} />
                )}
                {item.icon === 'wallet' && (
                  <Wallet size={19} color={COLORS.green} />
                )}
              </View>

              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>{item.name}</Text>
                <Text style={styles.paymentDetail}>{item.detail}</Text>
              </View>

              <View
                style={[
                  styles.radio,
                  active && styles.radioActive,
                ]}
              >
                {active && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>ORDER SUMMARY</Text>
            <Text style={styles.sectionTitle}>Ringkasan Pesanan</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryConcert}>{concert.title}</Text>
              <Text style={styles.summaryCategory}>
                {selectedTicket.name} · {quantity} tiket
              </Text>
            </View>
            <View style={styles.summaryTicketIcon}>
              <Ticket size={19} color={COLORS.purpleLight} />
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Harga tiket</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(subtotal)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya layanan</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(adminFee)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total Pembayaran</Text>
            <Text style={styles.summaryTotal}>{formatPrice(total)}</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <ShieldCheck size={17} color={COLORS.green} />
          <Text style={styles.noticeText}>
            Pastikan data pemesan sudah benar sebelum melanjutkan pesanan.
          </Text>
        </View>

        <View style={{ height: 125 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomLabel}>TOTAL PEMBAYARAN</Text>
          <Text style={styles.bottomPrice}>{formatPrice(total)}</Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.85}
          onPress={handleOrder}
        >
          <LinearGradient
            colors={['#B34CFF', '#7428E8']}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>LANJUTKAN</Text>
            <ChevronRight size={17} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
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
    paddingTop: 48,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#171F37',
  },
  headerButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 3,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 25,
  },
  stepActive: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInactive: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: COLORS.cardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },
  stepNumberInactive: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  stepLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabelActive: {
    color: COLORS.purpleLight,
    fontSize: 8,
    fontWeight: '800',
  },
  stepLabel: {
    color: COLORS.muted,
    fontSize: 8,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  eyebrow: {
    color: COLORS.purpleLight,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 5,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#12342F',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  secureText: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: '800',
  },
  concertCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  concertImage: {
    height: 145,
    justifyContent: 'space-between',
  },
  concertImageRadius: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  concertGradient: {
    flex: 1,
    padding: 13,
    justifyContent: 'space-between',
  },
  concertBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#B51F62',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },
  concertBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
  },
  concertCategory: {
    color: '#DAB8FF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  concertTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
  },
  concertInfo: {
    padding: 12,
    gap: 9,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#C2C9DD',
    fontSize: 10,
    flex: 1,
  },
  ticketCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 9,
  },
  ticketCardActive: {
    borderColor: COLORS.purpleLight,
    backgroundColor: '#1D1837',
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ticketColor: {
    width: 7,
    height: 25,
    borderRadius: 5,
  },
  ticketName: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
  stockBadge: {
    backgroundColor: '#123B35',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  stockLimited: {
    backgroundColor: '#40321D',
  },
  stockText: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: '800',
  },
  stockTextLimited: {
    color: COLORS.yellow,
  },
  ticketDescription: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 8,
    marginLeft: 15,
  },
  ticketBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    marginLeft: 15,
  },
  ticketPriceLabel: {
    color: COLORS.muted,
    fontSize: 8,
  },
  ticketPrice: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: COLORS.purpleLight,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 6,
    backgroundColor: COLORS.purpleLight,
  },
  maxTicket: {
    color: COLORS.muted,
    fontSize: 9,
  },
  quantityCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  quantityTitle: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  quantitySubtitle: {
    color: COLORS.muted,
    fontSize: 8,
    marginTop: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonActive: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
  },
  inputLabel: {
    color: '#DCE1F0',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 9,
  },
  inputWrapper: {
    height: 43,
    borderRadius: 9,
    backgroundColor: '#0B1226',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    gap: 9,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 10,
    paddingVertical: 0,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 12,
    marginBottom: 8,
    gap: 11,
  },
  paymentCardActive: {
    borderColor: COLORS.purpleLight,
    backgroundColor: '#1D1837',
  },
  paymentIcon: {
    width: 37,
    height: 37,
    borderRadius: 10,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },
  paymentDetail: {
    color: COLORS.muted,
    fontSize: 8,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryConcert: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
  summaryCategory: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 5,
  },
  summaryTicketIcon: {
    width: 37,
    height: 37,
    borderRadius: 10,
    backgroundColor: '#30204F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 9,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTotalLabel: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  summaryTotal: {
    color: COLORS.purpleLight,
    fontSize: 15,
    fontWeight: '900',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#102B2A',
    borderRadius: 10,
    padding: 11,
    marginTop: 14,
  },
  noticeText: {
    color: '#A8D9CC',
    fontSize: 8,
    flex: 1,
    lineHeight: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#10172D',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomPriceContainer: {
    flex: 1,
  },
  bottomLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  bottomPrice: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  continueButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  continueText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },
});
