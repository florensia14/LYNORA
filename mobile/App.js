import React, { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppNavigation from './navigation/AppNavigation';

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const autofillStyle = document.createElement('style');
    autofillStyle.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px #0A1227 inset !important;
        -webkit-text-fill-color: #FFFFFF !important;
        caret-color: #FFFFFF;
      }
    `;
    document.head.appendChild(autofillStyle);
    return () => document.head.removeChild(autofillStyle);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0B1122" translucent={false} />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B1122' }} edges={['top']}>
        <AppNavigation />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
