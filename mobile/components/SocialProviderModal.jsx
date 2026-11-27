import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';

export default function SocialProviderModal({
  provider,
  onCancel,
  onContinue,
}) {
  return (
    <Modal
      visible={Boolean(provider)}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Lanjutkan dengan {provider}</Text>
          <Text style={styles.description}>
            Login {provider} belum terhubung. Lanjutkan hanya sebagai demo
            lokal; tidak ada akun {provider} yang diakses.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
            >
              <Text style={styles.secondaryText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onContinue}
            >
              <Text style={styles.primaryText}>Lanjut Demo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  card: {
    backgroundColor: '#111A30',
    borderWidth: 1,
    borderColor: '#27314B',
    borderRadius: 16,
    padding: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: '#A2ABC2',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
  },
  primaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7544E8',
    borderRadius: 9,
    paddingHorizontal: 14,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18233D',
    borderRadius: 9,
    paddingHorizontal: 14,
  },
  secondaryText: {
    color: '#D5DCEF',
    fontSize: 11,
    fontWeight: '700',
  },
});
