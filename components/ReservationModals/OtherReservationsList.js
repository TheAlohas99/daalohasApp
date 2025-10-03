import React from 'react';
import { View } from 'react-native';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';

export default function OtherReservationsList({
  reservations = [],
  activeIndex = 0,
  diffNights,
  pick,
  fmtDate,
  money,
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <SText style={s.sectionTitle}>Other reservations this night</SText>
      {reservations.map((rr, i) => {
        if (i === activeIndex) return null;
        const n = diffNights(pick.checkIn(rr), pick.checkOut(rr));
        return (
          <View key={`other-${i}`} style={s.smallCard}>
            <SText style={s.otherTitle}>
              {String(pick.bookerName(rr) || '').trim()}
              {pick.reference(rr) ? ` • ${String(pick.reference(rr)).trim()}` : ''}
            </SText>
            <SText style={s.otherSub}>
              {fmtDate(pick.checkIn(rr))} → {fmtDate(pick.checkOut(rr))} • {n} night{n === 1 ? '' : 's'}
            </SText>
            <SText style={s.otherMoney}>
              {money(pick.totalAmount(rr), pick.currency(rr))}
            </SText>
          </View>
        );
      })}
    </View>
  );
}
