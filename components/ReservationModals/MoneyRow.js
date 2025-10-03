import React from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';
import { money } from '../../utils/reservationModals';

export default function MoneyRow({ total, avg, currency }) {
  return (
    <View style={s.moneyRow}>
      <View style={s.moneyCol}>
        <View style={s.inlineRow}>
          <SText style={s.moneyBigGreen}>{money(total, currency)}</SText>
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
  );
}
