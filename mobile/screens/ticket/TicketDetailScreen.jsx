import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import HeaderActions from '../../components/HeaderActions';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ticket,
  Download,
  ShieldCheck,
} from 'lucide-react-native';
import { exportTicketPdf } from '../../utils/ticketPdf';

const COLORS = {
  background: '#080D1C',
  card: '#111A30',
  cardLight: '#172139',
  purple: '#914DFF',
  purpleLight: '#B9A0FF',
  cyan: '#00D9E8',
  green: '#24D6A0',
  white: '#FFFFFF',
  muted: '#8490A9',
  border: '#26314B',
};

export default function TicketDetailScreen({ navigation, route }) {
  const ticket = route?.params?.ticket || {
    title: 'BLACKPINK WORLD TOUR',
    date: '12 Nov 2024',
    venue: 'Gelora Bung Karno Main Stadium',
  };
  const qrValue = route?.params?.qrValue || 'LYNORA-TICKET-BP-2024-001';

  const downloadTicket = async () => {
    try {
      await exportTicketPdf({ ...ticket, qrValue });
      Alert.alert(
        'LYNORA',
        'PDF tiket siap dicetak atau disimpan dari jendela cetak.',
      );
    } catch (error) {
      Alert.alert('LYNORA', error.message || 'PDF tiket gagal dibuat.');
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
        <Text style={styles.headerTitle}>Detail E-Ticket</Text>
        <View style={styles.headerActions}>
          <HeaderActions navigation={navigation} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.statusBadge}>
          <ShieldCheck size={14} color={COLORS.green} />
          <Text style={styles.statusText}>VALID E-TICKET</Text>
        </View>

        <View style={styles.ticketCard}>
          {ticket.image ? (
            <Image source={{ uri: ticket.image }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Ticket size={40} color={COLORS.purpleLight} />
            </View>
          )}

          <View style={styles.ticketBody}>
            <Text style={styles.ticketTitle}>{ticket.title}</Text>
            <View style={styles.infoRow}>
              <CalendarDays size={14} color={COLORS.cyan} />
              <Text style={styles.infoText}>{ticket.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={14} color={COLORS.cyan} />
              <Text style={styles.infoText}>{ticket.venue}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailGrid}>
              <DetailItem label="SECTION" value="A18" />
              <DetailItem label="ROW" value="03" />
              <DetailItem label="SEAT" value="12" />
              <DetailItem label="GATE" value="04" />
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={qrValue}
                size={170}
                color="#080808"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrCode}>{qrValue}</Text>
            <Text style={styles.qrHint}>
              Tunjukkan QR ini kepada petugas saat memasuki venue.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={downloadTicket}
          activeOpacity={0.85}
        >
          <Download size={18} color={COLORS.white} />
          <Text style={styles.downloadText}>DOWNLOAD E-TICKET</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function DetailItem({ label, value }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  statusBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  statusText: { color: COLORS.green, fontSize: 10, fontWeight: '800' },
  ticketCard: {
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  poster: { width: '100%', height: 170 },
  posterFallback: {
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBody: { padding: 16 },
  ticketTitle: {
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  infoText: { color: COLORS.muted, fontSize: 12, flex: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  detailGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { alignItems: 'center', flex: 1 },
  detailLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '700' },
  detailValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 5,
  },
  qrContainer: {
    alignSelf: 'center',
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  qrCode: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  qrHint: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  downloadButton: {
    height: 50,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
});
