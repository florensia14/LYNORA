import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, UserRound } from 'lucide-react-native';
import { refreshNotifications, subscribeToNotificationChanges } from '../utils/notificationStorage';
import { getStoredProfile, subscribeToProfile } from '../services/profileStore';
import { API_BASE_URL } from '../services/api';

const COLORS = { card: '#171E32', border: '#2A324A', white: '#FFFFFF', alert: '#FF5685', cyan: '#22D3EE' };

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
function resolvePhoto(value) {
  if (!value || typeof value !== 'string') return null;
  const uri = value.trim();
  const host = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(uri)) return `${host}${uri.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '')}`;
  if (/^https?:\/\//i.test(uri)) return uri;
  return `${host}/${uri.replace(/^\/+/, '')}`;
}

export default function HeaderActions({ navigation, style }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([refreshNotifications(), getStoredProfile()])
      .then(([notifications, user]) => {
        if (!active) return;
        setUnreadCount(notifications.filter((item) => item.unread).length);
        setProfile(user);
      })
      .catch((error) => console.warn('[LYNORA Header] Refresh failed:', error?.message || error));
    return () => { active = false; };
  }, []));

  useEffect(() => subscribeToNotificationChanges((items) => {
    setUnreadCount(items.filter((item) => item.unread).length);
  }), []);
  useEffect(() => subscribeToProfile(setProfile), []);

  const photo = resolvePhoto(profile?.profile_photo || profile?.avatar_url || profile?.avatar);
  const nameInitials = initials(profile?.name);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity accessibilityLabel={`Buka notifikasi, ${unreadCount} belum dibaca`} style={styles.button}
        onPress={() => navigation.navigate('Notifications')} activeOpacity={0.75}>
        <Bell size={17} color={COLORS.white}/>
        {unreadCount > 0 && <View style={styles.dot}/>}
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Buka profil" style={[styles.profileButton, !photo && styles.profileFallback]}
        onPress={() => navigation.navigate('Profile')} activeOpacity={0.75}>
        {photo ? <Image source={{ uri: photo }} style={styles.profileImage}/> :
          nameInitials ? <Text style={styles.initials}>{nameInitials}</Text> :
          <UserRound size={18} color={COLORS.white}/>}
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  button: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  profileButton: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.cyan, backgroundColor: '#29234A', alignItems: 'center', justifyContent: 'center' },
  profileFallback: { backgroundColor: '#5140A0' },
  profileImage: { width: '100%', height: '100%' },
  initials: { color: COLORS.white, fontSize: 11, fontWeight: '900' },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, top: 5, right: 6, backgroundColor: COLORS.alert },
});
