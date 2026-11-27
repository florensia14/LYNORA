import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MainTab from './MainTab';

import NotificationScreen from '../screens/notification/NotificationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';

import ConcertDetailScreen from '../screens/explore/ConcertDetailScreen';
import CheckoutScreen from '../screens/booking/CheckoutScreen';
import TicketDetailScreen from '../screens/ticket/TicketDetailScreen';
import TransactionDetailScreen from '../screens/history/TransactionDetailScreen';

import {
  getMe,
  getMeFromStorage,
  logout,
  NAVIGATION_STATE_KEY,
} from '../services/authService';
import { getAuthToken } from '../services/api';

const Stack = createNativeStackNavigator();
const LOGIN_STATE = {
  index: 0,
  routes: [{ name: 'Login' }],
};

export default function AppNavigation() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState(undefined);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const token = await getAuthToken();

        if (!token) {
          await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
          if (mounted) setInitialState(LOGIN_STATE);
          return;
        }

        // Validate the saved JWT with the backend before restoring the app.
        try {
          await getMe();
        } catch (error) {
          if (error?.status === 401 || error?.status === 403) {
            await logout();
            if (mounted) setInitialState(LOGIN_STATE);
            return;
          }

          // If the backend is temporarily unreachable, keep the cached session.
          // This avoids forcing a valid user to log in again during a network outage.
          const cachedUser = await getMeFromStorage();
          if (!cachedUser || cachedUser.role !== 'customer') {
            await logout();
            if (mounted) setInitialState(LOGIN_STATE);
            return;
          }
        }

        const savedState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        let restoredState;

        if (savedState) {
          try {
            const parsed = JSON.parse(savedState);
            const routeNames = Array.isArray(parsed?.routes)
              ? parsed.routes.map((route) => route?.name)
              : [];
            // Never restore an auth screen for a user who still has a session.
            if (routeNames.length && !routeNames.includes('Login') && !routeNames.includes('Register')) {
              restoredState = parsed;
            }
          } catch {
            await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
          }
        }

        if (mounted) {
          setInitialState(restoredState || {
            index: 0,
            routes: [{ name: 'MainTab' }],
          });
        }
      } catch (error) {
        console.warn('[LYNORA Auth] Failed to restore session:', error?.message || error);
        if (mounted) setInitialState(LOGIN_STATE);
      } finally {
        if (mounted) setIsReady(true);
      }
    };

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const persistNavigationState = useCallback(async (state) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const routes = Array.isArray(state?.routes) ? state.routes : [];
      const containsAuthScreen = routes.some(
        (route) => route?.name === 'Login' || route?.name === 'Register',
      );
      if (containsAuthScreen) return;

      await AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[LYNORA Navigation] Could not save last screen:', error?.message || error);
    }
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080D1B' }}>
        <StatusBar barStyle="light-content" backgroundColor="#080D1B" />
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={persistNavigationState}
    >
      <Stack.Navigator
        initialRouteName={initialState?.routes?.[initialState.index || 0]?.name || 'Login'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTab" component={MainTab} />

        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />

        <Stack.Screen name="ConcertDetail" component={ConcertDetailScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
        <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
