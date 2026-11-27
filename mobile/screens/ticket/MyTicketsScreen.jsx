import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import HeaderActions from '../../components/HeaderActions';

import {
  Ticket,
  CalendarDays,
  MapPin,
  Download,
  ArrowLeftRight,
  ChevronRight,
  Music,
  X,
} from 'lucide-react-native';
import { exportTicketPdf } from '../../utils/ticketPdf';

const COLORS = {
  background: '#080D1C',
  card: '#111A30',
  purple: '#922EFF',
  purpleLight: '#B9A0FF',
  cyan: '#20D5E8',
  white: '#FFFFFF',
  muted: '#8995B0',
  border: '#27314B',
  green: '#27D6A0',
};

const HISTORY = [
  {
    id: '1',
    name: 'Coldplay: Music of the Spheres',
    date: '15 Nov 2025',
    category: 'GBK Jakarta - Festival',
    color: '#286CB5',
  },
  {
    id: '2',
    name: 'Ed Sheeran Tour',
    date: '02 Mar 2024',
    category: 'Jakarta - Tribune A',
    color: '#D94B35',
  },
];

const MAIN_TICKET = {
  title: 'BTS MAP OF THE WORLD TOUR • NEW YORK',
  date: 'Sun, 25 Oct 2026 • 19:00',
  venue: 'MetLife Stadium, NY',
  qrValue: 'LYNORA-TICKET-LYN-2026-001',
};

const MIDNIGHT_TICKET = {
  title: 'The Midnight Festival',
  date: '20 Dec 2026',
  venue: 'VIP - A12',
  qrValue: 'LYNORA-TICKET-MIDNIGHT-2026-001',
};

