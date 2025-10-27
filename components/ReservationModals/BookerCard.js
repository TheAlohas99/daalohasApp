import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { fetchReservationById, selectReservationObj } from '../../redux/slice/ReservationSlice';
import { useDispatch, useSelector } from 'react-redux';

export default function BookerCard({
  reservationId,
  name,
  pendingAmount,
  paidAmount,
  paymentStatus,
  phone,
  email,
  reference,
  status,
  currency,
  money,
  displayString,
  onWhatsappPress,
}) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const reservation = useSelector(s => selectReservationObj(s, reservationId));
  console.log(reservation);
  const safeName = displayString(reservation?.booker_first_name || name);
  const safePhone = displayString(reservation?.booker_mobile || phone);
  const safeEmail = displayString(reservation?.booker_email || email);


  const goToUpdate = () => {
    navigation.navigate('UpdateBooker', {
      reservationId: reservationId || null,
      initial: { name: safeName, phone: safePhone, email: safeEmail },
    });
  };

  useEffect(() => {
    if (reservationId) dispatch(fetchReservationById({ reservationId }));
  }, [dispatch, reservationId]);

  return (
    <View style={s.card}>
      <SText style={s.cardHeader}>BOOKER</SText>

      <View style={s.bookerRow}>
        <View style={s.avatar}>
          <SText style={s.avatarLetters}>
            {String(safeName || 'G')
              .trim()
              .slice(0, 1)
              .toUpperCase()}
          </SText>
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Name is clickable -> goes to update screen */}
            <Pressable
              onPress={goToUpdate}
              hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <SText style={s.bookerName}>{safeName}</SText>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Edit button -> also goes to update screen */}
              <Pressable
                onPress={goToUpdate}
                hitSlop={8}
                style={({ pressed }) => ({
                  backgroundColor: '#0b86d0',
                  padding: 8,
                  borderRadius: 50,
                  marginLeft: 10,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Icon name="edit" size={20} color="#fff" />
              </Pressable>

              {/* WhatsApp */}
              <Pressable
                onPress={onWhatsappPress}
                disabled={!safePhone}
                hitSlop={8}
                style={({ pressed }) => ({
                  backgroundColor: safePhone ? '#25D366' : '#a5d6a7',
                  padding: 8,
                  borderRadius: 50,
                  marginLeft: 10,
                  opacity: pressed || !safePhone ? 0.7 : 1,
                })}
              >
                <Icon name="whatsapp" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Contact Info */}
      {!!reference && (
        <KV label="Reservation ID" value={displayString(reference)} />
      )}

      {pendingAmount !== null && pendingAmount !== undefined && (
        <KV label="Pending Amount" value={money(pendingAmount, currency)} />
      )}

      {paidAmount !== null && paidAmount !== undefined && (
        <KV label="Paid Amount" value={money(paidAmount, currency)} />
      )}

      {!!safePhone && <KV label="Phone" value={safePhone} />}
      {!!safeEmail && <KV label="Email" value={safeEmail} />}

      {paymentStatus && (
        <KV label="Payment Status" value={displayString(paymentStatus)} />
      )}
      {status && <KV label="Status" value={displayString(status)} />}
    </View>
  );
}

function KV({ label, value }) {
  return (
    <View style={s.row}>
      <SText style={s.rowLabel}>{label}</SText>
      <SText style={s.rowValue}>{value}</SText>
    </View>
  );
}
