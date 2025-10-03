// src/components/Reservation/ReservationNotes.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const baseUrl = 'https://api.daalohas.com';
const DEBOUNCE_MS =2000; // save 1s after user stops typing

export default function ReservationNotes({
  reservationId,
  initialNotes = '',
  onSaved,
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('idle');

  const timerRef = useRef(null);
  const lastSavedRef = useRef(initialNotes || '');

  useEffect(() => {
    setNotes(initialNotes || '');
    lastSavedRef.current = initialNotes || '';
  }, [initialNotes]);

  useEffect(() => {
    if (!reservationId || notes === lastSavedRef.current) return;
    setStatus('editing');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleSave(true), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, reservationId]);

  const handleSave = async (silent = false) => {
    if (!reservationId) return;
    if (notes === lastSavedRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      setSaving(true);
      setStatus('saving');

      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token found, please log in again');

      const payload = { notes: typeof notes === 'string' ? notes.trim() : notes };

      const { data } = await axios.put(
        `${baseUrl}/api/v1/reservations/${encodeURIComponent(reservationId)}`,
        payload, // ✅ send plain payload
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true, // ✅ if your API sets cookies
        }
      );

      if (!data?.success) throw new Error(data?.message || 'Failed to update notes');

      lastSavedRef.current = payload.notes;
      setStatus('saved');
      onSaved?.(data.data);
      setTimeout(() => setStatus('idle'), 1200);
    } catch (e) {
      setStatus('error');
      if (!silent) {
        console.warn(
          'Notes save error',
          e?.response?.status,
          e?.response?.data || e?.message
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.inputWrap}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Type notes here..."
          multiline
          textAlignVertical="top"
          style={s.input}
          maxLength={2000}
          editable={!saving}
          onBlur={() => handleSave(true)}
        />

        <TouchableOpacity
          onPress={() => handleSave(false)}
          disabled={saving || notes === lastSavedRef.current}
          style={[s.iconBtn, (saving || notes === lastSavedRef.current) && { opacity: 0.7 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {saving ? (
            <ActivityIndicator />
          ) : status === 'saved' ? (
            <Icon name="check" size={20} color="#19a464" />
          ) : status === 'error' ? (
            <Icon name="alert-circle-outline" size={20} color="#e74c3c" />
          ) : (
            <Icon name="pencil" size={20} color="#0b486b" />
          )}
        </TouchableOpacity>
      </View>

      <View style={s.footerRow}>
        <Text style={s.counter}>{`${notes?.length || 0}/2000`}</Text>
        {status === 'saving' && <Text style={s.statusText}>Saving…</Text>}
        {status === 'saved' && <Text style={[s.statusText, { color: '#19a464' }]}>Saved</Text>}
        {status === 'error' && <Text style={[s.statusText, { color: '#e74c3c' }]}>Save failed</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 5 },
  inputWrap: { position: 'relative' },
  input: {
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7e4ec',
    borderRadius: 10,
    padding: 12,
    paddingRight: 44,
    color: '#17364a',
    backgroundColor: '#fbfdff',
  },
  iconBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f3fb',
  },
  footerRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  counter: { color: '#6a7b88', fontWeight: '700' },
  statusText: { color: '#6a7b88', fontWeight: '700' },
});
