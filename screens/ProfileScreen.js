// screens/ProfileScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BRAND = {
  primary: '#0b486b',
  primaryDark: '#083a56',
  accent: '#11a7a7',
  text: '#0e1b25',
  muted: '#748a9d',
  surface: '#ffffff',
  bg: '#f3f7fb',
  danger: '#d9534f',
};

export default function ProfileScreen({ setIsLoggedIn }) {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    mobile: '',
    role: '',
    isVerify: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    const tryJSON = async key => {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    // Prefer a full user object if present
    const [userObj, profileObj] = await Promise.all([
      tryJSON('user'),
      tryJSON('profile'),
    ]);

    // Fallback to individual strings
    const [firstName, lastName, email, mobile, role, isVerify] =
      await Promise.all([
        AsyncStorage.getItem('firstName'),
        AsyncStorage.getItem('lastName'),
        AsyncStorage.getItem('email'),
        AsyncStorage.getItem('mobile'),
        AsyncStorage.getItem('role'),
        AsyncStorage.getItem('isVerify'),
      ]);

    const source = profileObj || userObj || {};
    const fullName =
      (firstName || source.firstName || '') +
      (lastName || source.lastName ? ` ${lastName || source.lastName}` : '');

    const merged = {
      name: fullName.trim() || source.name || 'Guest User',
      email: email || source.email || '',
      // Show clean mobile (strip + or +91 visually)
      mobile: ((mobile || source.mobile || '') + '')
        .replace(/^\+91/, '')
        .replace(/^\+/, ''),
      role: role || source.role || '',
      isVerify:
        typeof isVerify === 'string'
          ? isVerify === 'true'
          : typeof isVerify === 'boolean'
          ? isVerify
          : !!source.isVerify,
    };

    setProfile(merged);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  const onLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          // Clear at minimum the token; add more keys if desired
          await AsyncStorage.removeItem('token');
          setIsLoggedIn(false);
        },
      },
    ]);
  }, [setIsLoggedIn]);

  const initials =
    (profile.name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(s => (s && s[0] ? s[0].toUpperCase() : ''))
      .join('') || 'U';

  const prettyRole =
    (profile.role && profile.role[0].toUpperCase() + profile.role.slice(1)) ||
    '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.nameText}>{profile.name}</Text>

          <View style={styles.badgesRow}>
            <View style={styles.rolePill}>
              <Icon name="shield-account" size={16} />
              <Text style={styles.rolePillText}>{prettyRole}</Text>
            </View>

            <View
              style={[
                styles.verifyPill,
                profile.isVerify ? styles.verifyYes : styles.verifyNo,
              ]}
            >
              <Icon
                name={profile.isVerify ? 'check-decagram' : 'close-octagon'}
                size={16}
              />
              <Text style={styles.verifyText}>
                {profile.isVerify ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Row icon="email-outline" label="Email" value={profile.email || '—'} />
        <Divider />
        <Row
          icon="phone-outline"
          label="Mobile"
          value={profile.mobile || '—'}
        />
        <Divider />
        <Row icon="account-outline" label="Role" value={prettyRole} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Icon name="logout" size={20} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Icon name={icon} size={22} color={BRAND.primary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.surface,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#e7f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#d6eeee',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: BRAND.primary },
  nameText: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.text,
    marginBottom: 6,
  },

  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eef9f9',
    borderWidth: 1,
    borderColor: '#d6eeee',
    borderRadius: 999,
  },
  rolePillText: { fontSize: 13, fontWeight: '600', color: BRAND.primaryDark },

  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  verifyYes: { backgroundColor: '#ecfff1', borderColor: '#c8efcf' },
  verifyNo: { backgroundColor: '#fff3f3', borderColor: '#f2d4d2' },
  verifyText: { fontSize: 13, fontWeight: '600', color: BRAND.text },

  infoCard: {
    backgroundColor: BRAND.surface,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: BRAND.primary },
  rowValue: { maxWidth: '60%', fontSize: 15, color: BRAND.text },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8eef3',
    marginVertical: 4,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: '#f2d4d2',
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: { fontSize: 16, fontWeight: '800', color: BRAND.danger },
});
