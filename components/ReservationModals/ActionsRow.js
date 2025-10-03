import React from 'react';
import { Pressable, View, Text, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { s } from '../../styles/ReservationModalsDetailsStyle';

export default function ActionsRow({ onCheckIn, onCheckout, checkingOut }) {
  return (
    <View style={s.actionRow}>
      {/* Check-In Button */}
      <Pressable
        android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
        style={({ pressed }) => [s.actionBtn, s.checkInBtn, pressed && s.actionBtnPressed]}
        onPress={onCheckIn}
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

      {/* Check-Out Button */}
      <Pressable
        android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
        style={({ pressed }) => [
          s.actionBtn,
          s.checkOutBtn,
          pressed && s.actionBtnPressed,
          checkingOut && { opacity: 0.75 },
        ]}
        onPress={onCheckout}
        disabled={checkingOut}
        pointerEvents={checkingOut ? 'none' : 'auto'}
      >
        <View style={[s.actionIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          {checkingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="logout-variant" size={18} color="#fff" />
          )}
        </View>
        <View style={s.actionTextWrap}>
          <Text style={s.actionTitle}>Check-Out</Text>
          <Text style={s.actionSubtitle}>Mark departure</Text>
        </View>
        <Icon name="arrow-right" size={18} color="#ffffffcc" />
      </Pressable>
    </View>
  );
}
