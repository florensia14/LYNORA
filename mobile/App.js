
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import AppNavigation from './navigation/AppNavigation';

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }

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

    return () => {
      document.head.removeChild(autofillStyle);
    };
  }, []);

  return <AppNavigation />;
}
