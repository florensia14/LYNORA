import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  MapPin,
  Minus,
  Plus,
  Ticket,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';
import { apiRequest } from '../../services/api';
import { fetchConcertById } from '../../services/concertService';

const C = {
  bg: '#0B1020',
  panel: '#161624',
  field: '#20203A',
  border: '#676D89',
  purple: '#8B5CF6',
  purpleLight: '#B9A7FF',
  cyan: '#22D3EE',
  white: '#FFFFFF',
  muted: '#A9B0C5',
  red: '#F87171',
  amber: '#F5B84E',
};

const MIDTRANS_CLIENT_KEY = process.env.EXPO_PUBLIC_MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_IS_PRODUCTION =
  process.env.EXPO_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
const MAX_TICKETS = 10;

const money = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'Tanggal belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tanggal belum tersedia';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date) + ' WIB';
};

const makeAttendee = () => ({ full_name: '', email: '', phone: '' });

function getSnapHtml(token) {
  const scriptUrl = MIDTRANS_IS_PRODUCTION
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
  const safeToken = JSON.stringify(token);
  const clientKey = JSON.stringify(MIDTRANS_CLIENT_KEY);
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
html,body{margin:0;padding:0;background:#0B1020;color:#fff;font-family:Arial,sans-serif}
#state{padding:28px 20px;text-align:center;color:#A9B0C5;font-size:14px}
</style>
</head>
<body>
<div id="state">Menyiapkan pembayaran Midtrans...</div>
<script src="${scriptUrl}" data-client-key=${clientKey}></script>
<script>
(function(){
  var token=${safeToken};
  function send(type, detail){
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:type,detail:detail||null}));
    }
  }
  function start(){
    if(!window.snap){send('error','Midtrans Snap gagal dimuat.');return;}
    document.getElementById('state').innerText='Silakan selesaikan pembayaran pada jendela Midtrans.';
    window.snap.pay(token,{
      onSuccess:function(result){send('success',result);},
      onPending:function(result){send('pending',result);},
      onError:function(result){send('error',result);},
      onClose:function(){send('close');}
    });
  }
  if(document.readyState==='complete'){start();}
  else{window.addEventListener('load',start);}
})();
</script>
</body>
</html>`;
}

function SectionTitle({ children }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, optional, autoCapitalize }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {label}{!optional && <Text style={styles.required}> *</Text>}
        {optional && <Text style={styles.optional}> (Optional)</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#858BA3"
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'words'}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export default function CheckoutScreen({ navigation, route }) {
  const routeOrder = route?.params || {};
  const routeConcert = routeOrder.concert || {};
  const routeTicket = routeOrder.ticket || {};
  const eventId = Number(routeOrder.eventId || routeConcert.id);
  const categoryId = Number(routeTicket.id || routeOrder.ticketCategoryId);
  const initialQuantity = Math.max(1, Math.min(MAX_TICKETS, Number(routeOrder.quantity || 1)));

  const [concert, setConcert] = useState(routeConcert);
  const [ticket, setTicket] = useState(routeTicket);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [attendees, setAttendees] = useState(() =>
    Array.from({ length: initialQuantity }, makeAttendee),
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [snapHtml, setSnapHtml] = useState('');
  const [showSnap, setShowSnap] = useState(false);

  useEffect(() => {
    setAttendees((current) =>
      Array.from({ length: quantity }, (_, index) => current[index] || makeAttendee()),
    );
  }, [quantity]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (!Number.isSafeInteger(eventId) || eventId <= 0) {
          throw new Error('ID konser tidak valid. Silakan pilih konser kembali.');
        }
        const detail = await fetchConcertById(eventId);
        if (!active) return;
        setConcert({ ...routeConcert, ...detail });
        const categories = Array.isArray(detail.ticket_categories) ? detail.ticket_categories : [];
        const matched = categories.find((item) => Number(item.id) === categoryId);
        if (matched) {
          setTicket(matched);
        } else if (!routeTicket.id && categories.length) {
          setTicket(categories[0]);
        } else {
          throw new Error('Kategori tiket tidak ditemukan. Silakan pilih tiket kembali.');
        }
      } catch (e) {
        if (active) setError(e?.message || 'Gagal memuat detail checkout.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [eventId, categoryId]);

  const subtotal = Number(ticket?.price || 0) * quantity;
  const remaining = Number(ticket?.remaining ?? ticket?.stock ?? 0);
  const salesStatus = String(concert?.sales_status || '').toLowerCase();
  const eventEnded = String(concert?.lifecycle_status || '').toLowerCase() === 'completed';
  const unavailable =
    eventEnded ||
    salesStatus !== 'on_sale' ||
    (Number.isFinite(remaining) && remaining > 0 && quantity > remaining);

  const updateAttendee = (index, field, value) => {
    setAttendees((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const validateAttendees = () => {
    if (attendees.length !== quantity) return 'Jumlah data attendee tidak sesuai jumlah tiket.';
    for (let i = 0; i < attendees.length; i += 1) {
      const item = attendees[i];
      if (!item.full_name.trim()) return `Nama lengkap attendee ${i + 1} wajib diisi.`;
      if (item.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email.trim())) {
        return `Format email attendee ${i + 1} tidak valid.`;
      }
    }
    return '';
  };

  const checkPaymentStatus = async (id = orderId) => {
    if (!id) return false;
    setCheckingStatus(true);
    try {
      const result = await apiRequest(`/payments/orders/${id}/status`);
      const payment = String(result.payment_status || '').toLowerCase();
      const orderState = String(result.order_status || '').toLowerCase();
      setPaymentStatus(payment || orderState || 'pending');
      if (['success', 'paid', 'settlement'].includes(payment) ||
          ['paid', 'completed'].includes(orderState)) {
        setShowSnap(false);
        Alert.alert('Pembayaran berhasil', 'Pembayaran terkonfirmasi. Tiket kamu dapat dilihat di My Tickets.', [
          { text: 'Lihat My Tickets', onPress: () => navigation.navigate('MainTab', { screen: 'MyTickets' }) },
        ]);
        return true;
      }
      setError(`Pembayaran belum dikonfirmasi. Status saat ini: ${payment || 'pending'}.`);
      return false;
    } catch (e) {
      setError(e?.message || 'Gagal memeriksa status pembayaran.');
      return false;
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleContinuePayment = async () => {
    if (processing) return;
    setError('');
    if (!concert || !ticket?.id) {
      setError('Data konser atau kategori tiket belum tersedia.');
      return;
    }
    if (unavailable) {
      setError('Penjualan tiket belum tersedia atau kuota tidak mencukupi.');
      return;
    }
    const attendeeError = validateAttendees();
    if (attendeeError) {
      setError(attendeeError);
      return;
    }
    if (!agreed) {
      setError('Silakan setujui syarat dan ketentuan terlebih dahulu.');
      return;
    }
    if (!MIDTRANS_CLIENT_KEY) {
      setError('EXPO_PUBLIC_MIDTRANS_CLIENT_KEY belum diatur di file .env mobile.');
      return;
    }

    try {
      setProcessing(true);
      // Keep the same API contract as Customer Web: POST /orders/checkout { items }.
      const orderResult = await apiRequest('/orders/checkout', {
        method: 'POST',
        body: {
          items: [{
            ticket_category_id: Number(ticket.id),
            quantity,
            attendees: attendees.map((item) => ({
              full_name: item.full_name.trim(),
              email: item.email.trim() || null,
              phone: item.phone.trim() || null,
            })),
          }],
        },
      });
      const createdOrderId = Number(orderResult?.order?.id);
      if (!Number.isSafeInteger(createdOrderId) || createdOrderId <= 0) {
        throw new Error('ID order tidak diterima dari backend.');
      }
      setOrderId(createdOrderId);

      const paymentResult = await apiRequest(`/payments/orders/${createdOrderId}/payment`, {
        method: 'POST',
      });
      const snapToken = paymentResult?.payment?.snap_token;
      if (!snapToken) throw new Error('Snap token Midtrans tidak diterima dari backend.');

      setSnapHtml(getSnapHtml(snapToken));
      setShowSnap(true);
    } catch (e) {
      setError(e?.message || 'Gagal memproses checkout.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSnapMessage = async (event) => {
    let message;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.type === 'success' || message.type === 'pending' || message.type === 'error' || message.type === 'close') {
      if (message.type === 'error') setError('Midtrans melaporkan pembayaran bermasalah. Periksa status pesanan sebelum mencoba lagi.');
      if (message.type === 'pending') setPaymentStatus('pending');
      if (message.type === 'success') setPaymentStatus('waiting-confirmation');
      if (message.type === 'close') setPaymentStatus('unconfirmed');
      // Never issue tickets from the WebView callback. Confirm with backend.
      await checkPaymentStatus();
    }
  };

  const poster = concert?.poster_url || concert?.hero_image_url || concert?.banner_url || concert?.image;
  const title = concert?.name || concert?.title || 'Concert';
  const venue = [concert?.venue_name, concert?.venue_address].filter(Boolean).join(' · ') || concert?.location || 'Venue to be announced';

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>Complete your order</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.stepper}>
            {['1  Order Details', '2  Payment', '3  E-Ticket'].map((step, index) => (
              <View key={step} style={[styles.step, index === 0 && styles.stepActive]}>
                <Text style={[styles.stepText, index === 0 && styles.stepTextActive]}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.eventCard}>
            {poster ? <Image source={{ uri: poster }} style={styles.poster} /> : <View style={[styles.poster, styles.posterFallback]}><Ticket color={C.purpleLight} size={26} /></View>}
            <View style={styles.eventDetails}>
              <Text style={styles.liveTag}>LIVE EVENT</Text>
              <Text style={styles.eventTitle}>{title}</Text>
              <View style={styles.metaRow}><CalendarDays size={13} color={C.muted} /><Text style={styles.metaText}>{formatDate(concert?.start_date || concert?.date)}</Text></View>
              <View style={styles.metaRow}><MapPin size={13} color={C.muted} /><Text style={styles.metaText}>{venue}</Text></View>
            </View>
          </View>

          <SectionTitle>Ticket Selection</SectionTitle>
          <View style={styles.card}>
            <View style={styles.ticketTop}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketName}>{ticket?.name || 'Ticket'}</Text>
                <Text style={styles.ticketBenefit}>{ticket?.benefit || ticket?.description || 'Enjoy the live concert experience.'}</Text>
              </View>
              <Text style={styles.ticketPrice}>{money(ticket?.price)}</Text>
            </View>
            <View style={styles.quantityRow}>
              <View>
                <Text style={styles.quantityLabel}>Quantity</Text>
                <Text style={styles.hint}>Maximum 10 tickets per order</Text>
              </View>
              <View style={styles.quantityControl}>
                <TouchableOpacity style={styles.quantityButton} disabled={quantity <= 1} onPress={() => setQuantity((v) => Math.max(1, v - 1))}><Minus size={16} color={C.white} /></TouchableOpacity>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <TouchableOpacity style={styles.quantityButton} disabled={quantity >= MAX_TICKETS || (remaining > 0 && quantity >= remaining)} onPress={() => setQuantity((v) => Math.min(MAX_TICKETS, remaining > 0 ? Math.min(remaining, v + 1) : v + 1))}><Plus size={16} color={C.white} /></TouchableOpacity>
              </View>
            </View>
            <Text style={styles.remaining}>{ticket?.remaining ?? '—'} tickets remaining</Text>
          </View>

          <SectionTitle>Attendee Information</SectionTitle>
          <View style={styles.card}>
            {attendees.map((attendee, index) => (
              <View key={index} style={styles.attendeeCard}>
                <Text style={styles.attendeeTitle}>Attendee {index + 1}</Text>
                <Field label="Full Name" value={attendee.full_name} onChangeText={(v) => updateAttendee(index, 'full_name', v)} placeholder="Enter attendee full name" />
                <Field label="Email Address" optional value={attendee.email} onChangeText={(v) => updateAttendee(index, 'email', v)} placeholder="Enter attendee email address" keyboardType="email-address" autoCapitalize="none" />
                <Field label="Phone Number" optional value={attendee.phone} onChangeText={(v) => updateAttendee(index, 'phone', v)} placeholder="+62" keyboardType="phone-pad" autoCapitalize="none" />
              </View>
            ))}
            <Text style={styles.attendeeNote}>Enter the details of each ticket holder. If an email is left blank, the e-ticket will use the email registered on the purchaser's LYNORA account.</Text>
          </View>

          <SectionTitle>Order Summary</SectionTitle>
          <View style={styles.card}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{ticket?.name || 'Ticket'} × {quantity}</Text><Text style={styles.summaryValue}>{money(subtotal)}</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}><Text style={styles.totalLabel}>Total Payment</Text><Text style={styles.totalValue}>{money(subtotal)}</Text></View>
          </View>

          <TouchableOpacity style={styles.agreement} onPress={() => setAgreed((v) => !v)}>
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>{agreed && <Check size={13} color={C.white} />}</View>
            <Text style={styles.agreementText}>I have read and agree to the LYNORA Terms & Conditions and policies.</Text>
          </TouchableOpacity>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!orderId && <TouchableOpacity style={styles.statusButton} disabled={checkingStatus} onPress={() => checkPaymentStatus()}><Text style={styles.statusButtonText}>{checkingStatus ? 'Checking payment...' : 'Check Payment Status'}</Text></TouchableOpacity>}
          {!!paymentStatus && <Text style={styles.paymentStatus}>Payment status: {paymentStatus}</Text>}
          <TouchableOpacity style={[styles.continueButton, (processing || unavailable) && styles.disabledButton]} disabled={processing || unavailable} onPress={handleContinuePayment}>
            {processing ? <ActivityIndicator color={C.white} /> : <Text style={styles.continueText}>Continue to Payment →</Text>}
          </TouchableOpacity>
          <Text style={styles.secureText}>Secure payment powered by Midtrans.</Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showSnap} animationType="slide" onRequestClose={() => setShowSnap(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSnap(false)} style={styles.backButton}><ArrowLeft size={20} color={C.white} /></TouchableOpacity>
            <Text style={styles.modalTitle}>MIDTRANS PAYMENT</Text>
            <View style={{ width: 40 }} />
          </View>
          {snapHtml ? <WebView source={{ html: snapHtml }} onMessage={handleSnapMessage} javaScriptEnabled domStorageEnabled startInLoadingState renderLoading={() => <View style={styles.center}><ActivityIndicator color={C.cyan} size="large" /></View>} /> : <View style={styles.center}><Text style={styles.loadingText}>Preparing payment...</Text></View>}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: C.muted, marginTop: 12, fontSize: 12 },
  header: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.18)', gap: 10 },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel },
  headerText: { flex: 1 },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: C.muted, fontSize: 10, marginTop: 2 },
  scrollContent: { padding: 16, gap: 14 },
  stepper: { flexDirection: 'row', gap: 7 },
  step: { flex: 1, backgroundColor: '#20203A', paddingVertical: 11, paddingHorizontal: 5, borderRadius: 9, alignItems: 'center' },
  stepActive: { backgroundColor: '#6255DF' },
  stepText: { color: C.muted, fontSize: 9, fontWeight: '800' },
  stepTextActive: { color: C.white },
  eventCard: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: C.border, borderRadius: 13, backgroundColor: C.panel, padding: 12 },
  poster: { width: 104, height: 112, borderRadius: 9, backgroundColor: C.field },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  eventDetails: { flex: 1, gap: 6 },
  liveTag: { alignSelf: 'flex-start', color: '#FF6B81', backgroundColor: '#2F1E2A', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 4, fontSize: 8, fontWeight: '900' },
  eventTitle: { color: C.white, fontSize: 14, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText: { color: C.muted, fontSize: 10, flex: 1, lineHeight: 15 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  sectionAccent: { width: 4, height: 24, borderRadius: 4, backgroundColor: C.cyan },
  sectionTitle: { color: C.white, fontSize: 14, fontWeight: '900' },
  card: { borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, borderRadius: 12, padding: 13, gap: 12 },
  ticketTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ticketInfo: { flex: 1, gap: 4 },
  ticketName: { color: C.white, fontSize: 13, fontWeight: '900' },
  ticketBenefit: { color: C.muted, fontSize: 10, lineHeight: 15 },
  ticketPrice: { color: C.purpleLight, fontSize: 13, fontWeight: '900' },
  quantityRow: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantityLabel: { color: C.white, fontSize: 12, fontWeight: '800' },
  hint: { color: C.muted, fontSize: 9, marginTop: 3 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.field, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 5 },
  quantityButton: { width: 30, height: 30, borderRadius: 7, backgroundColor: '#343451', alignItems: 'center', justifyContent: 'center' },
  quantityValue: { color: C.white, fontSize: 13, fontWeight: '900', minWidth: 15, textAlign: 'center' },
  remaining: { color: C.cyan, fontSize: 10, textAlign: 'right' },
  attendeeCard: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, gap: 11, backgroundColor: '#20203A80' },
  attendeeTitle: { color: C.cyan, fontSize: 12, fontWeight: '900' },
  fieldWrap: { gap: 6 },
  label: { color: '#D1D5E5', fontSize: 11, fontWeight: '800' },
  required: { color: C.red },
  optional: { color: '#81889F', fontWeight: '500' },
  input: { minHeight: 46, borderWidth: 1, borderColor: C.border, borderRadius: 9, backgroundColor: C.field, color: C.white, paddingHorizontal: 12, fontSize: 12 },
  attendeeNote: { color: C.amber, fontSize: 10, lineHeight: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  summaryLabel: { color: '#D1D5E5', fontSize: 11, flex: 1 },
  summaryValue: { color: C.white, fontSize: 11, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: C.border },
  totalLabel: { color: C.white, fontSize: 13, fontWeight: '900' },
  totalValue: { color: C.purpleLight, fontSize: 15, fontWeight: '900' },
  agreement: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 5 },
  checkbox: { width: 19, height: 19, borderRadius: 4, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: C.purple, borderColor: C.purple },
  agreementText: { flex: 1, color: C.muted, fontSize: 10, lineHeight: 16 },
  error: { color: '#FCA5A5', backgroundColor: '#7F1D1D33', borderColor: '#F8717133', borderWidth: 1, borderRadius: 8, padding: 11, fontSize: 11, lineHeight: 16 },
  statusButton: { borderWidth: 1, borderColor: 'rgba(34,211,238,0.5)', backgroundColor: 'rgba(34,211,238,0.1)', borderRadius: 10, padding: 13, alignItems: 'center' },
  statusButtonText: { color: C.cyan, fontSize: 11, fontWeight: '900' },
  paymentStatus: { color: C.muted, fontSize: 10, textAlign: 'center' },
  continueButton: { backgroundColor: '#6255DF', borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.5 },
  continueText: { color: C.white, fontSize: 12, fontWeight: '900' },
  secureText: { color: C.muted, fontSize: 10, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'ios' ? 38 : 8 },
  modalHeader: { height: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: C.white, fontSize: 13, fontWeight: '900' },
});
