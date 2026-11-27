import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, UserRound } from 'lucide-react-native';
import {
  loadNotifications,
  subscribeToNotificationChanges,
} from '../utils/notificationStorage';

const COLORS = {
  card: '#171E32',
  border: '#2A324A',
  white: '#FFFFFF',
  alert: '#FF5685',
};

export default function HeaderActions({ navigation, style }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadNotifications()
        .then((notifications) => {
          if (active) {
            setUnreadCount(
              notifications.filter((notification) => notification.unread).length,
            );
          }
        })
        .catch((error) => {
          console.error('Notifikasi gagal dimuat di header:', error);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(
    () =>
      subscribeToNotificationChanges((notifications) => {
        setUnreadCount(
          notifications.filter((notification) => notification.unread).length,
        );
      }),
    [],
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        accessibilityLabel={`Buka notifikasi, ${unreadCount} belum dibaca`}
        style={styles.button}
        onPress={() => navigation.navigate('Notifications')}
        activeOpacity={0.75}
      >
        <Bell size={17} color={COLORS.white} />
        {unreadCount > 0 && <View style={styles.notificationDot} />}
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityLabel="Buka profil"
        style={styles.button}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.75}
      >
        <UserRound size={18} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    top: 5,
    right: 6,
    backgroundColor: COLORS.alert,
  },
});
