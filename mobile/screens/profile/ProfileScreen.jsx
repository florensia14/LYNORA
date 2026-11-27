
import React, { useState } from 'react';
import HeaderActions from '../../components/HeaderActions';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Switch,
  Alert,
} from 'react-native';

import {
  ArrowLeft,
  UserRound,
  CheckCircle2,
  Pencil,
  Ticket,
  Heart,
  Wallet,
  CalendarDays,
  MapPin,
  Music2,
  ShieldCheck,
  Lock,
  Smartphone,
  Laptop,
  ChevronRight,
  LogOut,
  Star,
  CreditCard,
  Plus,
  Check,
} from 'lucide-react-native';

const C = {
  bg: '#080D1C',
  card: '#111A30',
  card2: '#17223B',
  purple: '#7047F5',
  light: '#A78BFA',
  white: '#FFFFFF',
  muted: '#929BB2',
  border: '#27314B',
  green: '#10DFA0',
  pink: '#F04472',
};

const genres = ['POP', 'ROCK', 'INDIE', 'EDM', 'R&B'];

const artists = [
  { name: 'BLACKPINK', genre: 'K-Pop', color: '#55266E' },
  { name: 'BTS', genre: 'K-Pop', color: '#283D70' },
];

export default function ProfileScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Personal Info');
  const [twoFactor, setTwoFactor] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState(['POP', 'K-POP']);
  const [selectedArtists, setSelectedArtists] = useState(['BLACKPINK', 'BTS']);

  const [name, setName] = useState('Kanaya amira');
  const [email, setEmail] = useState('kanaya.amira@gmail.com');
  const [phone, setPhone] = useState('+62 812-3456-7890');
  const [identity, setIdentity] = useState('3201XXXXXXXXXXXX');

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((item) => item !== genre)
        : [...prev, genre]
    );
  };

  const toggleArtist = (artist) => {
    setSelectedArtists((prev) =>
      prev.includes(artist)
        ? prev.filter((item) => item !== artist)
        : [...prev, artist]
    );
  };

  const handleSave = () => {
    Alert.alert('Berhasil', 'Data profil berhasil diperbarui.');
  };

  const openEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const openChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Apakah kamu yakin ingin keluar dari akun?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => navigation.replace('Login'),
        },
      ]
    );
  };

  const SectionTitle = ({ title, action }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const InputField = ({ label, value, onChangeText, placeholder }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        style={styles.textInput}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={18} color={C.white} />
          </TouchableOpacity>
          <View style={styles.headerGreeting}>
            <Text style={styles.greeting}>Halo, Naya</Text>
            <Text style={styles.headerSubtitle}>
              Find your next unforgettable experience
            </Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <UserRound size={35} color={C.white} />
              <View style={styles.avatarOnline}>
                <Check size={10} color={C.white} />
              </View>
            </View>

            <View style={styles.profileMain}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>Kanaya amira</Text>
                <CheckCircle2 size={14} color={C.green} />
              </View>

              <Text style={styles.profileEmail}>
                kanaya.amira@gmail.com
              </Text>

              <Text style={styles.memberText}>
                <Text style={{ color: C.green }}>Verified</Text>
                {'  '}ID: 00246
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editSmallButton}
              onPress={openEditProfile}
            >
              <Pencil size={12} color={C.white} />
              <Text style={styles.editSmallText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ticket size={15} color={C.light} />
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Total Tickets</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.stat}>
              <Heart size={15} color={C.pink} />
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Wishlist</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.stat}>
              <Wallet size={15} color={C.green} />
              <Text style={styles.statNumber}>$1,150</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>
        </View>

        {/* PROFILE TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
        >
          {['Personal Info', 'Music & Artist Preferences', 'Payment'].map(
            (tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* ACTIVE TICKET */}
        <SectionTitle
          title="MY ACTIVE TICKET"
          action={() => navigation.navigate('MyTickets')}
        />

        <View style={styles.ticketCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900',
            }}
            style={styles.ticketImage}
          />

          <View style={styles.ticketImageOverlay}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE TICKET</Text>
            </View>

            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>Date: 21 Nov 2026</Text>
            </View>
          </View>

          <View style={styles.ticketContent}>
            <Text style={styles.ticketEvent}>LANY WORLD TOUR 2026</Text>
            <Text style={styles.ticketLocation}>
              <MapPin size={11} color={C.light} /> Jakarta, Indonesia
            </Text>

            <View style={styles.ticketDetails}>
              <View style={styles.ticketDetail}>
                <CalendarDays size={13} color={C.light} />
                <Text style={styles.ticketDetailText}>21 Nov 2026</Text>
              </View>

              <View style={styles.ticketDetail}>
                <Ticket size={13} color={C.light} />
                <Text style={styles.ticketDetailText}>VIP</Text>
              </View>

              <View style={styles.ticketDetail}>
                <Text style={styles.ticketDetailText}>Qty: 01</Text>
              </View>
            </View>

            <View style={styles.ticketBottom}>
              <Text style={styles.ticketCode}>LYN-2026-001</Text>

              <TouchableOpacity
                style={styles.viewTicketButton}
                onPress={() => navigation.navigate('MyTickets')}
              >
                <Text style={styles.viewTicketText}>View Ticket</Text>
                <ChevronRight size={13} color={C.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* IDENTITY INFORMATION */}
        <SectionTitle title="IDENTITY & TICKET INFORMATION" />

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            These details are used automatically for booking tickets and
            identifying your account.
          </Text>

          <InputField
            label="FULL NAME"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
          />

          <InputField
            label="EMAIL ADDRESS"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
          />

          <View style={styles.twoColumn}>
            <View style={{ flex: 1 }}>
              <InputField
                label="PHONE NUMBER"
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
              />
            </View>

            <View style={{ flex: 1 }}>
              <InputField
                label="IDENTITY ID"
                value={identity}
                onChangeText={setIdentity}
                placeholder="Identity number"
              />
            </View>
          </View>

          <Text style={styles.helperText}>
            Any changes will affect your future concert ticket reservations.
          </Text>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setName('Kanaya amira');
                setEmail('kanaya.amira@gmail.com');
                setPhone('+62 812-3456-7890');
                setIdentity('3201XXXXXXXXXXXX');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MUSIC PREFERENCES */}
        <SectionTitle title="MUSIC & ARTIST PREFERENCES" />

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Personalize your concert recommendations based on your
            music interests.
          </Text>

          <Text style={styles.subHeading}>FAVORITE GENRES</Text>

          <View style={styles.genreRow}>
            {genres.map((genre) => {
              const selected = selectedGenres.includes(genre);

              return (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreChip,
                    selected && styles.genreSelected,
                  ]}
                  onPress={() => toggleGenre(genre)}
                >
                  <Text
                    style={[
                      styles.genreText,
                      selected && styles.genreSelectedText,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.subHeading}>ARTISTS YOU FOLLOW</Text>

          {artists.map((artist) => (
            <View key={artist.name} style={styles.artistItem}>
              <View
                style={[
                  styles.artistAvatar,
                  { backgroundColor: artist.color },
                ]}
              >
                <Music2 size={18} color={C.white} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.artistGenre}>{artist.genre}</Text>
              </View>

              <TouchableOpacity
                onPress={() => toggleArtist(artist.name)}
              >
                <Text
                  style={[
                    styles.followButton,
                    !selectedArtists.includes(artist.name) && {
                      color: C.muted,
                    },
                  ]}
                >
                  {selectedArtists.includes(artist.name)
                    ? 'Following'
                    : '+ Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addArtistButton}>
            <Plus size={14} color={C.light} />
            <Text style={styles.addArtistText}>Follow New Artists</Text>
          </TouchableOpacity>
        </View>

        {/* FAN PASS */}
        <SectionTitle title="LYNORA FAN PASS" />

        <View style={styles.fanCard}>
          <View style={styles.fanTop}>
            <View>
              <Text style={styles.fanTitle}>LYNORA VIP PASS</Text>
              <Text style={styles.fanSubtitle}>Your concert journey</Text>
            </View>

            <View style={styles.vipBadge}>
              <Star size={12} color="#FBBF24" />
              <Text style={styles.vipText}>VIP</Text>
            </View>
          </View>

          <View style={styles.fanProgressRow}>
            <Text style={styles.fanXP}>1,200 / 2,000 XP</Text>
            <Text style={styles.fanNext}>Next Level</Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.fanBottom}>
            <Text style={styles.fanDescription}>
              800 XP until your next reward
            </Text>
            <Text style={styles.fanReward}>+150 points next event</Text>
          </View>
        </View>

        {/* ACCOUNT SECURITY */}
        <SectionTitle title="ACCOUNT SECURITY" />

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Protect your account and manage security settings.
          </Text>

          <View style={styles.securityItem}>
            <View style={styles.securityIcon}>
              <ShieldCheck size={17} color={C.light} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>
                Two-Factor Authentication
              </Text>
              <Text style={styles.securitySubtitle}>
                Extra protection for your account
              </Text>
            </View>

            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: '#39415B', true: C.purple }}
              thumbColor={C.white}
            />
          </View>

          <TouchableOpacity
            style={styles.securityItem}
            onPress={openChangePassword}
          >
            <View style={styles.securityIcon}>
              <Lock size={17} color={C.light} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Change Password</Text>
              <Text style={styles.securitySubtitle}>
                Update your account password
              </Text>
            </View>

            <ChevronRight size={17} color={C.muted} />
          </TouchableOpacity>

          <View style={styles.securityItem}>
            <View style={styles.securityIcon}>
              <Smartphone size={17} color={C.light} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>
                Manage Device Sessions (2)
              </Text>
              <Text style={styles.securitySubtitle}>
                Manage devices connected to your account
              </Text>
            </View>

            <ChevronRight size={17} color={C.muted} />
          </View>

          <View style={styles.devicePreview}>
            <Smartphone size={15} color={C.light} />
            <Text style={styles.deviceText}>iPhone 15 Pro</Text>
            <Text style={styles.deviceActive}>Active</Text>
          </View>

          <View style={styles.devicePreview}>
            <Laptop size={15} color={C.light} />
            <Text style={styles.deviceText}>MacBook Pro 14"</Text>
            <Text style={styles.deviceActive}>Active</Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={15} color={C.pink} />
            <Text style={styles.logoutText}>
              Sign Out of All Other Devices
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>
          LYNORA Mobile App · Version 1.0.0
        </Text>

        <View style={{ height: 25 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 17,
  },

  headerGreeting: {
    flex: 1,
  },

  greeting: {
    color: C.white,
    fontSize: 18,
    fontWeight: 'bold',
  },

  headerSubtitle: {
    color: C.muted,
    fontSize: 9,
    marginTop: 4,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: C.card2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationDot: {
    position: 'absolute',
    right: 7,
    top: 6,
    width: 6,
    height: 6,
    backgroundColor: C.pink,
    borderRadius: 5,
  },

  smallAvatar: {
    width: 34,
    height: 34,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.light,
    backgroundColor: C.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 11,
    marginBottom: 13,
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 25,
    backgroundColor: '#39236E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarOnline: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 10,
    backgroundColor: C.purple,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileMain: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  profileName: {
    color: C.white,
    fontSize: 11,
    fontWeight: 'bold',
  },

  profileEmail: {
    color: C.muted,
    fontSize: 8,
    marginTop: 3,
  },

  memberText: {
    color: C.muted,
    fontSize: 8,
    marginTop: 4,
  },

  editSmallButton: {
    backgroundColor: C.purple,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  editSmallText: {
    color: C.white,
    fontSize: 8,
    fontWeight: 'bold',
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: 'center',
  },

  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },

  statNumber: {
    color: C.white,
    fontSize: 12,
    fontWeight: 'bold',
  },

  statLabel: {
    color: C.muted,
    fontSize: 7,
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: C.border,
  },

  tabsScroll: {
    marginBottom: 16,
    flexGrow: 0,
  },

  tab: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: C.card,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: C.border,
  },

  activeTab: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },

  tabText: {
    color: C.muted,
    fontSize: 8,
    fontWeight: '600',
  },

  activeTabText: {
    color: C.white,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    marginTop: 3,
    gap: 7,
  },

  sectionLine: {
    width: 3,
    height: 14,
    backgroundColor: C.light,
    borderRadius: 5,
  },

  sectionTitle: {
    color: C.white,
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },

  seeAll: {
    color: C.pink,
    fontSize: 8,
    fontWeight: 'bold',
  },

  ticketCard: {
    backgroundColor: C.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 16,
  },

  ticketImage: {
    width: '100%',
    height: 115,
    backgroundColor: C.card2,
  },

  ticketImageOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  activeBadge: {
    backgroundColor: '#08A878',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },

  activeBadgeText: {
    color: C.white,
    fontSize: 7,
    fontWeight: 'bold',
  },

  dateBadge: {
    backgroundColor: '#0D1427',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
  },

  dateBadgeText: {
    color: C.white,
    fontSize: 7,
  },

  ticketContent: {
    padding: 10,
  },

  ticketEvent: {
    color: C.white,
    fontSize: 11,
    fontWeight: 'bold',
  },

  ticketLocation: {
    color: C.light,
    fontSize: 8,
    marginTop: 5,
  },

  ticketDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },

  ticketDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ticketDetailText: {
    color: C.muted,
    fontSize: 8,
  },

  ticketBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  ticketCode: {
    color: C.muted,
    fontSize: 8,
  },

  viewTicketButton: {
    backgroundColor: C.purple,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  viewTicketText: {
    color: C.white,
    fontSize: 8,
    fontWeight: 'bold',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    padding: 11,
    marginBottom: 16,
  },

  cardDescription: {
    color: C.muted,
    fontSize: 8,
    lineHeight: 13,
    marginBottom: 11,
  },

  field: {
    marginBottom: 10,
  },

  fieldLabel: {
    color: '#BBC4D9',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  textInput: {
    height: 34,
    backgroundColor: '#0A1122',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingHorizontal: 9,
    color: C.white,
    fontSize: 9,
  },

  twoColumn: {
    flexDirection: 'row',
    gap: 9,
  },

  helperText: {
    color: C.muted,
    fontSize: 7,
    lineHeight: 11,
    marginBottom: 10,
  },

  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 7,
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 7,
  },

  cancelText: {
    color: C.muted,
    fontSize: 8,
  },

  saveButton: {
    backgroundColor: C.purple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 7,
  },

  saveText: {
    color: C.white,
    fontSize: 8,
    fontWeight: 'bold',
  },

  subHeading: {
    color: C.white,
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 9,
    marginTop: 5,
  },

  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 15,
  },

  genreChip: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#0B1225',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 15,
  },

  genreSelected: {
    backgroundColor: '#4D2A91',
    borderColor: C.purple,
  },

  genreText: {
    color: C.muted,
    fontSize: 8,
  },

  genreSelectedText: {
    color: C.white,
  },

  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#0C1327',
    borderRadius: 9,
    padding: 8,
    marginBottom: 7,
  },

  artistAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  artistName: {
    color: C.white,
    fontSize: 9,
    fontWeight: 'bold',
  },

  artistGenre: {
    color: C.muted,
    fontSize: 7,
    marginTop: 3,
  },

  followButton: {
    color: C.green,
    fontSize: 8,
    fontWeight: 'bold',
  },

  addArtistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    padding: 9,
    borderRadius: 8,
    marginTop: 4,
  },

  addArtistText: {
    color: C.light,
    fontSize: 8,
  },

  fanCard: {
    backgroundColor: '#211746',
    borderRadius: 13,
    padding: 13,
    borderWidth: 1,
    borderColor: '#5836A4',
    marginBottom: 16,
  },

  fanTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  fanTitle: {
    color: C.white,
    fontSize: 11,
    fontWeight: 'bold',
  },

  fanSubtitle: {
    color: C.muted,
    fontSize: 8,
    marginTop: 3,
  },

  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#47331A',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  vipText: {
    color: '#FBBF24',
    fontSize: 8,
    fontWeight: 'bold',
  },

  fanProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 7,
  },

  fanXP: {
    color: C.white,
    fontSize: 8,
    fontWeight: 'bold',
  },

  fanNext: {
    color: C.light,
    fontSize: 8,
  },

  progressBackground: {
    height: 7,
    borderRadius: 5,
    backgroundColor: '#493D6B',
    overflow: 'hidden',
  },

  progressFill: {
    height: 7,
    width: '60%',
    backgroundColor: C.purple,
    borderRadius: 5,
  },

  fanBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  fanDescription: {
    color: C.muted,
    fontSize: 7,
  },

  fanReward: {
    color: C.green,
    fontSize: 7,
  },

  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  securityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#222347',
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityTitle: {
    color: C.white,
    fontSize: 9,
    fontWeight: 'bold',
  },

  securitySubtitle: {
    color: C.muted,
    fontSize: 7,
    marginTop: 3,
  },

  devicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0B1225',
    padding: 9,
    borderRadius: 8,
    marginTop: 6,
  },

  deviceText: {
    flex: 1,
    color: C.white,
    fontSize: 8,
  },

  deviceActive: {
    color: C.green,
    fontSize: 8,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#74283D',
    backgroundColor: '#2A1425',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },

  logoutText: {
    color: C.pink,
    fontSize: 8,
    fontWeight: 'bold',
  },

  version: {
    color: C.muted,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 5,
  },
});