export default function MyTicketsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Active Tickets');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  const showMessage = (message) => {
    Alert.alert('LYNORA', message);
  };

  const openTicketDetails = (ticket) => {
    navigation.navigate('TicketDetail', {
      ticket: {
        title: ticket.title,
        date: ticket.date,
        venue: ticket.venue,
      },
      qrValue: ticket.qrValue,
    });
  };

  const openMemory = (item) => {
    setSelectedMemory(item);
  };

  const downloadTicket = async () => {
    try {
      await exportTicketPdf(MAIN_TICKET);
      if (Platform.OS === 'web') {
        showMessage('Pilih “Save as PDF” pada jendela cetak untuk menyimpan tiket.');
      }
    } catch (error) {
      showMessage(error.message || 'PDF tiket gagal dibuat. Silakan coba lagi.');
    }
  };

  const submitTransfer = () => {
    const normalizedEmail = recipientEmail.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!recipientName.trim()) {
      showMessage('Masukkan nama penerima tiket.');
      return;
    }
    if (!validEmail) {
      showMessage('Masukkan alamat email penerima yang valid.');
      return;
    }

    setShowTransferModal(false);
    setRecipientName('');
    setRecipientEmail('');
    showMessage(
      `Simulasi transfer untuk ${recipientName.trim()} (${normalizedEmail}) berhasil. Tiket belum dikirim ke server.`,
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>N</Text>
          </View>

          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Halo, Naya</Text>
            <Text style={styles.subtitle}>Yuk, nikmati momen konser terbarumu</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        {/* TITLE */}
        <Text style={styles.eyebrow}>LYNORA DASHBOARD</Text>

        <View style={styles.titleRow}>
          <Text style={styles.title}>MY TICKETS</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>2 Aktif</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          {['Active Tickets', 'History', 'Expired'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ACTIVE TICKET */}
        {activeTab === 'Active Tickets' && (
          <>
            <View style={styles.ticketCard}>
              <LinearGradient
                colors={['#21164D', '#111A30']}
                style={styles.ticketGradient}
              >
                {/* POSTER */}
                <LinearGradient
                  colors={['#53247B', '#1C1D49', '#111A30']}
                  style={styles.poster}
                >
                  <Text style={styles.posterStar}>✦</Text>
                  <Text style={styles.posterTitle}>BLACKPINK</Text>
                  <Text style={styles.posterSubtitle}>WORLD TOUR</Text>
                  <Text style={styles.posterYear}>2026</Text>

                  <View style={styles.gateBadge}>
                    <Text style={styles.gateText}>● GATE OPEN</Text>
                  </View>

                  <View style={styles.validBadge}>
                    <Text style={styles.validText}>VALID E-TICKET</Text>
                  </View>
                </LinearGradient>

                {/* EVENT INFO */}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventEyebrow}>WORLD TOUR 2026</Text>
                  <Text style={styles.eventName}>
                    BTS MAP OF THE WORLD TOUR • NEW YORK
                  </Text>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <CalendarDays size={14} color={COLORS.purpleLight} />
                      <View style={styles.infoText}>
                        <Text style={styles.infoLabel}>DATE & TIME</Text>
                        <Text style={styles.infoValue}>Sun, 25 Oct • 19:00</Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <MapPin size={14} color={COLORS.purpleLight} />
                      <View style={styles.infoText}>
                        <Text style={styles.infoLabel}>VENUE</Text>
                        <Text style={styles.infoValue}>MetLife Stadium, NY</Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <Ticket size={14} color={COLORS.purpleLight} />
                      <View style={styles.infoText}>
                        <Text style={styles.infoLabel}>SEAT ROW</Text>
                        <Text style={styles.infoValueBlue}>Sec A18 • Row D (Q12)</Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <MapPin size={14} color={COLORS.purpleLight} />
                      <View style={styles.infoText}>
                        <Text style={styles.infoLabel}>GATE ACCESS</Text>
                        <Text style={styles.infoValue}>South Gate 04</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* QR CODE */}
                <View style={styles.qrSection}>
                  <View style={styles.qrContainer}>
                    <QRCode
                      value="LYNORA-TICKET-LYN-2026-001"
                      size={155}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.qrHint}>
                    Tunjukkan kode ini saat masuk ke venue
                  </Text>

                  <TouchableOpacity
                    onPress={() => setShowQrModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Tampilkan QR tiket layar penuh"
                  >
                    <Text style={styles.enlargeText}>Tampilkan Layar Penuh</Text>
                  </TouchableOpacity>
                </View>

                {/* ACTION BUTTONS */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={downloadTicket}
                  >
                    <Download size={14} color={COLORS.white} />
                    <Text style={styles.actionText}>Download PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.transferButton}
                    onPress={() => setShowTransferModal(true)}
                  >
                    <ArrowLeftRight size={14} color={COLORS.white} />
                    <Text style={styles.actionText}>Transfer Tiket</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* OTHER ACTIVE TICKETS */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>Other Active Tickets</Text>
            </View>

            <View style={styles.otherTicket}>
              <LinearGradient
                colors={['#71305D', '#29153F']}
                style={styles.otherPoster}
              >
                <Music size={20} color={COLORS.purpleLight} />
              </LinearGradient>

              <View style={styles.otherContent}>
                <Text style={styles.confirmed}>● CONFIRMED</Text>
                <Text style={styles.otherName}>The Midnight Festival</Text>
                <Text style={styles.otherDate}>20 Dec 2026</Text>
                <Text style={styles.otherCategory}>VIP - A12</Text>
              </View>

              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => openTicketDetails(MIDNIGHT_TICKET)}
              >
                <Text style={styles.detailText}>Lihat</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* HISTORY */}
        {activeTab === 'History' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>Concert History</Text>
            </View>

            <View style={styles.historyGrid}>
              {HISTORY.map((item) => (
                <View style={styles.historyCard} key={item.id}>
                  <LinearGradient
                    colors={[item.color, '#171A3D']}
                    style={styles.historyPoster}
                  >
                    <Music size={28} color={COLORS.white} />
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>COMPLETED</Text>
                    </View>
                  </LinearGradient>

                  <Text style={styles.historyName}>{item.name}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <Text style={styles.historyCategory}>{item.category}</Text>

                  <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => openMemory(item)}
                  >
                    <Text style={styles.historyButtonText}>Lihat Kenangan</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* EXPIRED */}
        {activeTab === 'Expired' && (
          <View style={styles.emptyContainer}>
            <Ticket size={38} color={COLORS.purpleLight} />
            <Text style={styles.emptyTitle}>Belum Ada Tiket Expired</Text>
            <Text style={styles.emptySubtitle}>
              Tiket yang sudah kedaluwarsa akan muncul di sini.
            </Text>
          </View>
        )}

        {/* CONCERT HISTORY */}
        {activeTab === 'Active Tickets' && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>Concert History</Text>

              <TouchableOpacity
                onPress={() => setActiveTab('History')}
                style={styles.seeAll}
              >
                <Text style={styles.seeAllText}>Lihat Semua</Text>
                <ChevronRight size={12} color={COLORS.cyan} />
              </TouchableOpacity>
            </View>

            <View style={styles.historyGrid}>
              {HISTORY.map((item) => (
                <View style={styles.historyCard} key={item.id}>
                  <LinearGradient
                    colors={[item.color, '#171A3D']}
                    style={styles.historyPoster}
                  >
                    <Music size={28} color={COLORS.white} />
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>COMPLETED</Text>
                    </View>
                  </LinearGradient>

                  <Text style={styles.historyName}>{item.name}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <Text style={styles.historyCategory}>{item.category}</Text>

                  <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => openMemory(item)}
                  >
                    <Text style={styles.historyButtonText}>Lihat Kenangan</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 25 }} />
      </ScrollView>

      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalCard}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowQrModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Tutup QR layar penuh"
            >
              <X size={20} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>E-TICKET QR</Text>
            <Text style={styles.modalSubtitle}>{MAIN_TICKET.title}</Text>
            <View style={styles.largeQrContainer}>
              <QRCode
                value={MAIN_TICKET.qrValue}
                size={240}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.modalQrCode}>{MAIN_TICKET.qrValue}</Text>
            <Text style={styles.modalSubtitle}>
              Tunjukkan kode ini saat masuk ke venue.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTransferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.transferModalCard}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowTransferModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Tutup formulir transfer"
            >
              <X size={20} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Transfer Tiket</Text>
            <Text style={styles.modalSubtitle}>
              Masukkan data penerima. Transfer ini hanya simulasi lokal dan
              tidak mengubah data server.
            </Text>
            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Nama penerima"
              placeholderTextColor={COLORS.muted}
              style={styles.transferInput}
              accessibilityLabel="Nama penerima"
            />
            <TextInput
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="Email penerima"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.transferInput}
              accessibilityLabel="Email penerima"
            />
            <TouchableOpacity
              style={styles.confirmTransferButton}
              onPress={submitTransfer}
            >
              <Text style={styles.confirmTransferText}>Konfirmasi Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedMemory)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        {selectedMemory && (
          <View style={styles.modalBackdrop}>
            <View style={styles.memoryModalCard}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedMemory(null)}
                accessibilityRole="button"
                accessibilityLabel="Tutup kenangan konser"
              >
                <X size={20} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Kenangan Konser</Text>
              <LinearGradient
                colors={[selectedMemory.color, '#171A3D']}
                style={styles.memoryPoster}
              >
                <Music size={42} color={COLORS.white} />
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>COMPLETED</Text>
                </View>
              </LinearGradient>
              <Text style={styles.memoryName}>{selectedMemory.name}</Text>
              <View style={styles.memoryInfoRow}>
                <CalendarDays size={15} color={COLORS.cyan} />
                <Text style={styles.memoryInfoText}>{selectedMemory.date}</Text>
              </View>
              <View style={styles.memoryInfoRow}>
                <MapPin size={15} color={COLORS.cyan} />
                <Text style={styles.memoryInfoText}>{selectedMemory.category}</Text>
              </View>
              <Text style={styles.memoryDescription}>
                Ini adalah kenangan konser yang sudah selesai, bukan tiket aktif.
              </Text>
              <TouchableOpacity
                style={styles.confirmTransferButton}
                onPress={() => setSelectedMemory(null)}
              >
                <Text style={styles.confirmTransferText}>Kembali ke Riwayat</Text>
              </TouchableOpacity>
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
    paddingTop: 42,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#A84BCE',
    borderWidth: 2,
    borderColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  greetingContainer: {
    flex: 1,
    marginLeft: 9,
  },
  greeting: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 8,
    marginTop: 4,
  },
  notification: {
    width: 32,
    height: 32,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    right: 7,
    top: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.cyan,
  },
  eyebrow: {
    color: COLORS.cyan,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
  },
  totalBadge: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  totalText: {
    color: COLORS.muted,
    fontSize: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 15,
  },
  tab: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  tabText: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  ticketCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#35405E',
    marginBottom: 17,
  },
  ticketGradient: {
    padding: 10,
  },
  poster: {
    height: 112,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  posterStar: {
    color: '#D8A7FF',
    fontSize: 25,
  },
  posterTitle: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 4,
  },
  posterSubtitle: {
    color: '#E5C8FF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 5,
  },
  posterYear: {
    color: COLORS.purpleLight,
    fontSize: 9,
    marginTop: 3,
  },
  gateBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#073C36',
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  gateText: {
    color: COLORS.green,
    fontSize: 6,
    fontWeight: '800',
  },
  validBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  validText: {
    color: COLORS.white,
    fontSize: 6,
    fontWeight: '800',
  },
  eventInfo: {
    paddingTop: 11,
    paddingHorizontal: 2,
  },
  eventEyebrow: {
    color: COLORS.cyan,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
  },
  eventName: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 11,
  },
  infoItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 6,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: '600',
  },
  infoValueBlue: {
    color: COLORS.cyan,
    fontSize: 7,
    fontWeight: '700',
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    padding: 6,
    borderRadius: 5,
  },
  qrHint: {
    color: COLORS.muted,
    fontSize: 7,
    marginTop: 9,
  },
  enlargeText: {
    color: COLORS.cyan,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.purple,
    paddingVertical: 10,
    borderRadius: 9,
  },
  transferButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18233D',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 9,
  },
  actionText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLine: {
    width: 3,
    height: 12,
    borderRadius: 3,
    backgroundColor: COLORS.cyan,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  otherTicket: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
    gap: 8,
  },
  otherPoster: {
    width: 40,
    height: 43,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherContent: {
    flex: 1,
  },
  confirmed: {
    color: COLORS.green,
    fontSize: 6,
    fontWeight: '800',
    marginBottom: 4,
  },
  otherName: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '800',
  },
  otherDate: {
    color: COLORS.muted,
    fontSize: 7,
    marginTop: 3,
  },
  otherCategory: {
    color: COLORS.cyan,
    fontSize: 6,
    marginTop: 3,
  },
  detailButton: {
    backgroundColor: '#152B43',
    borderWidth: 1,
    borderColor: '#285B75',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  detailText: {
    color: COLORS.cyan,
    fontSize: 7,
    fontWeight: '700',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: COLORS.cyan,
    fontSize: 7,
  },
  historyGrid: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 15,
  },
  historyCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 6,
  },
  historyPoster: {
    height: 68,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  completedBadge: {
    position: 'absolute',
    top: 5,
    right: 4,
    backgroundColor: '#163D38',
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  completedText: {
    color: COLORS.green,
    fontSize: 5,
    fontWeight: '800',
  },
  historyName: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: '800',
    marginTop: 7,
    minHeight: 25,
  },
  historyDate: {
    color: COLORS.muted,
    fontSize: 6,
    marginTop: 4,
  },
  historyCategory: {
    color: COLORS.cyan,
    fontSize: 6,
    marginTop: 4,
  },
  historyButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
    marginTop: 9,
  },
  historyButtonText: {
    color: COLORS.white,
    fontSize: 6,
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    alignItems: 'center',
    padding: 30,
    marginTop: 10,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 13,
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 7,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  transferModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
  },
  memoryModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
  },
  memoryPoster: {
    height: 150,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    position: 'relative',
  },
  memoryName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
  },
  memoryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  memoryInfoText: {
    color: COLORS.muted,
    fontSize: 11,
    flex: 1,
  },
  memoryDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 18,
  },
  modalClose: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
    zIndex: 1,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  largeQrContainer: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 10,
    marginTop: 22,
  },
  modalQrCode: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 16,
  },
  transferInput: {
    color: COLORS.white,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 12,
    marginTop: 12,
  },
  confirmTransferButton: {
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: 9,
    paddingVertical: 12,
    marginTop: 16,
  },
  confirmTransferText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
