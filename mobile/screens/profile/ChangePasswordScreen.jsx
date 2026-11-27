
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react-native';
import HeaderActions from '../../components/HeaderActions';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Perhatian', 'Semua kolom harus diisi.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Perhatian', 'Password baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Perhatian', 'Konfirmasi password tidak cocok.');
      return;
    }

    Alert.alert(
      'Validasi berhasil',
      'Password baru memenuhi persyaratan. Sinkronisasi perubahan akan digunakan saat endpoint password tersedia.'
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#FFFFFF" size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Change Password</Text>
        <HeaderActions navigation={navigation} />
      </View>

      <View style={styles.iconContainer}>
        <Lock color="#B9A0FF" size={34} />
      </View>

      <Text style={styles.title}>Update Your Password</Text>

      <Text style={styles.description}>
        Buat password baru untuk menjaga keamanan akun LYNORA kamu.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan password lama"
            placeholderTextColor="#78839E"
            secureTextEntry={!showCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
            {showCurrent
              ? <EyeOff color="#8995B0" size={20} />
              : <Eye color="#8995B0" size={20} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan password baru"
            placeholderTextColor="#78839E"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            {showNew
              ? <EyeOff color="#8995B0" size={20} />
              : <Eye color="#8995B0" size={20} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ulangi password baru"
            placeholderTextColor="#78839E"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            {showConfirm
              ? <EyeOff color="#8995B0" size={20} />
              : <Eye color="#8995B0" size={20} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.helper}>
          Gunakan minimal 8 karakter untuk password baru.
        </Text>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleChangePassword}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Update Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080D1C',
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 45,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#171F35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#211D3B',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    color: '#8995B0',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 35,
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 18,
  },
  inputContainer: {
    height: 54,
    borderRadius: 13,
    backgroundColor: '#151D32',
    borderWidth: 1,
    borderColor: '#29334D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  helper: {
    color: '#8995B0',
    fontSize: 11,
    marginTop: 12,
  },
  saveButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#9B7BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 17,
  },
  cancelText: {
    color: '#8995B0',
    fontSize: 13,
  },
});
