import React, { useEffect, useCallback, useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  Platform,
  ScrollView,
  Alert,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import ReservationNotes from './Reservation/ReservationNotes';
import HeaderBar from './ReservationModals/HeaderBar';
import KPIRow from './ReservationModals/KPIRow';
import CheckPanel from './ReservationModals/CheckPanel';
import MoneyRow from './ReservationModals/MoneyRow';
import SourceSection from './ReservationModals/SourceSection';
import BookerCard from './ReservationModals/BookerCard';
import ActionsRow from './ReservationModals/ActionsRow';
import { s } from '../styles/ReservationModalsDetailsStyle';

import {
  pick,
  diffNights,
  fmtTime,
  money,
  num,
} from '../utils/reservationModals';
import { displayString } from '../utils/display';
import {
  fetchReservationById,
  selectReservationObj,
} from '../redux/slice/ReservationSlice';

export default function ReservationDetailsModal({
  visible,
  isVisible,
  open,
  onClose,
  onRequestClose,
  reservationId,
  onCheckoutSuccess,
  reloadReservation,
  onCheckInPress,
}) {
  // ✅ Always initialize isOpen consistently
  const isOpen =
    typeof visible === 'boolean'
      ? visible
      : typeof isVisible === 'boolean'
      ? isVisible
      : typeof open === 'boolean'
      ? open
      : false;

  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [checkingOut, setCheckingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Always call hooks unconditionally
  const reservation = useSelector(state =>
    reservationId ? selectReservationObj(state, reservationId) : null
  );
  // console.log(reservation)

  // ✅ Fetch reservation safely (no conditional hook execution)
  useEffect(() => {
    if (isOpen && reservationId) {
      setLoading(true);
      dispatch(fetchReservationById({ reservationId }))
        .unwrap()
        .catch(err => console.warn('Reservation fetch failed:', err))
        .finally(() => setLoading(false));
    }
  }, [dispatch, isOpen, reservationId]);

  // ✅ Handle Android back press only when modal open
  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
    if (typeof onRequestClose === 'function') onRequestClose();
  }, [onClose, onRequestClose]);

  const onScroll = e => {
    setScrolled((e?.nativeEvent?.contentOffset?.y ?? 0) > 2);
  };

  // ✅ Safely compute derived fields
  const ci = reservation ? pick.checkIn(reservation) : null;
  const co = reservation ? pick.checkOut(reservation) : null;
  const nights = diffNights(ci, co);
  const currency = reservation ? pick.currency(reservation) : '';
  const pendingAmount = reservation ? num(pick.PendingAmount(reservation)) : 0;
  const paymentStatus = reservation ? pick.paymentStatus(reservation) : '';
  const paidAmount = reservation ? num(pick.paidAmount(reservation)) : 0;
  const total = reservation ? num(pick.totalAmount(reservation)) : 0;
  const avg = total && nights > 0 ? total / nights : null;

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
        }
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
      ]
    );
  }, [doCheckout]);

  const handleCheckInPress = useCallback(() => {
    if (typeof onCheckInPress === 'function') {
      onCheckInPress(reservationId);
    }
  }, [onCheckInPress, reservationId]);

  const handleNotesSaved = useCallback(
    async savedText => {
      if (typeof reloadReservation === 'function' && reservationId) {
        try {
          await reloadReservation(reservationId);
        } catch {}
      }
      Alert.alert('Saved', 'Notes updated successfully.');
    },
    [reloadReservation, reservationId]
  );

  // ✅ Unified loading condition (prevents conditional hook mismatch)
  const isLoading = loading || !reservation;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={s.backdrop} pointerEvents="box-none">
        <Pressable style={s.backdropPress} onPress={handleClose} />

        <View
          style={[
            s.sheet,
            {
              paddingBottom:
                Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12,
              paddingTop: insets.top ? 0 : 0,
            },
          ]}
        >
          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color="#0b486b" />
            </View>
          ) : (
            <>
              <HeaderBar
                insetsTop={insets.top}
                scrolled={scrolled}
                title={displayString(pick.title(reservation) || 'Reservation')}
                subtitle={displayString(pick.subtitle(reservation))}
                onClose={handleClose}
              />

              <ScrollView
                style={s.scroll}
                contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'on-drag' : 'none'
                }
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <KPIRow nights={nights} guests={pick.guests(reservation)} />
                <CheckPanel ci={ci} co={co} />
                <MoneyRow total={total} avg={avg} currency={currency} />

                {(pick.channel(reservation) || pick.createdAt(reservation)) && (
                  <SourceSection
                    channel={pick.channel(reservation)}
                    createdAt={pick.createdAt(reservation)}
                    fmtTime={fmtTime}
                  />
                )}

                <BookerCard
                  reservationId={reservationId}
                  name={pick.bookerName(reservation)}
                  pendingAmount={pendingAmount}
                  paidAmount={paidAmount}
                  paymentStatus={paymentStatus}
                  phone={pick.phone(reservation)}
                  email={pick.email(reservation)}
                  reference={pick.reference(reservation)}
                  status={pick.status(reservation)}
                  money={money}
                  displayString={displayString}
                  onWhatsappPress={() =>
                    navigation.navigate('MessageTemplate', {
                      phone: pick.phone(reservation),
                      reservation,
                    })
                  }
                />

                <ReservationNotes
                  reservationId={reservationId}
                  initialNotes={
                    typeof reservation?.notes === 'string'
                      ? reservation.notes
                      : ''
                  }
                  onSaved={handleNotesSaved}
                />

                <ActionsRow
                  onCheckIn={handleCheckInPress}
                  onCheckout={handleCheckoutPress}
                  checkingOut={checkingOut}
                />
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
