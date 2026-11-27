import React, { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import {
  ActivityIndicator, Alert, Image, ImageBackground, RefreshControl,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, Heart, Lock,
  LogOut, MapPin, Music2, Pencil, ShieldCheck, Ticket, Wallet,
} from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/api';
import { logout } from '../../services/authService';
import { getProfile, saveProfile } from '../../services/profileService';
import { updateStoredProfile } from '../../services/profileStore';

const C = {
  bg: '#0B1122', panel: '#161A25', card: '#0C1122', field: '#20203A',
  border: '#383D4E', purple: '#8B5CF6', purpleLight: '#B7BBFF',
  cyan: '#22D3EE', white: '#FFFFFF', muted: '#AAB0C5', green: '#42D99A',
  pink: '#FF6B81', amber: '#F5B84E', red: '#FF8A9B',
};

const GENRES = ['K-POP', 'K-INDIE', 'ROCK', 'EDM', 'POP', 'R&B', 'JAZZ', 'HIP-HOP'];

const money = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));

const initials = (name) => String(name || 'LYNORA User').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function resolveImage(value) {
  if (!value || typeof value !== 'string') return null;
  const uri = value.trim();
  const host = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(uri)) {
    return `${host}${uri.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '')}`;
  }
  if (/^https?:\/\//i.test(uri)) return uri;
  return `${host}/${uri.replace(/^\/+/, '')}`;
}

