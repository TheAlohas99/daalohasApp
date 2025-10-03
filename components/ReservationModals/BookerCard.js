import React from 'react';
import { View } from 'react-native';
import SText from '../SText';
import { s } from '../../styles/ReservationModalsDetailsStyle';

export default function BookerCard({
  name,
  pendingAmount,   
  phone,
  email,
  reference,
  status,
  currency,
  money,
  displayString,
}) {
  const isFullyPaid = pendingAmount != null && Number(pendingAmount) === 0;
  console.log(pendingAmount)
  console.log(isFullyPaid)

  return (
    <View style={s.card}>
      <SText style={s.cardHeader}>BOOKER</SText>
      <View style={s.bookerRow}>
        <View style={s.avatar}>
          <SText style={s.avatarLetters}>
            {String(name || 'G').trim().slice(0, 1).toUpperCase()}
          </SText>
        </View>
        <View style={{ flex: 1 }}>
          <SText style={s.bookerName}>{displayString(name)}</SText>

          {pendingAmount != null && (
            <View
              style={[
                s.badgeRow,
                isFullyPaid && { backgroundColor: '#e9f8f1' }, // soft green tint
              ]}
            >
              <SText
                style={[
                  s.badgeMuted,
                  isFullyPaid && { color: '#0b7a45' }, // green text for fully paid
                ]}
              >
                {isFullyPaid ? 'FULLY PAID' : 'LEFT TO PAY'}
              </SText>

              {!isFullyPaid && (
                <SText style={s.badgeValue}>
                  {'  '}
                  {money(pendingAmount, currency)}
                </SText>
              )}
            </View>
          )}
        </View>
      </View>

      {!!phone && <KV label="Phone" value={displayString(phone)} />}
      {!!email && <KV label="Email" value={displayString(email)} />}
      {!!reference && <KV label="Reference" value={displayString(reference)} />}
      {!!status && <KV label="Status" value={displayString(status)} />}
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
