// src/components/ReservationDetailsModal.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import SText from '../components/SText';
import { displayString } from '../utils/display';
import { addDays } from '../utils/date';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseUrl = 'https://api.daalohas.com';

const diffNights = (start, end) => {
  if (!start || !end) return 0;
  const a = addDays(start, 0);
  const b = addDays(end, 0);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
};
const fmtDate = d => {
  if (!d) return '—';
  try {
    const x = new Date(d);
    return x.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(d ?? '');
  }
};
const fmtTime = d => {
  if (!d) return '';
  try {
    const x = new Date(d);
    const dd = String(x.getDate()).padStart(2, '0');
    const mon = x.toLocaleString(undefined, { month: 'short' });
    const hh = String(x.getHours()).padStart(2, '0');
    const mm = String(x.getMinutes()).padStart(2, '0');
    return `${dd} ${mon} • ${hh}:${mm}`;
  } catch {
    return String(d ?? '');
  }
};
const num = v => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object') {
    if (v.$numberDouble) return Number(v.$numberDouble);
    if (v.$numberInt) return Number(v.$numberInt);
  }
  return null;
};
const money = (value, currencyGuess = 'INR') => {
  const n = num(value);
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyGuess,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹ ${Number(n).toFixed(2)}`;
  }
};

/* NEW: safe integer parser used by guests() */
const toInt = v => {
  if (v == null) return 0;
  if (typeof v === 'object') {
    if (v.$numberInt != null) v = v.$numberInt;
    if (v.$numberDouble != null) v = v.$numberDouble;
  }
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
};

const pick = {
  title: r =>
    r?.property_title ||
    r?.property?.title ||
    r?.property?.name ||
    r?.listing_title ||
    r?.title ||
    '',
  subtitle: r =>
    r?.unit_name ||
    r?.room_name ||
    r?.apartment ||
    r?.property?.internal_name ||
    r?.property?.id ||
    '',
  checkIn: r =>
    r?.check_in_date || r?.checkin_date || r?.checkInDate || r?.start_date,
  checkOut: r =>
    r?.check_out_date || r?.checkout_date || r?.checkOutDate || r?.end_date,

  /* UPDATED: robust guests calculation */
  guests: r => {
    const direct = toInt(
      r?.guests_count ?? r?.no_of_guests ?? r?.num_guests ?? r?.total_guests,
    );
    if (direct > 0) return direct;

    const adults = toInt(r?.adults ?? r?.adult_count ?? r?.adults_count);

    const childKeys = [
      'children',
      'children_count',
      'kids',
      'kids_count',
      'children05',
      'children0_5',
      'children_0_5',
      'children_05',
      'children612',
      'children6_12',
      'children_6_12',
      'infants',
      'infant_count',
      'babies',
      'baby_count',
    ];
    const children = childKeys.reduce((sum, k) => sum + toInt(r?.[k]), 0);

    const derived = adults + children;
    if (derived > 0) return derived;

    const pax = toInt(r?.pax);
    if (pax > 0) return pax;

    const arrLen = Array.isArray(r?.guests) ? r.guests.length : 0;
    return arrLen || 1;
  },

  totalAmount: r =>
    r?.total_amount ||
    r?.amount_total ||
    r?.grand_total ||
    r?.amount ||
    r?.base_amount ||
    r?.price_total ||
    null,
  currency: r =>
    r?.currency ||
    r?.currency_code ||
    r?.pricing_currency ||
    r?.rate_currency ||
    'INR',
  channel: r =>
    r?.channel || r?.channel_name || r?.source || r?.portal || r?.origin || '',
  createdAt: r =>
    r?.created_at ||
    r?.createdAt ||
    r?.booked_at ||
    r?.timestamp ||
    r?.booking_time,
  bookerName: r =>
    r?.booker_first_name ||
    r?.guest_name ||
    r?.guestName ||
    r?.guest?.name ||
    r?.primary_guest_name ||
    r?.name ||
    'Guest',
  phone: r =>
    r?.booker_mobile || r?.guest_phone || r?.guest?.phone || r?.contact || '',
  email: r => r?.booker_email || r?.guest_email || r?.guest?.email || '',
  paid: r =>
    r?.amount_paid ||
    r?.amount_paid ||
    r?.paid_amount ||
    r?.payments_total ||
    0,
  reference: r =>
    r?._id || r?.id || r?.reservation_id || r?.booking_id || r?.reference || '',
  status: r => r?.reservation_status || r?.status || r?.booking_status || '',
};

export default function ReservationDetailsModal({
  visible,
  isVisible,
  open,
  onClose,
  onRequestClose,
  reservations = [],
  onCheckoutSuccess, // optional callback(data) after checkout
}) {
  const isOpen =
    typeof visible === 'boolean'
      ? visible
      : typeof isVisible === 'boolean'
      ? isVisible
      : typeof open === 'boolean'
      ? open
      : false;

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [reservations?.length]);
  const navigation = useNavigation();

  const r = (Array.isArray(reservations) ? reservations : [])[idx] || {};

  const ci = pick.checkIn(r);
  const co = pick.checkOut(r);
  const nights = diffNights(ci, co);
  const currency = pick.currency(r);
  const total = num(pick.totalAmount(r));
  const avg = total != null && nights > 0 ? total / nights : null;
  const leftToPay =
    total != null ? Math.max(0, total - (num(pick.paid(r)) ?? 0)) : null;

  const close = () => {
    if (typeof onClose === 'function') onClose();
    if (typeof onRequestClose === 'function') onRequestClose();
  };

  // ---------- Check-Out API wiring (axios + token + withCredentials) ----------
  const [checkingOut, setCheckingOut] = useState(false);
  const reservationId = displayString(pick.reference(r));
  const CHECKOUT_URL = `${baseUrl}/api/v1/checkout`;

  const doCheckout = async () => {
    if (!reservationId) {
      Alert.alert('Missing ID', 'Reservation ID not found.');
      return;
    }
    setCheckingOut(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No token found, please log in again');
      }

      const { data } = await axios.put(
        CHECKOUT_URL,
        { reservationId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!data?.success) {
        throw new Error(data?.message || 'Checkout failed');
      }

      Alert.alert('Success', 'Guest(s) checked out.');
      if (typeof onCheckoutSuccess === 'function') {
        onCheckoutSuccess(data.data);
      }
      // Optionally close the modal:
      // close();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCheckoutPress = () => {
    Alert.alert(
      'Confirm Check-Out',
      'This will mark all guests on this reservation as checked out now. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Check-Out', onPress: doCheckout },
      ],
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={s.backdrop} onPress={close}>
        {/* Sheet */}
        <Pressable
          onPress={() => {}}
          style={[s.sheet, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}
        >
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={close} style={s.headerBtn}>
              <Icon name="arrow-left" size={22} color="#0b486b" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              {!!pick.subtitle(r) && (
                <SText style={s.headerSub} numberOfLines={1}>
                  {displayString(pick.subtitle(r))}
                </SText>
              )}
              <SText style={s.headerTitle} numberOfLines={2}>
                {displayString(pick.title(r) || 'Reservation')}
              </SText>
            </View>

            {/* Pager */}
            {reservations.length > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() =>
                    setIdx(
                      p => (p - 1 + reservations.length) % reservations.length,
                    )
                  }
                  style={{ padding: 6 }}
                >
                  <Icon name="chevron-left" size={22} color="#17364a" />
                </TouchableOpacity>
                <SText style={{ fontWeight: '800', color: '#17364a' }}>
                  {idx + 1}/{reservations.length}
                </SText>
                <TouchableOpacity
                  onPress={() => setIdx(p => (p + 1) % reservations.length)}
                  style={{ padding: 6 }}
                >
                  <Icon name="chevron-right" size={22} color="#17364a" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Nights & guests */}
            <View style={s.kpiRow}>
              <View style={s.kpiItem}>
                <Icon name="weather-night" size={18} color="#0b486b" />
                <SText style={s.kpiText}>
                  {nights} night{nights === 1 ? '' : 's'}
                </SText>
              </View>
              <View style={s.kpiItem}>
                <Icon name="account" size={18} color="#0b486b" />
                <SText style={s.kpiText}>
                  {pick.guests(r)} person{pick.guests(r) === 1 ? '' :'s'}
                </SText>
              </View>
            </View>

            {/* Check-in / Check-out panel */}
            <View style={s.checkPanel}>
              <View style={s.checkCol}>
                <View style={s.inlineRow}>
                  <SText style={s.checkLabel}>CHECKED IN</SText>
                  <Icon
                    name="check"
                    size={14}
                    color="#cde9fb"
                    style={{ marginLeft: 6 }}
                  />
                </View>
                <SText style={s.checkDate}>{fmtDate(ci)}</SText>
              </View>

              <View style={s.checkDivider}>
                <Text style={{ color: '#fff' }}>·····</Text>
              </View>

              <View style={s.checkCol}>
                <View style={s.inlineRow}>
                  <SText style={s.checkLabel}>CHECKED OUT</SText>
                  <Icon
                    name="check"
                    size={14}
                    color="#cde9fb"
                    style={{ marginLeft: 6 }}
                  />
                </View>
                <SText style={s.checkDate}>{fmtDate(co)}</SText>
              </View>
            </View>

            {/* Money row */}
            <View style={s.moneyRow}>
              <View style={s.moneyCol}>
                <View style={s.inlineRow}>
                  <SText style={s.moneyBigGreen}>
                    {money(total, currency)}
                  </SText>
                  <Icon
                    name="check-decagram-outline"
                    size={16}
                    color="#19a464"
                    style={{ marginLeft: 6, marginTop: 2 }}
                  />
                </View>
                <SText style={s.moneyCaption}>Accommodation cost</SText>
              </View>

              <View style={s.moneyCol}>
                <SText style={s.moneyBig}>{money(avg, currency)}</SText>
                <SText style={s.moneyCaption}>Average price per night</SText>
              </View>
            </View>

            {/* Source / timestamp */}
            {(pick.channel(r) || pick.createdAt(r)) && (
              <View style={s.section}>
                <SText style={s.sectionTitle}>Source</SText>
                <SText style={s.sectionValue}>
                  {displayString(pick.channel(r)) || '—'}
                  {pick.createdAt(r)
                    ? `  •  ${fmtTime(pick.createdAt(r))}`
                    : ''}
                </SText>
              </View>
            )}

            {/* Booker */}
            <View style={s.card}>
              <SText style={s.cardHeader}>BOOKER</SText>
              <View style={s.bookerRow}>
                <View style={s.avatar}>
                  <SText style={s.avatarLetters}>
                    {String(pick.bookerName(r) || 'G')
                      .trim()
                      .slice(0, 1)
                      .toUpperCase()}
                  </SText>
                </View>
                <View style={{ flex: 1 }}>
                  <SText style={s.bookerName}>
                    {displayString(pick.bookerName(r))}
                  </SText>

                  {leftToPay != null && (
                    <View style={s.badgeRow}>
                      <SText style={s.badgeMuted}>LEFT TO PAY</SText>
                      <SText style={s.badgeValue}>
                        {'  '}
                        {money(leftToPay, currency)}
                      </SText>
                    </View>
                  )}
                </View>
              </View>

              {pick.phone(r) ? (
                <View style={s.row}>
                  <SText style={s.rowLabel}>Phone</SText>
                  <SText style={s.rowValue}>
                    {displayString(pick.phone(r))}
                  </SText>
                </View>
              ) : null}

              {pick.email(r) ? (
                <View style={s.row}>
                  <SText style={s.rowLabel}>Email</SText>
                  <SText style={s.rowValue}>
                    {displayString(pick.email(r))}
                  </SText>
                </View>
              ) : null}

              {pick.reference(r) ? (
                <View style={s.row}>
                  <SText style={s.rowLabel}>Reference</SText>
                  <SText style={s.rowValue}>
                    {displayString(pick.reference(r))}
                  </SText>
                </View>
              ) : null}

              {pick.status(r) ? (
                <View style={s.row}>
                  <SText style={s.rowLabel}>Status</SText>
                  <SText style={s.rowValue}>
                    {displayString(pick.status(r))}
                  </SText>
                </View>
              ) : null}
            </View>

            {/* Better Action Buttons */}
            <View style={s.actionRow}>
              <Pressable
                android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                style={({ pressed }) => [
                  s.actionBtn,
                  s.checkInBtn,
                  pressed && s.actionBtnPressed,
                ]}
                onPress={() =>
                  navigation.navigate('GuestScreen', {
                    reservationId: pick.reference(r),
                  })
                }
              >
                <View style={[s.actionIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                  <Icon name="login-variant" size={18} color="#fff" />
                </View>
                <View style={s.actionTextWrap}>
                  <Text style={s.actionTitle}>Check-In</Text>
                  <Text style={s.actionSubtitle}>Mark arrival</Text>
                </View>
                <Icon name="arrow-right" size={18} color="#ffffffcc" />
              </Pressable>

              <Pressable
                android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                style={({ pressed }) => [
                  s.actionBtn,
                  s.checkOutBtn,
                  pressed && s.actionBtnPressed,
                  checkingOut && { opacity: 0.75 },
                ]}
                onPress={handleCheckoutPress}
                disabled={checkingOut}
              >
                <View style={[s.actionIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                  {checkingOut ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Icon name="logout-variant" size={18} color="#fff" />
                  )}
                </View>
                <View style={s.actionTextWrap}>
                  <Text style={s.actionTitle}>Check-Out</Text>
                </View>
              </Pressable>
            </View>

            {/* Other reservations */}
            {reservations.length > 1 && (
              <View style={{ marginTop: 12 }}>
                <SText style={s.sectionTitle}>
                  Other reservations this night
                </SText>
                {reservations.map((rr, i) => {
                  if (i === idx) return null;
                  const n = diffNights(pick.checkIn(rr), pick.checkOut(rr));
                  return (
                    <View key={`other-${i}`} style={s.smallCard}>
                      <SText style={s.otherTitle}>
                        {displayString(pick.bookerName(rr))}
                        {pick.reference(rr)
                          ? ` • ${displayString(pick.reference(rr))}`
                          : ''}
                      </SText>
                      <SText style={s.otherSub}>
                        {fmtDate(pick.checkIn(rr))} → {fmtDate(pick.checkOut(rr))} • {n} night
                        {n === 1 ? '' : 's'}
                      </SText>
                      <SText style={s.otherMoney}>
                        {money(pick.totalAmount(rr), pick.currency(rr))}
                      </SText>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    height: '90%',
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 15,
  },

  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  headerBtn: { padding: 8, marginRight: 4 },
  headerSub: { color: '#6a7b88', fontWeight: '700', marginLeft: 4 },
  headerTitle: {
    color: '#0b486b',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
  },

  kpiRow: {
    flexDirection: 'row',
    columnGap: 16,
    marginTop: 4,
    marginBottom: 12,
    justifyContent: 'center',
  },
  kpiItem: { flexDirection: 'row', alignItems: 'center' },
  kpiText: { color: '#1a2e3b', fontWeight: '800' },

  checkPanel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#0b86d0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkCol: { flex: 1, padding: 12 },
  checkDivider: {
    width: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center' },
  checkLabel: { color: '#cde9fb', fontWeight: '800', marginBottom: 2 },
  checkDate: { color: '#fff', fontWeight: '900', fontSize: 18 },

  moneyRow: { flexDirection: 'row', marginTop: 14, columnGap: 16 },
  moneyCol: { flex: 1, paddingVertical: 8 },
  moneyBigGreen: { color: '#19a464', fontWeight: '900', fontSize: 20 },
  moneyBig: { color: '#0b486b', fontWeight: '900', fontSize: 20 },
  moneyCaption: { color: '#6a7b88', marginTop: 2, fontWeight: '700' },

  section: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#f6fbff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e7eef3',
  },
  sectionTitle: { color: '#506070', fontWeight: '900', marginBottom: 6 },
  sectionValue: { color: '#17364a', fontWeight: '700' },

  card: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e7eef3',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafcfe',
  },
  cardHeader: { color: '#6a7b88', fontWeight: '800', marginBottom: 8 },
  bookerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d8eefc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarLetters: { color: '#0b486b', fontWeight: '900' },
  bookerName: { color: '#0b486b', fontWeight: '900', fontSize: 16 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    backgroundColor: '#eef6ff',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeMuted: { color: '#4b5a67', fontWeight: '900' },
  badgeValue: { color: '#0b486b', fontWeight: '900' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#e7eef3',
  },
  rowLabel: { color: '#506070', fontWeight: '800' },
  rowValue: { color: '#17364a', fontWeight: '800' },

  smallCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fcff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e7eef3',
  },
  otherTitle: { color: '#0b486b', fontWeight: '900' },
  otherSub: { color: '#5a6a77', fontWeight: '700', marginTop: 2 },
  otherMoney: { color: '#0b486b', fontWeight: '900', marginTop: 4 },

  /* ---------- New button styles ---------- */
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    columnGap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actionBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  checkInBtn: { backgroundColor: '#19a464' },
  checkOutBtn: { backgroundColor: '#e74c3c' },
  actionIcon: {
    width: 25,
    height: 25,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextWrap: { flex: 1 },
  actionTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    includeFontPadding: false,
  },
  actionSubtitle: {
    color: '#ffffffcc',
    fontWeight: '700',
    fontSize: 10,
    marginTop: 2,
    includeFontPadding: false,
  },
});
