import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';
import { fmtDate } from '../../utils/reservationModals';

export default function CheckPanel({ ci, co }) {
  return (
    <View style={s.checkPanel}>
      <View style={s.checkCol}>
        <View style={s.inlineRow}>
          <SText style={s.checkLabel}>CHECKED IN</SText>
          <Icon name="check" size={14} color="#cde9fb" style={{ marginLeft: 6 }} />
        </View>
        <SText style={s.checkDate}>{fmtDate(ci)}</SText>
      </View>

      <View style={s.checkDivider}>
        <Text style={{ color: '#fff' }}>·····</Text>
      </View>

      <View style={s.checkCol}>
        <View style={s.inlineRow}>
          <SText style={s.checkLabel}>CHECKED OUT</SText>
          <Icon name="check" size={14} color="#cde9fb" style={{ marginLeft: 6 }} />
        </View>
        <SText style={s.checkDate}>{fmtDate(co)}</SText>
      </View>
    </View>
  );
}
