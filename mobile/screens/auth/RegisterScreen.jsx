
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import SocialProviderModal from '../../components/SocialProviderModal';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [socialProvider, setSocialProvider] = useState(null);

  const handleRegister = async () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !phone
    ) {
      Alert.alert('Peringatan', 'Semua kolom wajib diisi.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Peringatan', 'Password tidak sama.');
      return;
    }

    if (!agree) {
      Alert.alert('Peringatan', 'Silakan setujui Terms & Conditions.');
      return;
    }

    Alert.alert(
      'Registrasi berhasil',
      'Data akun sudah tervalidasi untuk alur frontend.',
      [{ text: 'OK', onPress: () => navigation.replace('Login') }]
    );
  };

  const showLegalNotice = (documentName) => {
    Alert.alert(
      documentName,
      'Dokumen resmi belum tersedia di aplikasi. Pendaftaran ini hanya simulasi lokal dan data tidak dikirim ke server.',
    );
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={21} color="#DCE3F8" />
          </TouchableOpacity>
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
          <Text style={styles.formTitle}>Start Your Journey</Text>
          <Text style={styles.formDescription}>
            Tell us who you are in the key spaces.
          </Text>

          <View style={styles.nameRow}>
            <View style={styles.nameColumn}>
              <Text style={styles.label}>FIRST NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#69738E"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={styles.nameColumn}>
              <Text style={styles.label}>LAST NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#69738E"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email"
            placeholderTextColor="#69738E"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.nameRow}>
            <View style={styles.nameColumn}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordField}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#69738E"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordVisibility}
                  onPress={() => setShowPassword((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                >
                  <Text style={styles.passwordVisibilityText}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.nameColumn}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={styles.passwordField}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#69738E"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.passwordVisibility}
                  onPress={() =>
                    setShowConfirmPassword((visible) => !visible)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? 'Sembunyikan konfirmasi password'
                      : 'Tampilkan konfirmasi password'
                  }
                >
                  <Text style={styles.passwordVisibilityText}>
                    {showConfirmPassword ? 'HIDE' : 'SHOW'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="+62  |  812 3456 789"
            placeholderTextColor="#69738E"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setAgree((previous) => !previous)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agree }}
              accessibilityLabel="Setuju dengan syarat dan kebijakan privasi"
            >
            <View style={[styles.checkbox, agree && styles.checked]}>
              {agree && <View style={styles.checkMark} />}
            </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => showLegalNotice('Terms & Conditions')}
                accessibilityRole="link"
              >
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => showLegalNotice('Privacy Policy')}
                accessibilityRole="link"
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity onPress={handleRegister} activeOpacity={0.85}>
            <LinearGradient
              colors={['#9636E8', '#5637F2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainButton}
            >
              <Text style={styles.mainButtonText}>CREATE ACCOUNT</Text>
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
              onPress={() => setSocialProvider('Google')}
              accessibilityRole="button"
              accessibilityLabel="Daftar dengan Google"
            >
              <Text style={styles.googleText}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => setSocialProvider('Facebook')}
              accessibilityRole="button"
              accessibilityLabel="Daftar dengan Facebook"
            >
              <Text style={styles.facebookText}>f</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => setSocialProvider('Apple')}
              accessibilityRole="button"
              accessibilityLabel="Daftar dengan Apple"
            >
              <Text style={styles.appleText}>A</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signupText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    marginBottom: 13,
  },
  topLabel: {
    color: '#69738E',
    fontSize: 9,
    letterSpacing: 2,
  },
  intro: {
    marginBottom: 12,
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
    lineHeight: 15,
    marginTop: 4,
    maxWidth: 290,
  },
  banner: {
    borderWidth: 1,
    borderColor: '#483477',
    borderRadius: 13,
    padding: 11,
    marginBottom: 14,
    minHeight: 82,
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
    fontSize: 14,
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
    marginTop: 4,
  },
  bannerRight: {
    width: 90,
    justifyContent: 'center',
    gap: 6,
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
    marginTop: 8,
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
    backgroundColor: 'rgba(16, 26, 49, 0.55)',
    borderRadius: 15,
    padding: 1,
  },
  formTitle: {
    color: '#A18BFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  formDescription: {
    color: '#8994B0',
    fontSize: 9,
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameColumn: {
    flex: 1,
  },
  label: {
    color: '#D5DCEF',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    height: 39,
    borderWidth: 1,
    borderColor: '#263452',
    borderRadius: 8,
    backgroundColor: '#0A1227',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    fontSize: 10,
    marginBottom: 12,
  },
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordVisibility: {
    position: 'absolute',
    right: 9,
    top: 10,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  passwordVisibilityText: {
    color: '#8994B0',
    fontSize: 7,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#52617F',
    borderRadius: 3,
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: '#7544E8',
    borderColor: '#7544E8',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 8,
  },
  termsText: {
    color: '#929DB8',
    fontSize: 8,
    flexShrink: 1,
  },
  termsLink: {
    color: '#9B82FF',
    textDecorationLine: 'underline',
  },
  mainButton: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 11,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18233D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '900',
  },
  facebookText: {
    color: '#2785FF',
    fontSize: 19,
    fontWeight: '900',
  },
  appleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 17,
    marginBottom: 8,
  },
  footerText: {
    color: '#929DB8',
    fontSize: 9,
  },
  signupText: {
    color: '#35D5E9',
    fontSize: 9,
    fontWeight: '700',
  },
});
