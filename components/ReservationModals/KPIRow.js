import React from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';

export default function KPIRow({ nights = 0, guests = 1 }) {
  return (
    <View style={s.kpiRow}>
      <View style={s.kpiItem}>
        <Icon name="weather-night" size={18} color="#0b486b" />
        <SText style={s.kpiText}>
          {nights}nights
        </SText>
      </View>
      <View style={s.kpiItem}>
        <Icon name="account" size={18} color="#0b486b" />
        <SText style={s.kpiText}>
          {guests}persons
        </SText>
      </View>
    </View>
  );
}

// {nights === 1 ? '' : 's'}
// {guests === 1 ? '' : 's'}
