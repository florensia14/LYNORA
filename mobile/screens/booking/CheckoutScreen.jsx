import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Ticket,
  CalendarDays,
  MapPin,
  Minus,
  Plus,
  Check,
  Tag,
  Info,
  LockKeyhole,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';

const COLORS = {
  background: '#15121B',
  surfaceLow: '#1D1A24',
  surface: '#221E28',
  surfaceHigh: '#2C2833',
  purple: '#7C3AED',
  purpleLight: '#D2BBFF',
  pink: '#F472B6',
  green: '#34D399',
  greenDark: '#064E3B',
  greenText: '#6EE7B7',
  white: '#E8DFEE',
  muted: '#CCC3D8',
  outline: '#958DA1',
  border: '#4A4455',
};

const formatPrice = (price) =>
  'Rp' + Number(price || 0).toLocaleString('id-ID').replace(/\./g, '.');

export default function CheckoutScreen({ navigation, route }) {
  const order = route?.params || {};
  const concert = order.concert || {};
  const ticket = order.ticket || {};
  const ticketPrice = Number(ticket.price || 0);

  const [quantity, setQuantity] = useState(Number(order.quantity || 1));
  const [fullName, setFullName] = useState(order.buyerName || '');
  const [email, setEmail] = useState(order.buyerEmail || '');
  const [phone, setPhone] = useState(order.buyerPhone || '');
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherFeedback, setVoucherFeedback] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const adminFee = Number(order.adminFee || 5000);
  const subtotal = ticketPrice * quantity;
  const total = Math.max(0, subtotal + adminFee - discount);

  const applyVoucher = () => {
    const code = voucher.trim().toUpper();
    if (!code) {
      setDiscount(0);
      setVoucherFeedback('Masukkan kode voucher terlebih dahulu.');
      return;
    }

    if (code === 'LYNORA10') {
      setDiscount(Math.round(subtotal * 0.1));
      setVoucherFeedback('Voucher LYNORA10 berhasil diterapkan.');
    } else if (code === 'LYNORA') {
      setDiscount(Math.min(50000, subtotal));
      setVoucherFeedback('Voucher LYNORA berhasil diterapkan.');
    } else {
      setDiscount(0);
      setVoucherFeedback('Kode voucher tidak valid.');
    }
  };

  const handlePayment = () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert(
        'Data belum lengkap',
        'Silakan lengkapi nama lengkap, email, dan nomor HP.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Email tidak valid', 'Silakan masukkan alamat email yang benar.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        'Persetujuan dibutuhkan',
        'Setujui syarat dan ketentuan untuk melanjutkan pembayaran.'
      );
      return;
    }

    navigation.navigate('Payment', {
      ...order,
      quantity,
      subtotal,
      adminFee,
      total,
      discount,
      checkoutUser: {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>
          Selesaikan pemesanan tiketmu untuk menonton konser favoritmu.
        </Text>

        <View style={styles.stepper}>
          {[
            ['1.', 'Order'],
            ['2.', 'Payment'],
            ['3.', 'E-Ticket'],
          ].map(([number, label], index) => (
            <View
              key={label}
              style={[styles.stepItem, index === 0 && styles.stepActive]}
            >
              <Text
                style={[styles.stepText, index === 0 && styles.stepTextActive]}
              >
                {number}
              </Text>
              <Text
                style={[styles.stepText, index === 0 && styles.stepTextActive]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.eventCard}>
          {concert.image ? (
            <Image
              source={{ uri: concert.image }}
              style={styles.eventImage}
            />
          ) : (
            <View style={[styles.eventImage, styles.eventImageFallback]}>
              <Ticket size={24} color={COLORS.purpleLight} />
            </View>
          )}

          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {concert.title || 'Konser'}
            </Text>
            <Text style={styles.eventCategory} numberOfLines={1}>
              [{ticket.name || 'CAT 1'}] {concert.category || 'JAKARTA'}
            </Text>
            <View style={styles.eventDetailRow}>
              <CalendarDays size={13} color={COLORS.outline} />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {concert.date || '-'}
              </Text>
            </View>
            <View style={styles.eventDetailRow}>
              <MapPin size={13} color={COLORS.outline} />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {concert.location || '-'}
              </Text>
            </View>
          </View>
        </View>

        <SectionTitle title="Ticket Selection" />
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketIcon}>
              <Ticket size={20} color={COLORS.purpleLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketTitle}>
                {ticket.name || 'CAT 1'} – Festival Floor
              </Text>
              <Text style={styles.ticketDescription}>
                Standing area dekat dengan stage.
              </Text>
            </View>
          </View>

          {[
            'Akses area festival (standing)',
            'View panggung lebih dekat',
            'Merchandise booth area',
          ].map((perk) => (
            <View key={perk} style={styles.perkRow}>
              <Check size={15} color={COLORS.purpleLight} />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}

          <View style={styles.ticketPriceRow}>
            <View>
              <Text style={styles.priceLabel}>Harga per Tiket</Text>
              <Text style={styles.ticketPrice}>{formatPrice(ticketPrice)}</Text>
            </View>

            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={[styles.quantityButton, quantity <= 1 && styles.quantityDisabled]}
                onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                activeOpacity={0.8}
              >
                <Minus size={17} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, quantity >= 4 && styles.quantityDisabled]}
                onPress={() => setQuantity((value) => Math.min(4, value + 1))}
                disabled={quantity >= 4}
                activeOpacity={0.8}
              >
                <Plus size={17} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.ticketMetaRow}>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>Sisa Kuota: 520 tiket</Text>
            </View>
            <Text style={styles.maxText}>Maks. 4 tiket / akun</Text>
          </View>
        </View>

        <SectionTitle title="Informasi Pemesan (Attendee)" />
        <View style={styles.formCard}>
          <InputLabel
            label="Full Name"
            icon={<User size={17} color={COLORS.outline} />}
            placeholder="Nama lengkap sesuai KTP"
            value={fullName}
            onChangeText={setFullName}
          />
          <InputLabel
            label="Email Address"
            icon={<Mail size={17} color={COLORS.outline} />}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <InputLabel
            label="Phone Number"
            icon={<Phone size={17} color={COLORS.outline} />}
            placeholder="+62 812-0000-0000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.voucherCard}>
          <View style={styles.voucherHeading}>
            <Tag size={18} color={COLORS.purpleLight} />
            <Text style={styles.voucherTitle}>Voucher / Promo Code</Text>
          </View>
          <View style={styles.voucherRow}>
            <TextInput
              style={styles.voucherInput}
              placeholder="Masukkan kode voucher"
              placeholderTextColor={COLORS.outline}
              value={voucher}
              onChangeText={setVoucher}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyVoucher}
              activeOpacity={0.8}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {!!voucherFeedback && (
            <Text
              style={[
                styles.voucherFeedback,
                discount === 0 && styles.voucherFeedbackError,
              ]}
            >
              {voucherFeedback}
            </Text>
          )}
        </View>

        <SectionTitle title="Order Summary" />
        <View style={styles.summaryCard}>
          <SummaryRow
            label={`Ticket (${ticket.name || 'CAT 1'}) × ${quantity}`}
            value={formatPrice(subtotal)}
          />
          <SummaryRow
            label="Platform / Service Fee"
            value={formatPrice(adminFee)}
            info
          />
          <SummaryRow
            label="Voucher Discount"
            value={discount > 0 ? '-' + formatPrice(discount) : 'Rp0'}
            success
          />
          <View style={styles.summaryDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payment</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAcceptedTerms((value) => !value)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
            {acceptedTerms && <Check size={13} color={COLORS.white} />}
          </View>
          <Text style={styles.termsText}>
            Saya telah membaca dan menyetujui{' '}
            <Text style={styles.termsLink}>Syarat & Ketentuan</Text>,{' '}
            <Text style={styles.termsLink}>Kebijakan Pembelian</Text>, dan{' '}
            <Text style={styles.termsLink}>Kebijakan Refund</Text> dari LYNORA.
          </Text>
        </TouchableOpacity>

        <View style={{ height: 116 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalRow}>
          <Text style={styles.bottomLabel}>Total Payment</Text>
          <Text style={styles.bottomPrice}>{formatPrice(total)}</Text>
        </View>
        <TouchableOpacity
          style={styles.payButton}
          activeOpacity={0.85}
          onPress={handlePayment}
        >
          <Ticket size={19} color={COLORS.white} />
          <Text style={styles.payText}>Continue to Payment</Text>
        </TouchableOpacity>
        <View style={styles.secureRow}>
          <LockKeyhole size={13} color={COLORS.outline} />
          <Text style={styles.secureText}>Secure payment powered by </Text>
          <Text style={styles.secureBrand}>midtrans</Text>
        </View>
      </View>
    </View>
  );
}

function SectionTitle({ title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function InputLabel({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
}) {
  return (
    <View style={styles.inputLabelWrap}>
      <Text style={styles.inputLabel}>
        {label} <Text style={styles.requiredMark}>*</Text>
      </Text>
      <View style={styles.inputContainer}>
        {icon}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.outline}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value, info, success }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLabelWrap}>
        <Text style={styles.summaryLabel}>{label}</Text>
        {info && <Info size={14} color={COLORS.outline} />}
      </View>
      <Text style={[styles.summaryValue, success && styles.summarySuccess]}>
        {value}
      </Text>
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
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  brand: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  brandAccent: {
    color: COLORS.purpleLight,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  stepper: {
    height: 45,
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceLow,
    padding: 4,
    flexDirection: 'row',
  },
  stepItem: {
    flex: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepActive: {
    backgroundColor: COLORS.purple,
  },
  stepText: {
    color: COLORS.outline,
    fontSize: 11,
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#EDE0FF',
  },
  eventCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 16,
    gap: 16,
  },
  eventImage: {
    width: 96,
    height: 80,
    borderRadius: 9,
  },
  eventImageFallback: {
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  eventCategory: {
    color: COLORS.pink,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  eventDetailText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 11,
  },
  sectionTitleRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 8,
    gap: 8,
  },
  sectionLine: {
    width: 4,
    height: 16,
    borderRadius: 4,
    backgroundColor: COLORS.purple,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  ticketCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ticketIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  ticketDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  perkText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  ticketPriceRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    color: COLORS.outline,
    fontSize: 11,
  },
  ticketPrice: {
    color: COLORS.pink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  quantityControl: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityDisabled: {
    opacity: 0.4,
  },
  quantityValue: {
    width: 28,
    color: COLORS.white,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  ticketMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockBadge: {
    borderRadius: 20,
    backgroundColor: COLORS.greenDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stockText: {
    color: COLORS.greenText,
    fontSize: 11,
  },
  maxText: {
    color: COLORS.outline,
    fontSize: 10,
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  inputLabelWrap: {
    marginBottom: 14,
  },
  inputLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  requiredMark: {
    color: COLORS.pink,
  },
  inputContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 13,
    paddingLeft: 10,
  },
  voucherCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  voucherHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voucherTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  voucherRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    color: COLORS.white,
    fontSize: 12,
    paddingHorizontal: 12,
  },
  applyButton: {
    height: 44,
    minWidth: 66,
    borderRadius: 9,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#EDE0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  voucherFeedback: {
    color: COLORS.green,
    fontSize: 11,
    marginTop: 8,
  },
  voucherFeedbackError: {
    color: '#FFB4AB',
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  summaryRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  summarySuccess: {
    color: COLORS.green,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalRow: {
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    color: COLORS.purpleLight,
    fontSize: 20,
    fontWeight: '800',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.purple,
  },
  termsText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  termsLink: {
    color: COLORS.purpleLight,
    textDecorationLine: 'underline',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#100D16',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  bottomTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    color: COLORS.muted,
    fontSize: 11,
  },
  bottomPrice: {
    color: COLORS.purpleLight,
    fontSize: 16,
    fontWeight: '700',
  },
  payButton: {
    height: 48,
    marginTop: 8,
    borderRadius: 9,
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payText: {
    color: '#EDE0FF',
    fontSize: 13,
    fontWeight: '700',
  },
  secureRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureText: {
    color: COLORS.outline,
    fontSize: 10,
  },
  secureBrand: {
    color: COLORS.muted,
    fontSize: 10,
  },
});
