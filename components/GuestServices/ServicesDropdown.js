// src/components/GuestServices/ServicesDropdown.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import SText from '../SText';

/* ===== Theme & API ===== */
const BRAND = {
  primary: '#0b86d0',
  primaryDark: '#0b486b',
  bg: '#f3f7fb',
  card: '#ffffff',
  text: '#17364a',
  muted: '#506070',
  border: '#e7eef3',
  danger: '#d64545',
};
const baseUrl = 'https://api.daalohas.com';
const SERVICES_URL = `${baseUrl}/api/v1/all-services`;

function Checkbox({ checked }) {
  return (
    <View style={[styles.checkbox, checked && { borderColor: BRAND.primary, backgroundColor: '#e8f4ff' }]}>
      {checked ? <Icon name="check" size={12} color={BRAND.primary} /> : null}
    </View>
  );
}


export default function ServicesDropdown({
  value = [],
  onChange = () => {},
  label = 'Guest Services',
  reservationPaidAmount = 0,
  currencySymbol = '₹',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [services, setServices] = useState([]);

  const isServiceActive = (s) => {
    if (s?.active === true) return true;
    if (s?.isActive === true) return true;
    const status = String(s?.status || '').toLowerCase();
    return status === 'active' || status === 'enabled' || status === 'live';
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const token = await AsyncStorage.getItem('token');
        const res = await axios.get(SERVICES_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        const raw = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.allServices)
          ? res.data.allServices
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
        const onlyActive = raw.filter(isServiceActive);
        if (mounted) setServices(onlyActive);
      } catch {
        if (mounted) setErr('Failed to load services');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => (s?.name || s?.title || '').toLowerCase().includes(q));
  }, [services, query]);

  const isChecked = (id) => value.includes(id);
  const toggleOne = (id) =>
    isChecked(id) ? onChange(value.filter((v) => v !== id)) : onChange([...value, id]);

  const allIds = useMemo(() => filtered.map((s) => s?._id).filter(Boolean), [filtered]);
  const allOnPageSelected = allIds.length > 0 && allIds.every((id) => value.includes(id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) onChange(value.filter((v) => !allIds.includes(v)));
    else onChange(Array.from(new Set([...value, ...allIds])));
  };

  // ---- Totals
  const priceMap = useMemo(() => {
    const m = new Map();
    services.forEach((s) => {
      if (!s?._id) return;
      const p = Number(s?.price ?? s?.amount ?? 0);
      m.set(s._id, isFinite(p) ? p : 0);
    });
    return m;
  }, [services]);

  const servicesTotal = useMemo(
    () => value.reduce((sum, id) => sum + (priceMap.get(id) || 0), 0),
    [value, priceMap]
  );

  const fmt = (n) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`;
  const selectedCount = value.length;

  return (
    <View style={{ marginTop: 14 }}>
      <SText style={styles.label}>{label}</SText>

      {/* Trigger (no chips) */}
      <Pressable onPress={() => setOpen((o) => !o)} style={({ pressed }) => [styles.selectTrigger, pressed && { opacity: 0.9 }]} hitSlop={6}>
        <SText style={[styles.triggerText, selectedCount > 0 && styles.triggerTextActive]}>
          {selectedCount > 0 ? `${selectedCount} selected` : 'Select services'}
        </SText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={BRAND.muted} />
      </Pressable>

      {open && (
        <View style={styles.dropdownPanel}>
          {/* Search */}
          <View style={styles.searchRow}>
            <Icon name="search" size={14} color={BRAND.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search services"
              placeholderTextColor="#9ab0bf"
              style={styles.searchInput}
            />
            {query ? (
              <Pressable hitSlop={6} onPress={() => setQuery('')}>
                <Icon name="times" size={14} color={BRAND.muted} />
              </Pressable>
            ) : null}
          </View>

          {/* Select all (shown) */}
          <Pressable onPress={toggleSelectAll} style={({ pressed }) => [styles.rowItem, pressed && { backgroundColor: '#f7fbff' }]}>
            <View style={styles.rowLeft}>
              <Checkbox checked={allOnPageSelected} />
              <SText style={styles.rowText}>
                {allOnPageSelected ? 'Unselect all (shown)' : 'Select all (shown)'}
              </SText>
            </View>
          </Pressable>

          {/* Items */}
          <View style={{ maxHeight: 240 }}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
                <SText style={{ marginLeft: 8, fontWeight: '700', color: BRAND.muted }}>Loading services…</SText>
              </View>
            ) : err ? (
              <SText style={{ color: BRAND.danger, fontWeight: '800' }}>{err}</SText>
            ) : filtered.length === 0 ? (
              <SText style={{ color: BRAND.muted, fontWeight: '700' }}>No services found</SText>
            ) : (
              filtered.map((svc) => {
                const id = svc?._id;
                const label = svc?.name || svc?.title || 'Service';
                const price = priceMap.get(id) || 0;
                const active = isChecked(id);
                return (
                  <Pressable key={id} onPress={() => toggleOne(id)} style={({ pressed }) => [styles.rowItem, pressed && { backgroundColor: '#f7fbff' }]}>
                    <View style={styles.rowLeft}>
                      <Checkbox checked={active} />
                      <SText style={styles.rowText} numberOfLines={1}>{label}</SText>
                    </View>
                    <SText style={styles.priceText}>{fmt(price)}</SText>
                  </Pressable>
                );
              })
            )}
          </View>

    

          {/* Done */}
          <View style={styles.dropdownFooter}>
            <Pressable onPress={() => setOpen(false)} style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.9 }]} >
              <SText style={styles.doneBtnText}>Done</SText>
            </Pressable>
          </View>
          
        </View>
      )}
            {/* Footer Totals */}
          <View style={styles.totalsWrap}>
            <View style={styles.totalRow}>
              <SText style={styles.totalLabel}>Services total</SText>
              <SText style={styles.totalValue}>{fmt(servicesTotal)}</SText>
            </View>
            <View style={styles.totalRow}>
              <SText style={styles.totalLabel}>Reservation paid</SText>
              <SText style={styles.totalValue}>{fmt(reservationPaidAmount)}</SText>
            </View>
            <View style={[styles.totalRow, styles.totalRowStrong]}>
              <SText style={[styles.totalLabel, styles.totalLabelStrong]}>Total Amount</SText>
              <SText style={[styles.totalValue, styles.totalValueStrong]}>
                {fmt(servicesTotal + (reservationPaidAmount || 0))}
              </SText>
            </View>
          </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '800', color: BRAND.muted, marginTop: 8, marginBottom: 6 },

  selectTrigger: {
    minHeight: 48, borderWidth: 1, borderColor: BRAND.border, borderRadius: 12, backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  triggerText: { color: '#9ab0bf', fontWeight: '700' },
  triggerTextActive: { color: BRAND.primaryDark },

  dropdownPanel: {
    marginTop: 8, borderWidth: 1, borderColor: BRAND.border, borderRadius: 12, backgroundColor: '#fff', padding: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', columnGap: 8, borderWidth: 1, borderColor: BRAND.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 6, backgroundColor: '#fff', marginBottom: 8,
  },
  searchInput: { flex: 1, color: BRAND.text, padding: 0 },

  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: BRAND.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', columnGap: 10, flexShrink: 1 },
  rowText: { color: BRAND.text, fontWeight: '800', flexShrink: 1 },
  priceText: { color: BRAND.primaryDark, fontWeight: '900', marginLeft: 8 },

  loadingWrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },

  totalsWrap: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: BRAND.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalRowStrong: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: BRAND.border, marginTop: 4 },
  totalLabel: { color: BRAND.muted, fontWeight: '800' },
  totalValue: { color: BRAND.text, fontWeight: '900' },
  totalLabelStrong: { color: BRAND.primaryDark },
  totalValueStrong: { color: BRAND.primaryDark, fontSize: 16 },

  dropdownFooter: { alignItems: 'flex-end', marginTop: 8 },
  doneBtn: { backgroundColor: BRAND.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  doneBtnText: { color: '#fff', fontWeight: '900' },

  checkbox: { width: 18, height: 18, borderWidth: 1.5, borderColor: BRAND.border, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
