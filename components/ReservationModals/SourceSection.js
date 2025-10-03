import React from 'react';
import { View } from 'react-native';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';
import { displayString } from '../../utils/display';

export default function SourceSection({ channel, createdAt, fmtTime }) {
  return (
    <View style={s.section}>
      <SText style={s.sectionTitle}>Source</SText>
      <SText style={s.sectionValue}>
        {displayString(channel) || '—'}
        {createdAt ? `  •  ${fmtTime(createdAt)}` : ''}
      </SText>
    </View>
  );
}
