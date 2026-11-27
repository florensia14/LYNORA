import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Image, ImageBackground, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { login } from '../../services/authService';
import { loadLoginPreferences, saveLoginPreferences } from '../../utils/authPreferences';

const COLORS = { bg: '#080D1B', panel: '#101A31', input: '#080D1B', border: '#46516F', muted: '#A2ABC2', purple: '#8B5CF6', cyan: '#22D3EE' };

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadLoginPreferences().then((value) => {
      if (!mounted) return;
      setRemember(value.rememberMe);
      if (!route?.params?.email && value.email) setEmail(value.email);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [route?.params?.email]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setIsError(true); setMessage('Email dan password wajib diisi.'); return;
    }
    try {
      setLoading(true); setMessage(''); setIsError(false);
      const result = await login(email, password);
      await saveLoginPreferences(remember, email);
      if (result.user?.role !== 'customer') return;
      navigation.reset({ index: 0, routes: [{ name: 'MainTab' }] });
    } catch (error) {
      setIsError(true); setMessage(error.message || 'Tidak dapat menghubungi server.');
    } finally { setLoading(false); }
  };

  const showSocialNotice = (provider) => Alert.alert('Segera hadir', `Login ${provider} belum diaktifkan pada backend LYNORA.`);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#211044" />
      <LinearGradient colors={['#211044', '#10152D', '#080D1B']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandBlock}>
          <Text style={styles.join}>WELCOME BACK</Text>
          <Text style={styles.logo}>LYNORA</Text>
          <Text style={styles.description}>Welcome back to the front row. Log in to discover your favorite concerts, manage your tickets, and experience every moment with LYNORA.</Text>
        </View>

        <ImageBackground source={require('../../assets/auth/masuk.jpg')} imageStyle={styles.heroImage} style={styles.hero}>
          <View style={styles.heroShade} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroBrand}>LYNORA LIVE</Text>
            <Text style={styles.heroSubtitle}>LIVE EXPERIENCE</Text>
            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE STAGE ACCESS</Text></View>
          </View>
        </ImageBackground>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>Log in to keep chasing the front row.</Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput style={styles.input} placeholder="Your email" placeholderTextColor="#69738E" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordWrap}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="••••••••••••" placeholderTextColor="#69738E" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
              <Image source={require('../../assets/icons/eye.png')} style={styles.eyeIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRemember((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: remember }}>
              <View style={[styles.checkbox, remember && styles.checkboxChecked]}>{remember ? <Text style={styles.checkmark}>✓</Text> : null}</View>
              <Text style={styles.optionText}>Remember Me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Fitur reset password belum tersedia di backend.') }><Text style={styles.linkText}>Forgot Password?</Text></TouchableOpacity>
          </View>

          {message ? <Text style={[styles.message, isError ? styles.errorText : styles.successText]}>{message}</Text> : null}

          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#9636E8', '#5637F2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submitButton, loading && styles.disabledButton]}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>LOGIN</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>OR CONTINUE</Text><View style={styles.divider} /></View>
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} onPress={() => showSocialNotice('Google')}><Image source={require('../../assets/icons/google.png')} style={styles.socialIcon} /></TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => showSocialNotice('Facebook')}><Image source={require('../../assets/icons/facebook.png')} style={styles.socialIcon} /></TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => showSocialNotice('Apple')}><Image source={require('../../assets/icons/apple.png')} style={styles.socialIcon} /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}><Text style={styles.footerText}>No account yet? </Text><TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={styles.footerLink}>Sign Up</Text></TouchableOpacity></View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: {flexGrow: 1,justifyContent: 'center',paddingHorizontal: 22,paddingTop: 20,paddingBottom: 30,},
  brandBlock: { marginBottom: 18 },
  join: { color: '#FFFFFF', fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: 0.4 },
  logo: { color: '#718CFF', fontSize: 33, lineHeight: 39, fontWeight: '900', letterSpacing: -0.8 },
  description: { color: '#A2ABC2', fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 460 },
  hero: { height: 118, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 22, borderWidth: 1, borderColor: '#8B5CF6' },
  heroImage: { borderRadius: 14 }, heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 9, 39, 0.28)' },
  heroCopy: { padding: 15 }, heroBrand: { color: '#E0D5FF', fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  heroSubtitle: { color: '#FFFFFF', fontSize: 9, letterSpacing: 2, marginTop: 3 },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22D3C5', marginRight: 6 }, liveText: { color: '#45E5DC', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  card: { backgroundColor: 'rgba(16, 26, 49, 0.92)', borderWidth: 1, borderColor: '#273858', borderRadius: 18, padding: 20 },
  heading: { color: '#A78BFA', fontSize: 24, fontWeight: '800', textAlign: 'center' }, subheading: { color: '#A2ABC2', fontSize: 12, textAlign: 'center', marginTop: 5, marginBottom: 24 },
  label: { color: '#D5DCEF', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  input: { height: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.input, color: '#FFFFFF', paddingHorizontal: 14, fontSize: 13, marginBottom: 19 },
  passwordWrap: { position: 'relative' }, passwordInput: { paddingRight: 52 }, eyeButton: { position: 'absolute', right: 13, top: 0, height: 50, width: 30, alignItems: 'center', justifyContent: 'center' }, eyeIcon: { width: 21, height: 21, tintColor: '#A2ABC2' },
  optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -3, marginBottom: 22 }, rememberRow: { flexDirection: 'row', alignItems: 'center' }, checkbox: { width: 19, height: 19, borderWidth: 1.5, borderColor: '#52617F', borderRadius: 4, marginRight: 8, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: '#7544E8', borderColor: '#7544E8' }, checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' }, optionText: { color: '#A2ABC2', fontSize: 11 }, linkText: { color: '#22D3EE', fontSize: 11, fontWeight: '600' },
  message: { fontSize: 12, lineHeight: 18, marginBottom: 12 }, errorText: { color: '#FF8585' }, successText: { color: '#7ED9A5' },
  submitButton: { height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, disabledButton: { opacity: 0.65 }, submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 23, marginBottom: 16 }, divider: { flex: 1, height: 1, backgroundColor: '#303B57' }, dividerText: { color: '#7D89A5', fontSize: 9, letterSpacing: 1.5, marginHorizontal: 12 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 }, socialButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#18233D', alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 30, height: 30, resizeMode: 'contain' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25, marginBottom: 8 }, footerText: { color: '#929DB8', fontSize: 12 }, footerLink: { color: '#22D3EE', fontSize: 12, fontWeight: '800' },
});
