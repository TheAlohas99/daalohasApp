// src/components/ReservationDetailsModal.js
import React, { useEffect, useCallback, useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler,
  Text,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReservationNotes from './Reservation/ReservationNotes';
import HeaderBar from './ReservationModals/HeaderBar';
import KPIRow from './ReservationModals/KPIRow';
import CheckPanel from './ReservationModals/CheckPanel';
import MoneyRow from './ReservationModals/MoneyRow';
import SourceSection from './ReservationModals/SourceSection';
import BookerCard from './ReservationModals/BookerCard';
import ActionsRow from './ReservationModals/ActionsRow';
import OtherReservationsList from './ReservationModals/OtherReservationsList';

import { s } from '../styles/ReservationModalsDetailsStyle';
import {
  pick,
  diffNights,
  fmtDate,
  fmtTime,
  money,
  num,
} from '../utils/reservationModals';
import { displayString } from '../utils/display';
import { useNavigation } from '@react-navigation/native';

export default function ReservationDetailsModal({
  visible,
  isVisible,
  open,
  onClose,
  onRequestClose,
  reservations = [],
  onCheckoutSuccess,
  reloadReservation,
  initialReservationId,
  onCheckInPress,
  navigation,
}) {
  const isOpen =
    typeof visible === 'boolean'
      ? visible
      : typeof isVisible === 'boolean'
      ? isVisible
      : typeof open === 'boolean'
      ? open
      : false;

  const navigateToWhatsapp = useNavigation();
  const insets = useSafeAreaInsets();
  const [resList, setResList] = useState(
    Array.isArray(reservations) ? reservations : [],
  );
  useEffect(() => {
    setResList(Array.isArray(reservations) ? reservations : []);
  }, [reservations]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [resList?.length]);

  useEffect(() => {
    if (!initialReservationId || !Array.isArray(resList)) return;
    const i = resList.findIndex(
      r =>
        displayString(pick.reference(r)) ===
        displayString(initialReservationId),
    );
    if (i >= 0) setIdx(i);
  }, [initialReservationId, resList]);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
    if (typeof onRequestClose === 'function') onRequestClose();
  }, [onClose, onRequestClose]);

  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, handleClose]);

  const r = (Array.isArray(resList) ? resList : [])[idx] || {};
  const ci = pick.checkIn(r);
  const co = pick.checkOut(r);
  const nights = diffNights(ci, co);
  const currency = pick.currency(r);
  const pendingAmount = num(pick.PendingAmount(r));
  const total = num(pick.totalAmount(r));
  const avg = total != null && nights > 0 ? total / nights : null;

  const [checkingOut, setCheckingOut] = useState(false);
  const reservationId = displayString(pick.reference(r));
  const CHECKOUT_URL = `https://api.daalohas.com/api/v1/checkout`;

  const doCheckout = useCallback(async () => {
    if (!reservationId) {
      Alert.alert('Missing ID', 'Reservation ID not found.');
      return;
    }
    setCheckingOut(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token found, please log in again');

      const { data } = await axios.put(
        CHECKOUT_URL,
        { reservationId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      );

      if (!data?.success) throw new Error(data?.message || 'Checkout failed');
      Alert.alert('Success', 'Guest(s) checked out.');
      if (typeof onCheckoutSuccess === 'function') onCheckoutSuccess(data.data);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setCheckingOut(false);
    }
  }, [CHECKOUT_URL, onCheckoutSuccess, reservationId]);

  const handleCheckoutPress = useCallback(() => {
    Alert.alert(
      'Confirm Check-Out',
      'This will mark all guests on this reservation as checked out now. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Check-Out', onPress: doCheckout },
      ],
    );
  }, [doCheckout]);

  const handleCheckInPress = useCallback(() => {
    if (typeof onCheckInPress === 'function') {
      const rid = pick.reference(r);
      onCheckInPress(rid);
    }
  }, [onCheckInPress, r]);

  const [scrolled, setScrolled] = useState(false);
  const onScroll = e =>
    setScrolled((e?.nativeEvent?.contentOffset?.y ?? 0) > 2);

  const handleNotesSaved = useCallback(
    async savedText => {
      if (typeof savedText === 'string') {
        setResList(list => {
          const next = [...list];
          if (next[idx]) next[idx] = { ...next[idx], notes: savedText };
          return next;
        });
      }
      if (typeof reloadReservation === 'function' && reservationId) {
        try {
          const fresh = await reloadReservation(reservationId);
          if (fresh) {
            setResList(list => {
              const next = [...list];
              if (next[idx]) next[idx] = fresh;
              return next;
            });
          }
        } catch {}
      }
      Alert.alert('Saved', 'Notes updated successfully.');
    },
    [idx, reloadReservation, reservationId],
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={handleClose}>
        <View
          style={[
            s.sheet,
            {
              paddingBottom:
                Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12,
            },
          ]}
        >
          <HeaderBar
            insetsTop={insets.top}
            scrolled={scrolled}
            title={displayString(pick.title(r) || 'Reservation')}
            subtitle={displayString(pick.subtitle(r))}
            idx={idx}
            total={resList.length}
            onClose={handleClose}
            onPrev={() =>
              setIdx(p => (p - 1 + resList.length) % resList.length)
            }
            onNext={() => setIdx(p => (p + 1) % resList.length)}
          />

          <ScrollView
            style={s.scroll}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <KPIRow nights={nights} guests={pick.guests(r)} />
            <CheckPanel ci={ci} co={co} />
            <MoneyRow total={total} avg={avg} currency={currency} />

            {(pick.channel(r) || pick.createdAt(r)) && (
              <SourceSection
                channel={pick.channel(r)}
                createdAt={pick.createdAt(r)}
                fmtTime={fmtTime}
              />
            )}

            <BookerCard
              name={pick.bookerName(r)}
              pendingAmount={pendingAmount}
              phone={pick.phone(r)}
              email={pick.email(r)}
              reference={pick.reference(r)}
              status={pick.status(r)}
              money={money}
              displayString={displayString}
            />

            <ReservationNotes
              reservationId={reservationId}
              initialNotes={typeof r?.notes === 'string' ? r.notes : ''}
              onSaved={handleNotesSaved}
            />

            <ActionsRow
              onCheckIn={handleCheckInPress}
              onCheckout={handleCheckoutPress}
              checkingOut={checkingOut}
            />

            {/* ✅ WhatsApp Button */}
            <Pressable
              onPress={() =>
                navigateToWhatsapp.navigate('MessageTemplate', {
                  phone: pick.phone(r),
                  reservation: r,
                })
              }
              style={{
                backgroundColor: '#25D366',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                Send via WhatsApp
              </Text>
            </Pressable>

            {resList.length > 1 && (
              <OtherReservationsList
                reservations={resList}
                activeIndex={idx}
                diffNights={diffNights}
                pick={pick}
                fmtDate={fmtDate}
                money={money}
              />
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
