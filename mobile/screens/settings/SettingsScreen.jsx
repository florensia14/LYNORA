
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import HeaderActions from '../../components/HeaderActions';
import { getProfile } from '../../services/profileService';
import { logout } from '../../services/authService';
import {
  clearSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../../utils/settingsStorage';

const PURPLE = '#8B35F5';
const BG = '#080B19';
const CARD = '#14182F';
const TEXT = '#F8FAFC';
const MUTED = '#929BB8';
const PAYMENT_METHODS = [
  {
    id: 'QRIS',
    title: 'QRIS',
    description: 'Bayar dengan pemindaian kode QR.',
    icon: 'qr-code-outline',
  },
  {
    id: 'GoPay',
    title: 'GoPay',
    description: 'Gunakan saldo dompet digital GoPay.',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'Bank Transfer',
    title: 'Transfer Bank',
    description: 'Pembayaran melalui virtual account.',
    icon: 'business-outline',
  },
  {
    id: 'Card',
    title: 'Kartu Kredit / Debit',
    description: 'Pengaturan metode demo untuk pembayaran kartu.',
    icon: 'card-outline',
  },
];

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [securitySectionY, setSecuritySectionY] = useState(0);
  const scrollRef = useRef(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let active = true;
    loadSettings()
      .then((savedSettings) => {
        if (active) {
          setSettings(savedSettings);
        }
      })
      .catch((error) => {
        Alert.alert(
          'Pengaturan gagal dimuat',
          error.message || 'Silakan coba lagi.',
        );
      });

    getProfile()
      .then((savedProfile) => {
        if (active && savedProfile) {
          setProfile(savedProfile);
        }
      })
      .catch((error) => {
        Alert.alert(
          'Profil gagal dimuat',
          error.message || 'Silakan coba lagi.',
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const persistSettings = async (changes) => {
    try {
      const updatedSettings = await saveSettings(changes);
      setSettings(updatedSettings);
      return true;
    } catch (error) {
      Alert.alert(
        'Pengaturan gagal disimpan',
        error.message || 'Silakan coba lagi.',
      );
      return false;
    }
  };

  const requestConfirmation = (options) => {
    setConfirmation(options);
  };

  const runConfirmation = async () => {
    const action = confirmation?.onConfirm;
    setConfirmation(null);
    if (!action) {
      return;
    }

    try {
      await action();
    } catch (error) {
      Alert.alert(
        'Aksi gagal dilakukan',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const PasswordInput = ({
    label,
    value,
    onChangeText,
    visible,
    onToggle,
    placeholder,
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.passwordInput}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#65708F"
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
        />

        <TouchableOpacity onPress={onToggle}>
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={19}
            color={MUTED}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Perhatian', 'Semua kolom password harus diisi.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Perhatian', 'Password minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Perhatian', 'Konfirmasi password tidak cocok.');
      return;
    }

    const saved = await persistSettings({
      lastPasswordChangedAt: new Date().toISOString(),
    });
    if (!saved) {
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert(
      'Validasi berhasil',
      'Perubahan ini hanya simulasi lokal. Password login tidak berubah karena backend belum terhubung.',
    );
  };

  const handleSignOut = () => {
    requestConfirmation({
      title: 'Sign Out Other Devices',
      message:
        'Sesi perangkat lain akan dihapus dari daftar demo di perangkat ini. Tindakan ini tidak menghubungi server.',
      actionLabel: 'Sign Out',
      onConfirm: async () => {
        const saved = await persistSettings({ otherDevicesSignedOut: true });
        if (saved) {
          Alert.alert('Berhasil', 'Sesi perangkat demo lain telah dihapus.');
        }
      },
    });
  };

  const handleDeactivate = () => {
    const deactivate = settings.accountStatus === 'active';
    requestConfirmation({
      title: deactivate ? 'Deactivate Account' : 'Reactivate Account',
      message: deactivate
        ? 'Akun demo akan ditandai nonaktif di perangkat ini. Tidak ada perubahan pada server.'
        : 'Akun demo akan ditandai aktif kembali di perangkat ini.',
      actionLabel: deactivate ? 'Deactivate' : 'Reactivate',
      destructive: deactivate,
      onConfirm: async () => {
        const saved = await persistSettings({
          accountStatus: deactivate ? 'deactivated' : 'active',
        });
        if (saved) {
          Alert.alert(
            'Status diperbarui',
            deactivate
              ? 'Akun demo ditandai nonaktif di perangkat ini.'
              : 'Akun demo aktif kembali.',
          );
        }
      },
    });
  };

  const handleDelete = () => {
    requestConfirmation({
      title: 'Delete Local Demo Account',
      message:
        'Sesi dan profil demo pada perangkat ini akan dihapus. Karena backend belum terhubung, akun di server tidak terpengaruh.',
      actionLabel: 'Delete Local Data',
      destructive: true,
      onConfirm: async () => {
        await logout();
        await AsyncStorage.removeItem('lynora_profile');
        await clearSettings();
        const rootNavigation = navigation.getParent();
        if (rootNavigation?.reset) {
          rootNavigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } else {
          navigation.navigate('Login');
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, Tora</Text>
            <Text style={styles.subtitle}>
              Find your next unforgettable experience
            </Text>
          </View>
          <HeaderActions navigation={navigation} />
        </View>

        {/* ACCOUNT BANNER */}
        <View style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>SYSTEM & ACCOUNT</Text>
            <Text style={styles.bannerSubtitle}>
              CONFIGURATION
            </Text>
          </View>

          <View style={styles.secureBadge}>
            <Ionicons
              name={settings.twoFactorEnabled ? 'shield-checkmark' : 'shield-outline'}
              size={13}
              color={settings.twoFactorEnabled ? '#10DFA0' : MUTED}
            />
            <Text style={styles.secureText}>
              {settings.twoFactorEnabled ? '2FA Local: On' : '2FA Local: Off'}
            </Text>
          </View>
        </View>

        {/* PAGE TITLE */}
        <View style={styles.pageTitle}>
          <Text style={styles.title}>Account Settings</Text>
          <Text style={styles.description}>
            Manage your security preferences, payment methods, ticket
            drop notifications, and display configuration for your LYNORA app.
          </Text>
        </View>

        {/* CATEGORY */}
        <Text style={styles.sectionLabel}>SETTINGS CATEGORIES</Text>

        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={styles.categoryActive}
            onPress={() =>
              scrollRef.current?.scrollTo({
                y: Math.max(0, securitySectionY - 12),
                animated: true,
              })
            }
            accessibilityRole="button"
          >
            <Ionicons name="lock-closed-outline" size={15} color="#FFFFFF" />
            <Text style={styles.categoryActiveText}>Security & Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.category}
            onPress={() => setShowPaymentMethods(true)}
            accessibilityRole="button"
          >
            <Ionicons name="card-outline" size={15} color="#37D8F7" />
            <Text style={styles.categoryText}>Payment Methods</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categorySmall}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
          >
            <Ionicons name="notifications-outline" size={18} color="#FBBF24" />
          </TouchableOpacity>
        </View>

        {/* PROFILE CARD */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Buka profil akun"
        >
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={27} color="#D8B4FE" />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.name || 'Naya Pratama'}
            </Text>
            <Text style={styles.profileEmail}>
              {profile?.email || 'naya.pratama@gmail.com'}
            </Text>
          </View>

          <View style={styles.verifiedBadge}>
            <Ionicons
              name={settings.accountStatus === 'active' ? 'checkmark-circle' : 'pause-circle'}
              size={14}
              color={settings.accountStatus === 'active' ? '#10DFA0' : '#FBBF24'}
            />
            <Text style={styles.verifiedText}>
              {settings.accountStatus === 'active' ? 'Demo Member' : 'Inactive'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* CHANGE PASSWORD */}
        <View
          style={styles.card}
          onLayout={(event) =>
            setSecuritySectionY(event.nativeEvent.layout.y)
          }
        >
          <View style={styles.cardHeading}>
            <View style={styles.headingIcon}>
              <Ionicons name="key-outline" size={23} color={PURPLE} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Change Password</Text>
              <Text style={styles.cardDescription}>
                Keep your account access secure with a unique combination
                of letters, numbers, and symbols.
              </Text>
            </View>
          </View>

          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            visible={showCurrent}
            onToggle={() => setShowCurrent(!showCurrent)}
            placeholder="Enter current password"
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            visible={showNew}
            onToggle={() => setShowNew(!showNew)}
            placeholder="Minimum 8 unique characters"
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={showConfirm}
            onToggle={() => setShowConfirm(!showConfirm)}
            placeholder="Re-enter new password"
          />

          <View style={styles.lastChanged}>
            <Ionicons name="information-circle" size={15} color={MUTED} />
            <Text style={styles.lastChangedText}>
              {settings.lastPasswordChangedAt
                ? `Last changed ${new Date(
                    settings.lastPasswordChangedAt,
                  ).toLocaleDateString('id-ID')}`
                : 'Password belum pernah diperbarui'}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdatePassword}
            >
              <Text style={styles.updateText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TWO FACTOR */}
        <View style={styles.card}>
          <View style={styles.securityRow}>
            <View style={styles.headingIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={29}
                color={PURPLE}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                Two-Factor Authentication (2FA)
              </Text>

              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>

              <Text style={styles.cardDescription}>
                Preferensi 2FA tersimpan lokal. Verifikasi kode saat login
                memerlukan backend yang belum terhubung.
              </Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.activeTextRow}>
              <Ionicons
                name={
                  settings.twoFactorEnabled
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={17}
                color={settings.twoFactorEnabled ? '#10DFA0' : MUTED}
              />
              <Text style={styles.activeText}>
                {settings.twoFactorEnabled
                  ? '2FA preference is on'
                  : '2FA preference is off'}
              </Text>
            </View>

            <Switch
              value={settings.twoFactorEnabled}
              onValueChange={(value) =>
                persistSettings({ twoFactorEnabled: value })
              }
              trackColor={{ false: '#353A50', true: PURPLE }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ACTIVE DEVICES */}
        <View style={styles.card}>
          <View style={styles.deviceHeader}>
            <View style={styles.headingIcon}>
              <Ionicons name="phone-portrait-outline" size={27} color={PURPLE} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Active Device Sessions</Text>
              <Text style={styles.cardDescription}>
                Daftar perangkat demo; sesi server belum terhubung.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={settings.otherDevicesSignedOut}
            >
              <Text style={styles.signOutText}>
                {settings.otherDevicesSignedOut ? 'Signed Out' : 'Sign Out Other'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* IPHONE */}
          {!settings.otherDevicesSignedOut ? (
            <View style={styles.deviceItem}>
              <View style={styles.deviceIcon}>
                <Ionicons name="phone-portrait-outline" size={20} color={PURPLE} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>iPhone 15 Pro</Text>
                <Text style={styles.deviceDescription}>
                  Indonesia, Jakarta · Google Chrome (iOS)
                </Text>
              </View>
              <Text style={styles.deviceTime}>2 hours ago</Text>
            </View>
          ) : (
            <Text style={styles.deviceDescription}>
              Tidak ada sesi perangkat lain yang aktif.
            </Text>
          )}

          {/* MACBOOK */}
          <View style={styles.deviceItem}>
            <View style={styles.deviceIcon}>
              <Ionicons name="laptop-outline" size={21} color={PURPLE} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceName}>MacBook Pro 14"</Text>
                <Text style={styles.thisDevice}>This Device</Text>
              </View>

              <Text style={styles.deviceDescription}>
                Indonesia, Jakarta · Google Chrome (macOS)
              </Text>
            </View>

            <View style={styles.activeNow}>
              <View style={styles.greenDot} />
              <Text style={styles.activeNowText}>Active now</Text>
            </View>
          </View>
        </View>

        {/* DANGER ZONE */}
        <View style={styles.dangerCard}>
          <View style={styles.dangerHeading}>
            <Ionicons name="warning-outline" size={24} color="#FF454F" />

            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <Text style={styles.dangerDescription}>
                Aksi di bawah hanya mengubah status akun demo pada perangkat
                ini. Tidak ada perubahan ke server.
              </Text>
            </View>
          </View>

          <View style={styles.dangerItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerItemTitle}>
                Temporarily Deactivate Account
              </Text>
              <Text style={styles.dangerItemDescription}>
                Your account will be temporarily disabled and you can
                reactivate it later.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deactivateButton}
              onPress={handleDeactivate}
            >
              <Text style={styles.deactivateText}>
                {settings.accountStatus === 'active'
                  ? 'Deactivate Account'
                  : 'Reactivate Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dangerItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerItemTitle}>
                Delete Local Demo Account
              </Text>
              <Text style={styles.dangerItemDescription}>
                Menghapus sesi demo dan profil lokal dari perangkat ini.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteText}>Delete Local Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal
        visible={showPaymentMethods}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentMethods(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.paymentModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Payment Methods</Text>
                <Text style={styles.modalDescription}>
                  Pilih metode default untuk simulasi pembayaran di perangkat ini.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowPaymentMethods(false)}
                accessibilityRole="button"
                accessibilityLabel="Tutup metode pembayaran"
              >
                <Ionicons name="close" size={20} color={TEXT} />
              </TouchableOpacity>
            </View>

            {PAYMENT_METHODS.map((method) => {
              const selected =
                settings.defaultPaymentMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodRow,
                    selected && styles.paymentMethodSelected,
                  ]}
                  onPress={async () => {
                    const saved = await persistSettings({
                      defaultPaymentMethod: method.id,
                    });
                    if (saved) {
                      setShowPaymentMethods(false);
                      Alert.alert(
                        'Metode diperbarui',
                        `${method.title} disimpan sebagai metode pembayaran default lokal.`,
                      );
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih ${method.title} sebagai metode pembayaran default`}
                >
                  <View style={styles.paymentMethodIcon}>
                    <Ionicons
                      name={method.icon}
                      size={19}
                      color={selected ? '#37D8F7' : MUTED}
                    />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>{method.title}</Text>
                    <Text style={styles.paymentMethodDescription}>
                      {method.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={19}
                    color={selected ? '#10DFA0' : '#65708F'}
                  />
                </TouchableOpacity>
              );
            })}

            <Text style={styles.paymentMethodNotice}>
              Tidak ada data kartu atau pembayaran yang dikirim ke server.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(confirmation)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmation(null)}
      >
        {confirmation && (
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmationModal}>
              <Text style={styles.modalTitle}>{confirmation.title}</Text>
              <Text style={styles.confirmationDescription}>
                {confirmation.message}
              </Text>
              <View style={styles.confirmationActions}>
                <TouchableOpacity
                  style={styles.confirmationCancel}
                  onPress={() => setConfirmation(null)}
                >
                  <Text style={styles.confirmationCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmationSubmit,
                    confirmation.destructive && styles.confirmationDanger,
                  ]}
                  onPress={runConfirmation}
                >
                  <Text style={styles.confirmationSubmitText}>
                    {confirmation.actionLabel}
                  </Text>
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
    backgroundColor: BG,
  },

  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 25,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  greeting: {
    fontSize: 19,
    fontWeight: 'bold',
    color: TEXT,
  },

  subtitle: {
    fontSize: 10,
    color: MUTED,
    marginTop: 4,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  headerIcon: {
    width: 37,
    height: 37,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: PURPLE,
    backgroundColor: '#27213D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  banner: {
    backgroundColor: '#35146D',
    borderWidth: 1,
    borderColor: '#7135B9',
    borderRadius: 13,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 19,
  },

  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  bannerSubtitle: {
    color: '#D4C3F4',
    fontSize: 9,
    marginTop: 3,
  },

  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#073D37',
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  secureText: {
    color: '#10DFA0',
    fontSize: 9,
    fontWeight: 'bold',
  },

  pageTitle: {
    marginBottom: 21,
  },

  title: {
    color: TEXT,
    fontSize: 21,
    fontWeight: 'bold',
  },

  description: {
    color: '#A0A9C2',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  sectionLabel: {
    color: '#8992AB',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
  },

  categoryRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 14,
  },

  categoryActive: {
    flex: 1.1,
    backgroundColor: '#6925D1',
    borderRadius: 9,
    paddingVertical: 11,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  categoryActiveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  category: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#252C48',
    borderRadius: 9,
    paddingVertical: 11,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  categoryText: {
    color: '#D6DBEA',
    fontSize: 9,
  },

  categorySmall: {
    width: 38,
    backgroundColor: CARD,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#252C48',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#272D4A',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    gap: 9,
  },

  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: '#30204B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: 'bold',
  },

  profileEmail: {
    color: MUTED,
    fontSize: 9,
    marginTop: 4,
  },

  verifiedBadge: {
    borderWidth: 1,
    borderColor: '#087F68',
    backgroundColor: '#063B32',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  verifiedText: {
    color: '#10DFA0',
    fontSize: 8,
    fontWeight: 'bold',
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#242A49',
    marginBottom: 13,
  },

  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 17,
  },

  headingIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#281746',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: 'bold',
  },

  cardDescription: {
    color: '#A0A9C2',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  inputGroup: {
    marginBottom: 12,
  },

  inputLabel: {
    color: '#E2E8F0',
    fontSize: 11,
    marginBottom: 6,
  },

  passwordInput: {
    height: 40,
    backgroundColor: '#0B1022',
    borderWidth: 1,
    borderColor: '#303754',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
  },

  input: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    paddingVertical: 0,
  },

  lastChanged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },

  lastChangedText: {
    color: MUTED,
    fontSize: 9,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },

  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444B69',
  },

  cancelText: {
    color: TEXT,
    fontSize: 10,
  },

  updateButton: {
    backgroundColor: PURPLE,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
  },

  updateText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  securityRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#34205B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
  },

  recommendedText: {
    color: '#C084FC',
    fontSize: 8,
    fontWeight: 'bold',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  activeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  activeText: {
    color: '#10DFA0',
    fontSize: 10,
    fontWeight: 'bold',
  },

  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },

  signOutButton: {
    borderWidth: 1,
    borderColor: '#444B69',
    borderRadius: 9,
    padding: 8,
  },

  signOutText: {
    color: TEXT,
    fontSize: 9,
    textAlign: 'center',
  },

  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#0D1225',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#252B48',
    padding: 9,
    marginBottom: 6,
  },

  deviceIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: '#21183B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deviceName: {
    color: TEXT,
    fontSize: 10,
    fontWeight: 'bold',
  },

  deviceDescription: {
    color: MUTED,
    fontSize: 8,
    marginTop: 3,
  },

  deviceTime: {
    color: MUTED,
    fontSize: 8,
  },

  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },

  thisDevice: {
    color: '#C084FC',
    backgroundColor: '#352052',
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
  },

  activeNow: {
    alignItems: 'center',
    gap: 3,
  },

  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#10DFA0',
  },

  activeNowText: {
    color: '#10DFA0',
    fontSize: 8,
  },

  dangerCard: {
    backgroundColor: '#1C101D',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#74252E',
    marginBottom: 13,
  },

  dangerHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  dangerTitle: {
    color: '#FF454F',
    fontSize: 14,
    fontWeight: 'bold',
  },

  dangerDescription: {
    color: '#B9A0AA',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 13,
  },

  dangerItemTitle: {
    color: '#F1E7EC',
    fontSize: 10,
    fontWeight: 'bold',
  },

  dangerItemDescription: {
    color: '#A88F9C',
    fontSize: 8,
    lineHeight: 12,
    marginTop: 3,
  },

  deactivateButton: {
    borderWidth: 1,
    borderColor: '#E3424B',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  deactivateText: {
    color: '#FF555F',
    fontSize: 8,
    fontWeight: 'bold',
  },

  deleteButton: {
    backgroundColor: '#D92E3D',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  deleteText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },

  paymentModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303754',
    padding: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },

  modalDescription: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },

  modalClose: {
    padding: 3,
  },

  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    backgroundColor: '#0D1225',
    borderWidth: 1,
    borderColor: '#252B48',
    borderRadius: 11,
    marginTop: 8,
  },

  paymentMethodSelected: {
    borderColor: PURPLE,
    backgroundColor: '#21183B',
  },

  paymentMethodIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#21183B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  paymentMethodInfo: {
    flex: 1,
  },

  paymentMethodTitle: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '700',
  },

  paymentMethodDescription: {
    color: MUTED,
    fontSize: 8,
    marginTop: 4,
  },

  paymentMethodNotice: {
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 13,
  },

  confirmationModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#303754',
    borderRadius: 16,
    padding: 20,
  },

  confirmationDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },

  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 20,
  },

  confirmationCancel: {
    borderWidth: 1,
    borderColor: '#444B69',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  confirmationCancelText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: '700',
  },

  confirmationSubmit: {
    backgroundColor: PURPLE,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  confirmationDanger: {
    backgroundColor: '#D92E3D',
  },

  confirmationSubmitText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
