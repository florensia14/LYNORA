
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
import { ArrowLeft, Camera } from 'lucide-react-native';
import { saveProfile } from '../../services/profileService';
import HeaderActions from '../../components/HeaderActions';

export default function EditProfileScreen({ navigation }) {
  const [name, setName] = useState('Kanaya Amira');
  const [username, setUsername] = useState('kanayaamira');
  const [email, setEmail] = useState('kanaya@email.com');
  const [phone, setPhone] = useState('081234567890');
  const [photoColor, setPhotoColor] = useState('#34245F');

  const choosePhoto = () => {
    Alert.alert('Pilih Foto Profil', 'Pilih warna avatar profil.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ungu Gelap', onPress: () => setPhotoColor('#34245F') },
      { text: 'Biru Gelap', onPress: () => setPhotoColor('#26314B') },
      { text: 'Ungu', onPress: () => setPhotoColor('#922EFF') },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Perhatian', 'Nama, email, dan nomor telepon wajib diisi.');
      return;
    }

    try {
      await saveProfile({ name: name.trim(), username: username.trim(), email: email.trim(), phone: phone.trim() });
      Alert.alert('Berhasil', 'Perubahan profil berhasil disimpan.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Gagal', 'Perubahan profil tidak dapat disimpan.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#FFFFFF" size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>
        <HeaderActions navigation={navigation} />
      </View>

      {/* PHOTO */}
      <View style={styles.photoSection}>
        <View style={[styles.avatar, { backgroundColor: photoColor }]}>
          <Text style={styles.avatarText}>
            {name.trim() ? name.trim().charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={choosePhoto}
        >
          <Camera color="#FFFFFF" size={17} />
        </TouchableOpacity>

        <Text style={styles.photoName}>{name || 'Nama Pengguna'}</Text>
        <Text style={styles.photoUsername}>@{username}</Text>
      </View>

      {/* FORM */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Masukkan nama lengkap"
          placeholderTextColor="#78839E"
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Masukkan username"
          placeholderTextColor="#78839E"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Masukkan email"
          placeholderTextColor="#78839E"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Masukkan nomor telepon"
          placeholderTextColor="#78839E"
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>Save Changes</Text>
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
    marginBottom: 35,
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 35,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#493B78',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#B9A0FF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: 'bold',
  },
  cameraButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#9B7BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    marginLeft: 75,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#080D1C',
  },
  photoName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  photoUsername: {
    color: '#8995B0',
    fontSize: 12,
    marginTop: 5,
  },
  form: {
    marginTop: 5,
  },
  sectionTitle: {
    color: '#B9A0FF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 19,
    marginBottom: 9,
  },
  input: {
    height: 53,
    backgroundColor: '#151D32',
    borderWidth: 1,
    borderColor: '#29334D',
    borderRadius: 13,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontSize: 13,
  },
  saveButton: {
    height: 54,
    backgroundColor: '#9B7BFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveText: {
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
