import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';

export default function HeaderBar({
  insetsTop = 0,
  scrolled = false,
  title,
  subtitle,
  idx = 0,
  total = 0,
  onClose,
  onPrev,
  onNext,
}) {
  return (
    <View
      style={[
        s.headerWrap,
        {
          paddingTop: Math.max(insetsTop * 0.35, 4),
          shadowOpacity: scrolled ? 0.08 : 0,
          elevation: scrolled ? 3 : 0,
        },
      ]}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.headerBtn}>
          <Icon name="arrow-left" size={22} color="#0b486b" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          {!!subtitle && (
            <SText style={s.headerSub} numberOfLines={1}>
              {subtitle}
            </SText>
          )}
          <SText style={s.headerTitle} numberOfLines={2}>
            {title}
          </SText>
        </View>

        {total > 1 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={onPrev} style={{ padding: 6 }}>
              <Icon name="chevron-left" size={22} color="#17364a" />
            </TouchableOpacity>
            <SText style={{ fontWeight: '800', color: '#17364a' }}>
              {idx + 1}/{total}
            </SText>
            <TouchableOpacity onPress={onNext} style={{ padding: 6 }}>
              <Icon name="chevron-right" size={22} color="#17364a" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
    </View>
  );
}
