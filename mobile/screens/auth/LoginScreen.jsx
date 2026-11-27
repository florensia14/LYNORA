
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SocialProviderModal from '../../components/SocialProviderModal';
import {
  loadLoginPreferences,
  saveLoginPreferences,
} from '../../utils/authPreferences';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [socialProvider, setSocialProvider] = useState(null);

  useEffect(() => {
    let active = true;
    loadLoginPreferences()
      .then((preferences) => {
        if (active) {
          setRemember(preferences.rememberMe);
          setEmail(preferences.email);
        }
      })
      .catch((error) => {
        Alert.alert(
          'Preferensi login gagal dimuat',
          error.message || 'Silakan coba lagi.',
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleRemember = async () => {
    const nextRemember = !remember;
    setRemember(nextRemember);
    try {
      await saveLoginPreferences(nextRemember, email);
    } catch (error) {
      setRemember(remember);
      Alert.alert(
        'Preferensi login gagal disimpan',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const persistRememberedEmail = async () => {
    if (!remember) {
      return;
    }

    try {
      await saveLoginPreferences(true, email);
    } catch (error) {
      Alert.alert(
        'Email tidak dapat disimpan',
        error.message || 'Silakan coba lagi.',
      );
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setForgotSubmitted(false);
    setForgotPasswordVisible(true);
  };

  const submitForgotPassword = () => {
    const normalizedEmail = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Email tidak valid', 'Masukkan alamat email yang benar.');
      return;
    }
    setForgotSubmitted(true);
  };

  const handleLogin = async () => {
  if (!email.trim() || !password) {
    Alert.alert('Peringatan', 'Email dan password wajib diisi.');
    return;
  }

  navigation.replace('MainTab');
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080D1D" />

      <LinearGradient
        colors={['#211044', '#0B1022', '#050914']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Text style={styles.topLabel}>LYNORA LIVE</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.joinText}>JOIN</Text>
          <Text style={styles.logo}>LYNORA</Text>
          <Text style={styles.description}>
            Experience every moment. Create your account to
            access exclusive live events, front-row drops,
            and global stages.
          </Text>
        </View>

        <LinearGradient
          colors={['#34205D', '#111A36', '#17102B']}
          style={styles.banner}
        >
          <View style={styles.bannerTop}>
            <View style={styles.bannerLeft}>
              <Text style={styles.bannerTitle}>LYNORA</Text>
              <Text style={styles.bannerSubtitle}>LIVE EXPERIENCE</Text>
              <Text style={styles.bannerSmall}>
                Your next unforgettable moment starts here.
              </Text>
            </View>

            <View style={styles.bannerRight}>
              <View style={styles.bannerLine} />
              <View style={styles.bannerLineShort} />
              <View style={styles.bannerLine} />
            </View>
          </View>

          <View style={styles.bannerBottom}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE STAGE ACCESS</Text>
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.welcome}>Welcome Back</Text>
          <Text style={styles.formDescription}>
            Login to keep chasing the front row.
          </Text>

          <Text style={styles.label}>EMAIL</Text>
         <TextInput
  style={styles.input}
  placeholder="your email"
  placeholderTextColor="#69738E"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="off"
  importantForAutofill="no"
  underlineColorAndroid="transparent"
  onBlur={persistRememberedEmail}
/>

          <View style={styles.passwordHeader}>
            <Text style={styles.label}>PASSWORD</Text>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••••"
              placeholderTextColor="#69738E"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.showPassword}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={toggleRemember}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: remember }}
            >
              <View style={[styles.checkbox, remember && styles.checked]}>
                {remember && <View style={styles.checkMark} />}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openForgotPassword}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleLogin} activeOpacity={0.85}>
            <LinearGradient
              colors={['#9636E8', '#5637F2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainButton}
            >
              <Text style={styles.mainButtonText}>LOGIN</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR CONTINUE</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              accessibilityRole="button"
              accessibilityLabel="Lanjutkan dengan Google"
              onPress={() => setSocialProvider('Google')}
            >
              <Text style={styles.googleText}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              accessibilityRole="button"
              accessibilityLabel="Lanjutkan dengan Facebook"
              onPress={() => setSocialProvider('Facebook')}
            >
              <Text style={styles.facebookText}>f</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              accessibilityRole="button"
              accessibilityLabel="Lanjutkan dengan Apple"
              onPress={() => setSocialProvider('Apple')}
            >
              <Text style={styles.appleText}>A</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Forgot Password</Text>
            {forgotSubmitted ? (
              <>
                <Text style={styles.modalDescription}>
                  Permintaan reset belum dikirim. Fitur ini membutuhkan
                  layanan backend dan email yang belum terhubung.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={() => setForgotPasswordVisible(false)}
                >
                  <Text style={styles.modalPrimaryText}>Mengerti</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  Masukkan email akun. Form ini hanya validasi lokal; email
                  reset tidak akan dikirim sebelum layanan tersedia.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  placeholder="Email akun"
                  placeholderTextColor="#69738E"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email akun untuk reset password"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={() => setForgotPasswordVisible(false)}
                  >
                    <Text style={styles.modalSecondaryText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryButton}
                    onPress={submitForgotPassword}
                  >
                    <Text style={styles.modalPrimaryText}>Lanjutkan</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <SocialProviderModal
        provider={socialProvider}
        onCancel={() => setSocialProvider(null)}
        onContinue={() => {
          setSocialProvider(null);
          navigation.replace('MainTab');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080D1D',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 12,
    paddingBottom: 25,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },
  topLabel: {
    color: '#69738E',
    fontSize: 9,
    letterSpacing: 2,
  },
  intro: {
    marginBottom: 14,
  },
  joinText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  logo: {
    color: '#718CFF',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -1,
  },
  description: {
    color: '#A2ABC2',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
    maxWidth: 290,
  },
  banner: {
    borderWidth: 1,
    borderColor: '#483477',
    borderRadius: 13,
    padding: 12,
    marginBottom: 15,
    minHeight: 91,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flex: 1,
  },
  bannerTitle: {
    color: '#B7A1FF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bannerSubtitle: {
    color: '#FFFFFF',
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 3,
  },
  bannerSmall: {
    color: '#A6A0C7',
    fontSize: 7,
    marginTop: 5,
  },
  bannerRight: {
    width: 90,
    justifyContent: 'center',
    gap: 7,
  },
  bannerLine: {
    height: 5,
    backgroundColor: '#4C4773',
    borderRadius: 5,
  },
  bannerLineShort: {
    height: 5,
    width: '65%',
    backgroundColor: '#4C4773',
    borderRadius: 5,
  },
  bannerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#29E5D1',
    marginRight: 5,
  },
  liveText: {
    color: '#45E5DC',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: 'rgba(16, 26, 49, 0.82)',
    borderWidth: 1,
    borderColor: '#1D2A49',
    borderRadius: 18,
    padding: 17,
    paddingTop: 20,
  },
  welcome: {
    color: '#8D78FF',
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  formDescription: {
    color: '#8994B0',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    color: '#D5DCEF',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.7,
    marginBottom: 7,
  },
  input: {
    height: 43,
    borderWidth: 1,
    borderColor: '#263452',
    borderRadius: 9,
    backgroundColor: '#0A1227',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 11,
    marginBottom: 15,
  },
  passwordHeader: {
    marginTop: 1,
  },
  passwordContainer: {
    height: 43,
    borderWidth: 1,
    borderColor: '#263452',
    borderRadius: 9,
    backgroundColor: '#0A1227',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 13,
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#0A1227',
    color: '#FFFFFF',
    fontSize: 11,
  },
  showPassword: {
    color: '#8994B0',
    fontSize: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 13,
    height: 13,
    borderWidth: 1,
    borderColor: '#52617F',
    borderRadius: 3,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: '#7544E8',
    borderColor: '#7544E8',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 9,
  },
  rememberText: {
    color: '#929DB8',
    fontSize: 9,
  },
  forgotText: {
    color: '#36D5E8',
    fontSize: 9,
  },
  mainButton: {
    height: 43,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 19,
    marginBottom: 13,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#26314B',
  },
  orText: {
    color: '#7D89A5',
    fontSize: 8,
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 13,
  },
  socialButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#18233D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    color: '#4285F4',
    fontSize: 17,
    fontWeight: '900',
  },
  facebookText: {
    color: '#2785FF',
    fontSize: 20,
    fontWeight: '900',
  },
  appleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modalCard: {
    backgroundColor: '#111A30',
    borderWidth: 1,
    borderColor: '#27314B',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalDescription: {
    color: '#A2ABC2',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInput: {
    height: 43,
    borderWidth: 1,
    borderColor: '#263452',
    borderRadius: 9,
    backgroundColor: '#0A1227',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
  },
  modalPrimaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7544E8',
    borderRadius: 9,
    paddingHorizontal: 14,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalSecondaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18233D',
    borderRadius: 9,
    paddingHorizontal: 14,
  },
  modalSecondaryText: {
    color: '#D5DCEF',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  footerText: {
    color: '#929DB8',
    fontSize: 10,
  },
  signupText: {
    color: '#35D5E9',
    fontSize: 10,
    fontWeight: '700',
  },
});
