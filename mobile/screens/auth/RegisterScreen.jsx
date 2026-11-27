import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Image, ImageBackground, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  register, checkRegistrationStatus, savePendingRegistration,
  getPendingRegistration, clearPendingRegistration,
} from '../../services/authService';

const CHECK_INTERVAL_SECONDS = 10;
const COLORS = { bg: '#080D1B', panel: '#101A31', input: '#080D1B', border: '#46516F', muted: '#A2ABC2', cyan: '#22D3EE' };

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPendingRegistration().then((saved) => {
      if (!mounted || !saved) return;
      setPending(saved);
      setEmail(saved.email || '');
      setPhone(saved.phone || '');
      setSecondsLeft(Math.max(0, Math.ceil((saved.nextCheckAt - Date.now()) / 1000)));
      setMessage('Your account is awaiting Super Admin approval.');
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!pending) return undefined;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((pending.nextCheckAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [pending]);

  const beginPending = async (pendingEmail, pendingPhone) => {
    const next = { email: pendingEmail.trim(), phone: pendingPhone.trim(), nextCheckAt: Date.now() + CHECK_INTERVAL_SECONDS * 1000 };
    await savePendingRegistration(next);
    setPending(next);
    setSecondsLeft(CHECK_INTERVAL_SECONDS);
    setIsError(false);
    setMessage('Your account is awaiting Super Admin approval.');
  };

  const handleRegister = async () => {
    if (pending) return;
    if (!name.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setIsError(true); setMessage('All fields are required.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setIsError(true); setMessage('Please enter a valid email address.'); return;
    }
    if (password.length < 8) {
      setIsError(true); setMessage('Password must be at least 8 characters.'); return;
    }
    if (password !== confirmPassword) {
      setIsError(true); setMessage('Password and Confirm Password do not match.'); return;
    }
    if (!agree) {
      setIsError(true); setMessage('Please agree to the Terms of Service and Privacy Policy.'); return;
    }

    try {
      setLoading(true); setMessage(''); setIsError(false);
      await register({ name, email, phone, password });
      await beginPending(email, phone);
      setPassword(''); setConfirmPassword('');
    } catch (error) {
      if (error.code === 'REGISTRATION_PENDING') {
        await beginPending(email, phone);
        return;
      }
      setIsError(true);
      setMessage(error.code === 'REGISTRATION_REJECTED'
        ? 'Sorry, your registration has been rejected by the LYNORA Super Admin.'
        : error.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleCheckStatus = async () => {
    if (!pending || secondsLeft > 0 || checking) return;
    try {
      setChecking(true); setMessage(''); setIsError(false);
      const result = await checkRegistrationStatus(pending.email, pending.phone);
      if (result.status === 'approved') {
        await clearPendingRegistration();
        setPending(null);
        setMessage('Your account has been approved. Please sign in.');
        Alert.alert('Account Approved', 'Your account has been approved. You can now log in.', [
          { text: 'Go to Login', onPress: () => navigation.replace('Login', { email: pending.email }) },
        ]);
        return;
      }
      if (result.status === 'rejected') {
        await clearPendingRegistration();
        setPending(null);
        setIsError(true);
        setMessage('Sorry, your registration has been rejected by the LYNORA Super Admin.');
        return;
      }
      if (result.status === 'not_found') {
        setIsError(true); setMessage(result.message || 'Registration could not be found.'); return;
      }
      await beginPending(pending.email, pending.phone);
    } catch (error) {
      setIsError(true); setMessage(error.message || 'Unable to check registration status.');
      // Keep the same cooldown behavior as the Web registration flow.
      await beginPending(pending.email, pending.phone);
    } finally { setChecking(false); }
  };

  const showSocialNotice = (provider) => Alert.alert('Coming Soon', `${provider} registration is not enabled on the LYNORA backend yet.`);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#211044" />
      <LinearGradient colors={['#211044', '#10152D', '#080D1B']} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <Text style={styles.join}>JOIN</Text>
          <Text style={styles.logo}>LYNORA</Text>
          <Text style={styles.description}>Experience every moment. Create your account to access exclusive live events, front-row drops, and global stages.</Text>
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
          <Text style={styles.heading}>Start Your Journey</Text>
          <Text style={styles.subheading}>Tell us who you are in the ecosystem.</Text>

          <Text style={styles.label}>NAME</Text>
          <TextInput style={styles.input} placeholder="Your name" placeholderTextColor="#69738E" value={name} onChangeText={setName} autoCapitalize="words" maxLength={100} editable={!pending} />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput style={styles.input} placeholder="Your email" placeholderTextColor="#69738E" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={150} editable={!pending} />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordWrap}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="••••••••••••" placeholderTextColor="#69738E" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!pending} />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <Image source={require('../../assets/icons/eye.png')} style={styles.eyeIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={styles.passwordWrap}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="••••••••••••" placeholderTextColor="#69738E" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} editable={!pending} />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword((v) => !v)} accessibilityRole="button" accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
              <Image source={require('../../assets/icons/eye.png')} style={styles.eyeIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput style={styles.input} placeholder="+62 6xx xxx xxx" placeholderTextColor="#69738E" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} editable={!pending} />

          <TouchableOpacity style={styles.termsRow} onPress={() => setAgree((v) => !v)} disabled={Boolean(pending)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>{agree ? <Text style={styles.checkmark}>✓</Text> : null}</View>
            <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink} onPress={() => Alert.alert('Terms of Service', 'Please refer to the LYNORA website for the terms of service.')}>Terms of Service</Text> and <Text style={styles.termsLink} onPress={() => Alert.alert('Privacy Policy', 'Please refer to the LYNORA website for the privacy policy.')}>Privacy Policy</Text>.</Text>
          </TouchableOpacity>

          {message ? <Text style={[styles.message, isError ? styles.errorText : styles.successText]}>{message}</Text> : null}

          {pending ? (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingTitle}>AWAITING APPROVAL</Text>
              <Text style={styles.pendingDescription}>Your account is awaiting Super Admin approval. Check your approval status again in {secondsLeft}s.</Text>
              <TouchableOpacity style={[styles.checkButton, (secondsLeft > 0 || checking) && styles.checkButtonDisabled]} onPress={handleCheckStatus} disabled={secondsLeft > 0 || checking}>
                {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{secondsLeft > 0 ? `CHECK STATUS (${secondsLeft}s)` : 'CHECK STATUS'}</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={['#9636E8', '#5637F2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submitButton, loading && styles.disabledButton]}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>CREATE ACCOUNT</Text>}
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>OR CONTINUE</Text><View style={styles.divider} /></View>
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} onPress={() => showSocialNotice('Google')}><Image source={require('../../assets/icons/google.png')} style={styles.socialIcon} /></TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => showSocialNotice('Facebook')}><Image source={require('../../assets/icons/facebook.png')} style={styles.socialIcon} /></TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => showSocialNotice('Apple')}><Image source={require('../../assets/icons/apple.png')} style={styles.socialIcon} /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}><Text style={styles.footerText}>Already have an account? </Text><TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.footerLink}>Login</Text></TouchableOpacity></View>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 34 },
  brandBlock: { marginBottom: 18 }, join: { color: '#FFFFFF', fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: 0.4 },
  logo: { color: '#718CFF', fontSize: 33, lineHeight: 39, fontWeight: '900', letterSpacing: -0.8 },
  description: { color: '#A2ABC2', fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 460 },
  hero: { height: 118, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 22, borderWidth: 1, borderColor: '#8B5CF6' }, heroImage: { borderRadius: 14 }, heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 9, 39, 0.28)' },
  heroCopy: { padding: 15 }, heroBrand: { color: '#E0D5FF', fontSize: 17, fontWeight: '900', letterSpacing: 2 }, heroSubtitle: { color: '#FFFFFF', fontSize: 9, letterSpacing: 2, marginTop: 3 },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22D3C5', marginRight: 6 }, liveText: { color: '#45E5DC', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  card: { backgroundColor: 'rgba(16, 26, 49, 0.92)', borderWidth: 1, borderColor: '#273858', borderRadius: 18, padding: 20 },
  heading: { color: '#A78BFA', fontSize: 23, fontWeight: '800' }, subheading: { color: '#A2ABC2', fontSize: 12, marginTop: 5, marginBottom: 22 },
  label: { color: '#D5DCEF', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 3 },
  input: { height: 49, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.input, color: '#FFFFFF', paddingHorizontal: 14, fontSize: 13, marginBottom: 17 },
  passwordWrap: { position: 'relative' }, passwordInput: { paddingRight: 52 }, eyeButton: { position: 'absolute', right: 13, top: 0, height: 49, width: 30, alignItems: 'center', justifyContent: 'center' }, eyeIcon: { width: 21, height: 21, tintColor: '#A2ABC2' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 1, marginBottom: 17 }, checkbox: { width: 19, height: 19, borderWidth: 1.5, borderColor: '#52617F', borderRadius: 4, marginRight: 9, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: '#7544E8', borderColor: '#7544E8' }, checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' }, termsText: { flex: 1, color: '#A2ABC2', fontSize: 11, lineHeight: 17 }, termsLink: { color: '#A78BFA', textDecorationLine: 'underline' },
  message: { fontSize: 12, lineHeight: 18, marginBottom: 12 }, errorText: { color: '#FF8585' }, successText: { color: '#7ED9A5' },
  submitButton: { height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, disabledButton: { opacity: 0.65 }, submitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  pendingBox: { backgroundColor: '#111A30', borderWidth: 1, borderColor: '#46516F', borderRadius: 10, padding: 13 }, pendingTitle: { color: '#F5C76A', fontSize: 12, fontWeight: '900', letterSpacing: 0.8, marginBottom: 7 }, pendingDescription: { color: '#B9C4DA', fontSize: 11, lineHeight: 17, marginBottom: 12 }, checkButton: { minHeight: 43, borderRadius: 8, backgroundColor: '#7544E8', alignItems: 'center', justifyContent: 'center' }, checkButtonDisabled: { backgroundColor: '#46516F' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 23, marginBottom: 16 }, divider: { flex: 1, height: 1, backgroundColor: '#303B57' }, dividerText: { color: '#7D89A5', fontSize: 9, letterSpacing: 1.5, marginHorizontal: 12 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 }, socialButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#18233D', alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 30, height: 30, resizeMode: 'contain' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25, marginBottom: 8 }, footerText: { color: '#929DB8', fontSize: 12 }, footerLink: { color: '#22D3EE', fontSize: 12, fontWeight: '800' },
});
