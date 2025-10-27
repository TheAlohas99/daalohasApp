// src/components/GuestServices/ServicesDropdown.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  // Add ScrollView for better usability in a long list
  ScrollView, 
} from 'react-native';
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
    <View
      style={[
        styles.checkbox,
        checked && { borderColor: BRAND.primary, backgroundColor: '#e8f4ff' },
      ]}
    >
      {checked ? <Icon name="check" size={12} color={BRAND.primary} /> : null}
    </View>
  );
}

// Update Prop Type: value is now an array of { id: string, price: number }
export default function ServicesDropdown({
  value = [], // Expected format: [{ id: '...', price: 1000 }, ...]
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

  const isServiceActive = s => {
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
    return () => {
      mounted = false;
    };
  }, []);

  console.log('Available services:', services);
  console.log('Selected services (value):', value);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s =>
      (s?.name || s?.title || '').toLowerCase().includes(q),
    );
  }, [services, query]);

  // Map to hold default prices for services (used when selecting a service)
  const defaultPriceMap = useMemo(() => {
    const m = new Map();
    services.forEach(s => {
      if (!s?._id) return;
      const p = Number(s?.price ?? s?.amount ?? 0);
      m.set(s._id, isFinite(p) ? p : 0);
    });
    return m;
  }, [services]);

  // Check if a service ID is present in the new 'value' structure
  const isChecked = id => value.some(svc => svc.id === id);
  
  // Toggle service selection
  const toggleOne = id => {
    if (isChecked(id)) {
      // Remove service
      onChange(value.filter(v => v.id !== id));
    } else {
      // Add service with its default price
      const defaultPrice = defaultPriceMap.get(id) || 0;
      onChange([...value, { id, price: defaultPrice }]);
    }
  };

  // Handler to update the price of a selected service
  const updateServicePrice = (id, newPriceString) => {
    // Only allow digits and a single decimal point for price input
    const cleanPriceString = newPriceString.replace(/[^0-9.]/g, '');
    const newPrice = Number(cleanPriceString);

    onChange(
      value.map(svc => 
        svc.id === id 
          ? { ...svc, price: isNaN(newPrice) ? 0 : newPrice } // Update price
          : svc
      )
    );
  };
  
  // Get the current price of a selected service, or default to 0
  const getCurrentServicePrice = (id, defaultPrice) => {
      const selectedService = value.find(svc => svc.id === id);
      // Use the price from 'value' if selected, otherwise use the default price or 0
      return selectedService ? (selectedService.price || 0) : (defaultPrice || 0);
  };


  const allIds = useMemo(
    () => filtered.map(s => s?._id).filter(Boolean),
    [filtered],
  );
  
  // Check if all services on the page are selected
  const allOnPageSelected =
    allIds.length > 0 && allIds.every(id => isChecked(id));
    
  // Toggle select/unselect all services on the page
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      // Unselect all: remove filtered service IDs from value
      onChange(value.filter(v => !allIds.includes(v.id)));
    } else {
      // Select all: add all filtered services that aren't already selected
      const currentlySelectedIds = new Set(value.map(v => v.id));
      const newServices = filtered
        .filter(s => s?._id && !currentlySelectedIds.has(s._id))
        .map(s => ({ 
          id: s._id, 
          price: defaultPriceMap.get(s._id) || 0 
        }));
        
      onChange(Array.from(new Set([...value, ...newServices])));
    }
  };


  // Recalculate the total based on the prices in the 'value' array
  const servicesTotal = useMemo(
    () => value.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [value],
  );

  // Format number
  const fmt = n => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`;
  const selectedCount = value.length;

  return (
    <View style={{ marginTop: 14 }}>
      <SText style={styles.label}>{label}</SText>

      {/* Trigger (no chips) */}
      <Pressable
        onPress={() => setOpen(o => !o)}
        style={({ pressed }) => [
          styles.selectTrigger,
          pressed && { opacity: 0.9 },
        ]}
        hitSlop={6}
      >
        <SText
          style={[
            styles.triggerText,
            selectedCount > 0 && styles.triggerTextActive,
          ]}
        >
          {selectedCount > 0 ? `${selectedCount} selected` : 'Select services'}
        </SText>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={BRAND.muted}
        />
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
          <Pressable
            onPress={toggleSelectAll}
            style={({ pressed }) => [
              styles.rowItem,
              pressed && { backgroundColor: '#f7fbff' },
              { borderTopWidth: 0 }, // Remove border from Select All for better look
            ]}
          >
            <View style={styles.rowLeft}>
              <Checkbox checked={allOnPageSelected} />
              <SText style={styles.rowText}>
                {allOnPageSelected
                  ? 'Unselect all (shown)'
                  : 'Select all (shown)'}
              </SText>
            </View>
          </Pressable>

          {/* Items - Use ScrollView to contain a long list */}
          <ScrollView style={{ maxHeight: 240 }}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
                <SText
                  style={{
                    marginLeft: 8,
                    fontWeight: '700',
                    color: BRAND.muted,
                  }}
                >
                  Loading services…
                </SText>
              </View>
            ) : err ? (
              <SText style={{ color: BRAND.danger, fontWeight: '800' }}>
                {err}
              </SText>
            ) : filtered.length === 0 ? (
              <SText style={{ color: BRAND.muted, fontWeight: '700' }}>
                No services found
              </SText>
            ) : (
              filtered.map(svc => {
                const id = svc?._id;
                const label = svc?.name || svc?.title || 'Service';
                const defaultPrice = defaultPriceMap.get(id) || 0;
                const active = isChecked(id);
                // Get the currently selected price from 'value' if active
                const currentPrice = getCurrentServicePrice(id, defaultPrice); 

                return (
                  <Pressable
                    key={id}
                    // Only toggle selection when pressing the left side
                    onPress={() => toggleOne(id)}
                    style={({ pressed }) => [
                      styles.rowItem,
                      pressed && { backgroundColor: '#f7fbff' },
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <Checkbox checked={active} />
                      <SText style={styles.rowText} numberOfLines={1}>
                        {label}
                      </SText>
                    </View>
                    
                    {/* Editable Price Input - Only shown if active */}
                    {active ? (
                      <View style={styles.priceInputWrap}>
                        <SText style={styles.currencySymbolText}>
                          {currencySymbol}
                        </SText>
                        <TextInput
                          style={styles.priceInput}
                          value={String(currentPrice)}
                          onChangeText={text => updateServicePrice(id, text)}
                          placeholder="Price"
                          keyboardType="numeric"
                          // Prevent Pressable's onPress from firing when input is focused
                          onStartShouldSetResponder={() => true} 
                          // Highlight the input if it's not the default price
                          selectionColor={BRAND.primary} 
                        />
                      </View>
                    ) : (
                      // Display default price if not selected
                      <SText style={styles.priceText}>
                        {fmt(defaultPrice)}
                      </SText>
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Done */}
          <View style={styles.dropdownFooter}>
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.doneBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
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
          <SText style={[styles.totalLabel, styles.totalLabelStrong]}>
            Total Amount
          </SText>
          <SText style={[styles.totalValue, styles.totalValueStrong]}>
            {fmt(servicesTotal + (reservationPaidAmount || 0))}
          </SText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  label: {
    fontWeight: '800',
    color: BRAND.muted,
    marginTop: 8,
    marginBottom: 6,
  },

  selectTrigger: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: { color: '#9ab0bf', fontWeight: '700' },
  triggerTextActive: { color: BRAND.primaryDark },

  dropdownPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: BRAND.text, padding: 0 },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: BRAND.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    flexShrink: 1,
  },
  rowText: { color: BRAND.text, fontWeight: '800', flexShrink: 1 },
  priceText: { color: BRAND.primaryDark, fontWeight: '900', marginLeft: 8 },

  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  totalsWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: BRAND.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalRowStrong: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: BRAND.border,
    marginTop: 4,
  },
  totalLabel: { color: BRAND.muted, fontWeight: '800' },
  totalValue: { color: BRAND.text, fontWeight: '900' },
  totalLabelStrong: { color: BRAND.primaryDark },
  totalValueStrong: { color: BRAND.primaryDark, fontSize: 16 },

  dropdownFooter: { alignItems: 'flex-end', marginTop: 8 },
  doneBtn: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  doneBtnText: { color: '#fff', fontWeight: '900' },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  
  // New styles for editable price
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 8,
    // Add some margin to separate it visually from the checkbox side
    marginLeft: 10, 
    maxWidth: 100, // Limit the width for a clean look
  },
  currencySymbolText: {
    color: BRAND.muted,
    fontWeight: '800',
    fontSize: 12,
    marginRight: 2,
  },
  priceInput: {
    color: BRAND.primaryDark,
    fontWeight: '900',
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2, 
    paddingLeft: 0,
    paddingRight: 0,
    textAlign: 'right',
    flex: 1,
  },
});