function SectionTitle({ children, action, actionLabel = 'See All' }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={{ flex: 1 }} />
      {action ? <TouchableOpacity onPress={action}><Text style={styles.seeAll}>{actionLabel}</Text></TouchableOpacity> : null}
    </View>
  );
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <View style={styles.statCard}>
      <Icon size={16} color={color} />
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalOrders: 0, activeTickets: 0, wishlistedConcerts: 0, totalSpent: 0 });
  const [nearestTicket, setNearestTicket] = useState(null);
  const [genres, setGenres] = useState(['K-POP', 'K-INDIE', 'ROCK', 'EDM', 'POP']);
  const [activeTab, setActiveTab] = useState('Personal Info');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const user = await getProfile();
      setProfile(user);
      setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });

      const [ordersResult, ticketsResult, wishlistResult] = await Promise.all([
        apiRequest('/orders/my-orders').catch(() => ({ data: [], summary: {} })),
        apiRequest('/tickets/my-tickets').catch(() => ({ data: [] })),
        apiRequest('/wishlist').catch(() => ({ total: 0, data: [] })),
      ]);

      const orders = Array.isArray(ordersResult?.data) ? ordersResult.data : [];
      const tickets = Array.isArray(ticketsResult?.data) ? ticketsResult.data : [];
      const validTickets = tickets.filter((item) =>
        String(item.ticket_status || '').toLowerCase() === 'valid' &&
        String(item.order_status || '').toLowerCase() === 'paid'
      );
      setStats({
        totalOrders: Number(ordersResult?.summary?.total_orders ?? orders.length),
        activeTickets: validTickets.length,
        wishlistedConcerts: Number(wishlistResult?.total ?? (Array.isArray(wishlistResult?.data) ? wishlistResult.data.length : 0)),
        totalSpent: Number(ordersResult?.summary?.total_spent || 0),
      });

      const now = Date.now();
      const upcoming = validTickets
        .filter((item) => Number.isFinite(new Date(item.start_date).getTime()) && new Date(item.start_date).getTime() > now)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      setNearestTicket(upcoming[0] || null);
    } catch (e) {
      setError(e?.message || 'Gagal memuat profil.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const photo = resolveImage(profile?.profile_photo || profile?.avatar_url || profile?.avatar);
  const cover = resolveImage(profile?.cover_photo);
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Nama lengkap wajib diisi.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Format email tidak valid.');
    try {
      setSaving(true); setError('');
      const updated = await saveProfile(form);
      setProfile(updated);
      setForm({ name: updated.name || '', email: updated.email || '', phone: updated.phone || '' });
      await updateStoredProfile(updated);
      setEditing(false);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui. Nama dan foto profil di header seluruh halaman ikut diperbarui.');
    } catch (e) {
      setError(e?.message || 'Gagal menyimpan perubahan profil.');
    } finally { setSaving(false); }
  };

  const chooseAndUploadImage = async (kind) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin diperlukan', 'Izinkan akses galeri untuk memilih gambar profil.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: kind === 'avatar' ? [1, 1] : [16, 5],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const token = await getAuthToken();
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
      if (kind === 'avatar') setUploadingPhoto(true); else setUploadingCover(true);
      // Expo's newer fetch implementation requires a real Blob/File,
      // not the legacy React Native { uri, name, type } object.
      const imageFile = new ExpoFile(asset.uri);
      const body = new FormData();
      body.append(kind === 'avatar' ? 'avatar' : 'banner', imageFile);
      const endpoint = kind === 'avatar' ? '/profile/avatar' : '/profile/banner';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Gagal mengunggah gambar.');
      const updated = payload.user || payload.data?.user || payload.data || payload;
      setProfile(updated);
      await updateStoredProfile(updated);
      Alert.alert('Berhasil', kind === 'avatar' ? 'Foto profil berhasil diperbarui.' : 'Cover profil berhasil diperbarui.');
    } catch (e) {
      Alert.alert('Upload gagal', e?.message || 'Gambar tidak dapat diunggah.');
    } finally {
      setUploadingPhoto(false);
      setUploadingCover(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Apakah kamu yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        try {
          await logout();
          const root = navigation.getParent();
          (root || navigation).reset({ index: 0, routes: [{ name: 'Login' }] });
        } catch (e) { Alert.alert('Logout gagal', e?.message || 'Silakan coba lagi.'); }
      } },
    ]);
  };

  const toggleGenre = (genre) => setGenres((current) => current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]);
  const eventDate = nearestTicket?.start_date ? new Date(nearestTicket.start_date) : null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.cyan} colors={[C.purple]} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color={C.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Kelola akun dan informasi pribadimu</Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        {/* PROFILE COVER + IDENTITY */}
        <View style={styles.profileCard}>
          <ImageBackground
            source={cover ? { uri: cover } : undefined}
            style={styles.cover}
            imageStyle={styles.coverImage}
          >
            <View style={styles.coverShade} />
            <TouchableOpacity style={styles.changeCoverButton} onPress={() => chooseAndUploadImage('cover')} disabled={uploadingCover}><Text style={styles.changeCoverText}>{uploadingCover ? 'Uploading...' : 'Change Cover'}</Text></TouchableOpacity>
            <View style={styles.coverLabel}><Music2 size={11} color={C.white} /><Text style={styles.coverLabelText}>LYNORA CUSTOMER</Text></View>
          </ImageBackground>
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              {photo ? <Image source={{ uri: photo }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials(profile?.name)}</Text></View>}
              <TouchableOpacity style={styles.onlineDot} onPress={() => chooseAndUploadImage('avatar')} disabled={uploadingPhoto}><Text style={styles.cameraGlyph}>{uploadingPhoto ? '…' : '+'}</Text></TouchableOpacity>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.profileName} numberOfLines={1}>{profile?.name || 'LYNORA User'}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{profile?.email || '—'}</Text>
              <View style={styles.verifiedRow}><ShieldCheck size={12} color={C.green} /><Text style={styles.verifiedText}>Customer Account</Text></View>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={() => { setError(''); setEditing(true); }}>
              <Pencil size={13} color={C.white} /><Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard icon={Ticket} value={loading ? '—' : stats.totalOrders.toLocaleString('id-ID')} label="Total Orders" color={C.purpleLight} />
            <StatCard icon={Check} value={loading ? '—' : stats.activeTickets.toLocaleString('id-ID')} label="Active Tickets" color={C.green} />
            <StatCard icon={Heart} value={loading ? '—' : stats.wishlistedConcerts.toLocaleString('id-ID')} label="Wishlist" color={C.pink} />
            <StatCard icon={Wallet} value={loading ? '—' : money(stats.totalSpent)} label="Total Spent" color={C.cyan} />
          </View>
        </View>

        {loading && !profile ? <View style={styles.loadingBox}><ActivityIndicator color={C.cyan} /><Text style={styles.mutedText}>Memuat profil...</Text></View> : null}
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        {/* PROFILE TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {['Personal Info', 'Music Preferences', 'Activity History'].map((tab) => (
            <TouchableOpacity key={tab} onPress={() => {
              setActiveTab(tab);
              if (tab === 'Activity History') navigation.navigate('MainTab', { screen: 'History' });
            }} style={[styles.tab, activeTab === tab && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === 'Personal Info' ? (
          <View style={styles.contentGrid}>
            <View style={styles.mainColumn}>
              <View style={styles.card}>
                <SectionTitle>Identity & Ticket Information</SectionTitle>
                <Text style={styles.cardDescription}>Informasi ini digunakan untuk data pemesanan dan tiket konser.</Text>
                <Text style={styles.fieldLabel}>Full Legal Name</Text>
                <TextInput value={form.name} onChangeText={(value) => updateField('name', value)} editable={editing} placeholder="Nama lengkap" placeholderTextColor="#858BA3" style={[styles.input, !editing && styles.inputReadonly]} />
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput value={form.email} onChangeText={(value) => updateField('email', value)} editable={editing} keyboardType="email-address" autoCapitalize="none" placeholder="Email" placeholderTextColor="#858BA3" style={[styles.input, !editing && styles.inputReadonly]} />
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput value={form.phone} onChangeText={(value) => updateField('phone', value)} editable={editing} keyboardType="phone-pad" placeholder="Nomor telepon" placeholderTextColor="#858BA3" style={[styles.input, !editing && styles.inputReadonly]} />
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity style={styles.passwordRow} onPress={() => navigation.navigate('ChangePassword')}>
                  <Lock size={15} color={C.purpleLight} /><Text style={styles.passwordText}>••••••••••••</Text><Text style={styles.changePassword}>Change Password</Text><ChevronRight size={15} color={C.muted} />
                </TouchableOpacity>
                {editing ? (
                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => { setForm({ name: profile?.name || '', email: profile?.email || '', phone: profile?.phone || '' }); setEditing(false); setError(''); }} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.saveText}>Save Changes</Text>}</TouchableOpacity>
                  </View>
                ) : null}
              </View>
              <View style={styles.card}>
                <SectionTitle>Account Security</SectionTitle>
                <Text style={styles.cardDescription}>Jaga keamanan akun dan akses tiketmu.</Text>
                <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ChangePassword')}>
                  <View style={[styles.actionIcon, { backgroundColor: '#30255A' }]}><Lock size={17} color={C.purpleLight} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.actionTitle}>Change Password</Text><Text style={styles.actionSubtitle}>Perbarui password akun</Text></View>
                  <ChevronRight size={17} color={C.muted} />
                </TouchableOpacity>
                <View style={styles.actionRow}>
                  <View style={[styles.actionIcon, { backgroundColor: '#123D37' }]}><ShieldCheck size={17} color={C.green} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.actionTitle}>Account Verification</Text><Text style={styles.actionSubtitle}>Data akun tersimpan di LYNORA</Text></View>
                  <Check size={17} color={C.green} />
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <LogOut size={16} color={C.red} /><Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* NEAREST ACTIVE TICKET */}
            <View style={styles.sideColumn}>
              <View style={styles.card}>
                <SectionTitle action={() => navigation.navigate('MainTab', { screen: 'MyTickets' })}>Nearest Active Ticket</SectionTitle>
                {nearestTicket ? (
                  <>
                    <View style={styles.ticketPosterWrap}>
                      {nearestTicket.poster_url ? <Image source={{ uri: resolveImage(nearestTicket.poster_url) }} style={styles.ticketPoster} /> : <View style={styles.posterFallback}><Ticket size={28} color={C.purpleLight} /></View>}
                      <View style={styles.posterOverlay}><Text style={styles.posterEventName}>{nearestTicket.event_name}</Text></View>
                    </View>
                    <View style={styles.ticketMeta}><CalendarDays size={14} color={C.purpleLight} /><Text style={styles.ticketMetaText}>{eventDate ? eventDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Tanggal belum tersedia'}</Text></View>
                    <View style={styles.ticketMeta}><MapPin size={14} color={C.purpleLight} /><Text style={styles.ticketMetaText}>{nearestTicket.venue_name || 'Venue belum tersedia'}{nearestTicket.venue_address ? `, ${nearestTicket.venue_address}` : ''}</Text></View>
                    <View style={styles.validRow}><Text style={styles.ticketCode}>{nearestTicket.ticket_code || 'E-Ticket Ready'}</Text><Text style={styles.validBadge}>VALID</Text></View>
                    <TouchableOpacity style={styles.openTicketButton} onPress={() => navigation.navigate('TicketDetail', { ticketId: nearestTicket.ticket_id, ticket: nearestTicket })}><Text style={styles.openTicketText}>Open E-Ticket</Text><ChevronRight size={15} color={C.white} /></TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.emptyTicket}><Ticket size={27} color={C.purpleLight} /><Text style={styles.emptyTitle}>No Upcoming Concert</Text><Text style={styles.cardDescription}>Tiket yang sudah dibayar akan muncul di sini.</Text><TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('MainTab', { screen: 'Explore' })}><Text style={styles.openTicketText}>Explore Concerts</Text></TouchableOpacity></View>
                )}
              </View>
              <View style={styles.fanPass}>
                <View style={styles.fanPassTop}><Text style={styles.fanPassLabel}>LYNORA FAN PASS</Text><Music2 size={17} color={C.white} /></View>
                <Text style={styles.fanPassTitle}>Your music journey starts here.</Text>
                <Text style={styles.fanPassDescription}>Nikmati pengalaman konser dan simpan event favoritmu di LYNORA.</Text>
                <View style={styles.fanPassBar}><View style={styles.fanPassProgress} /></View>
                <Text style={styles.fanPassFoot}>Discover · Collect · Experience</Text>
              </View>
            </View>
          </View>
        ) : activeTab === 'Music Preferences' ? (
          <View style={styles.card}>
            <SectionTitle>Music & Artist Preferences</SectionTitle>
            <Text style={styles.cardDescription}>Pilih genre musik yang kamu sukai untuk menyesuaikan pengalaman menjelajah konser.</Text>
            <Text style={styles.fieldLabel}>Favorite Genres</Text>
            <View style={styles.genreWrap}>{GENRES.map((genre) => {
              const selected = genres.includes(genre);
              return <TouchableOpacity key={genre} onPress={() => toggleGenre(genre)} style={[styles.genreChip, selected && styles.genreChipActive]}><Text style={[styles.genreText, selected && styles.genreTextActive]}>{genre}</Text>{selected ? <Check size={11} color={C.white} /> : null}</TouchableOpacity>;
            })}</View>
            <Text style={styles.preferenceNote}>Preferensi genre saat ini tersimpan lokal di layar ini. Sinkronisasi preferensi musik ke backend memerlukan endpoint preferensi khusus.</Text>
          </View>
        ) : null}
        <Text style={styles.footer}>LYNORA · Your music, your moment.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 32, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  headerIcon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: C.muted, fontSize: 9, marginTop: 3 },
  profileCard: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 15, overflow: 'hidden' },
  cover: { height: 112, backgroundColor: '#39246E', justifyContent: 'flex-start', padding: 12 },
  coverImage: { opacity: 0.8 },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,12,54,0.38)' },
  changeCoverButton: { position: 'absolute', right: 10, bottom: 10, zIndex: 2, backgroundColor: 'rgba(11,17,34,0.75)', borderWidth: 1, borderColor: '#FFFFFF55', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
  changeCoverText: { color: C.white, fontSize: 9, fontWeight: '800' },
  coverLabel: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(11,17,34,0.55)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  coverLabelText: { color: C.white, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  identityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginTop: -30, gap: 10 },
  avatarWrap: { width: 70, height: 70, borderRadius: 15, borderWidth: 3, borderColor: C.panel, backgroundColor: '#30255A', overflow: 'visible' },
  avatar: { width: '100%', height: '100%', borderRadius: 12 },
  avatarFallback: { flex: 1, borderRadius: 12, backgroundColor: '#5140A0', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: C.white, fontSize: 23, fontWeight: '900' },
  onlineDot: { position: 'absolute', bottom: -3, right: -3, width: 23, height: 23, borderRadius: 12, backgroundColor: C.purple, borderWidth: 2, borderColor: C.panel, alignItems: 'center', justifyContent: 'center' },
  cameraGlyph: { color: C.white, fontSize: 17, fontWeight: '900', lineHeight: 19 },
  identityText: { flex: 1, paddingTop: 28, minWidth: 0 },
  profileName: { color: C.white, fontSize: 15, fontWeight: '900' },
  profileEmail: { color: C.muted, fontSize: 10, marginTop: 3 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  verifiedText: { color: C.green, fontSize: 9, fontWeight: '700' },
  editButton: { marginTop: 25, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: C.purple },
  editButtonText: { color: C.white, fontSize: 10, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', padding: 12, gap: 7, marginTop: 10 },
  statCard: { flex: 1, minWidth: 0, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingVertical: 10, paddingHorizontal: 7, alignItems: 'center', gap: 4 },
  statValue: { color: C.white, fontSize: 12, fontWeight: '900' },
  statLabel: { color: C.muted, fontSize: 8, textAlign: 'center' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 14 },
  mutedText: { color: C.muted, fontSize: 11 },
  errorBox: { borderWidth: 1, borderColor: '#7A2A3A', backgroundColor: '#7A2A3A33', borderRadius: 9, padding: 11 },
  errorText: { color: '#FFB3C0', fontSize: 11, lineHeight: 16 },
  tabs: { gap: 8, paddingVertical: 2 },
  tab: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.card },
  activeTab: { backgroundColor: C.purple, borderColor: C.purple },
  tabText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  activeTabText: { color: C.white },
  contentGrid: { gap: 13 },
  mainColumn: { gap: 13 },
  sideColumn: { gap: 13 },
  card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 13 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  sectionAccent: { width: 3, height: 18, borderRadius: 3, backgroundColor: C.cyan },
  sectionTitle: { color: C.white, fontSize: 12, fontWeight: '900' },
  seeAll: { color: C.purpleLight, fontSize: 10, fontWeight: '800' },
  cardDescription: { color: C.muted, fontSize: 10, lineHeight: 15, marginBottom: 10 },
  fieldLabel: { color: '#D7D9E5', fontSize: 10, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: { height: 43, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.field, color: C.white, paddingHorizontal: 11, fontSize: 11 },
  inputReadonly: { backgroundColor: '#121827', color: '#C1C5D4' },
  passwordRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.field, paddingHorizontal: 11, marginTop: 1 },
  passwordText: { color: C.muted, fontSize: 12, flex: 1, letterSpacing: 2 },
  changePassword: { color: C.purpleLight, fontSize: 9, fontWeight: '800' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelButton: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 17, paddingVertical: 11 },
  cancelText: { color: C.muted, fontSize: 10, fontWeight: '800' },
  saveButton: { minWidth: 125, alignItems: 'center', backgroundColor: C.purple, borderRadius: 8, paddingHorizontal: 17, paddingVertical: 11 },
  saveText: { color: C.white, fontSize: 10, fontWeight: '900' },
  actionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 9, backgroundColor: C.card, padding: 9, marginTop: 8 },
  actionIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: C.white, fontSize: 10, fontWeight: '800' },
  actionSubtitle: { color: C.muted, fontSize: 9, marginTop: 3 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#7A2A3A', backgroundColor: '#7A2A3A22', borderRadius: 9, padding: 11, marginTop: 12 },
  logoutText: { color: C.red, fontSize: 10, fontWeight: '900' },
  ticketPosterWrap: { height: 125, borderRadius: 9, overflow: 'hidden', backgroundColor: C.card, marginBottom: 10 },
  ticketPoster: { width: '100%', height: '100%' },
  posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  posterOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 10, backgroundColor: 'rgba(5,9,22,0.38)' },
  posterEventName: { color: C.white, fontSize: 13, fontWeight: '900' },
  ticketMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 7 },
  ticketMetaText: { color: C.muted, fontSize: 10, flex: 1, lineHeight: 15 },
  validRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  ticketCode: { color: C.muted, fontSize: 9 },
  validBadge: { color: C.green, backgroundColor: '#123D37', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, fontSize: 8, fontWeight: '900' },
  openTicketButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: C.purple, borderRadius: 8, padding: 11, marginTop: 12 },
  openTicketText: { color: C.white, fontSize: 10, fontWeight: '900' },
  emptyTicket: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  emptyTitle: { color: C.white, fontSize: 12, fontWeight: '900' },
  exploreButton: { backgroundColor: C.purple, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, marginTop: 5 },
  fanPass: { borderRadius: 13, padding: 15, backgroundColor: '#38216D', borderWidth: 1, borderColor: '#7657C9' },
  fanPassTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fanPassLabel: { color: C.white, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  fanPassTitle: { color: C.white, fontSize: 14, fontWeight: '900', marginTop: 13 },
  fanPassDescription: { color: '#D9D3FF', fontSize: 10, lineHeight: 15, marginTop: 5 },
  fanPassBar: { height: 5, backgroundColor: '#FFFFFF33', borderRadius: 5, marginTop: 14, overflow: 'hidden' },
  fanPassProgress: { width: '65%', height: '100%', backgroundColor: C.cyan, borderRadius: 5 },
  fanPassFoot: { color: '#D9D3FF', fontSize: 9, marginTop: 8 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  genreChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  genreChipActive: { backgroundColor: '#30235A', borderColor: C.purple },
  genreText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  genreTextActive: { color: C.purpleLight },
  preferenceNote: { color: C.amber, fontSize: 10, lineHeight: 15, marginTop: 16 },
  footer: { color: '#65708A', fontSize: 9, textAlign: 'center', marginTop: 5 },
});
