// src/components/Reservation/ReservationNotes.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  fetchReservationById,
  updateReservationNotes,
  selectReservationNotes,
  selectReservationFetching,
  selectReservationSaving,
  selectReservationFetchError,
  selectReservationSaveError,
} from '../../redux/slice/ReservationSlice';

const DEBOUNCE_MS = 2000; // save 2s after user stops typing

export default function ReservationNotes({
  reservationId,
  initialNotes = '',
  onSaved,
}) {
  const dispatch = useDispatch();

  // Authoritative notes + flags from store
  const serverNotes = useSelector(
    (s) => selectReservationNotes(s, reservationId),
    shallowEqual
  );
  const fetching = useSelector((s) => selectReservationFetching(s, reservationId));
  const saving = useSelector((s) => selectReservationSaving(s, reservationId));
  const fetchError = useSelector((s) => selectReservationFetchError(s, reservationId));
  const saveError = useSelector((s) => selectReservationSaveError(s, reservationId));
  // console.log(fetching)

  // Local edit state
  const [notes, setNotes] = useState(initialNotes || '');
  const [status, setStatus] = useState('idle'); // 'idle' | 'editing' | 'saving' | 'saved' | 'error' | 'fetch-error'

  const timerRef = useRef(null);
  const lastSavedRef = useRef(initialNotes || '');
  const hydratedRef = useRef(false);        // store hydrated once we get serverNotes
  const inFlightRef = useRef(false);        // <-- prevents duplicate saves
  const lastNotifiedRef = useRef('__none'); // <-- prevent duplicate onSaved for same text

  // Fetch on mount/id change
  useEffect(() => {
    if (reservationId) {
      dispatch(fetchReservationById({ reservationId }));
    }
  }, [dispatch, reservationId]);

  // Keep local in sync with store
  useEffect(() => {
    if (typeof serverNotes === 'string') {
      hydratedRef.current = true;
      setNotes(serverNotes);
      lastSavedRef.current = serverNotes;
      setStatus('idle');
    } else if (fetchError) {
      setStatus('fetch-error');
    }
  }, [serverNotes, fetchError]);

  // Use initialNotes only once (before hydration)
  useEffect(() => {
    if (!hydratedRef.current && typeof initialNotes === 'string') {
      setNotes(initialNotes || '');
      lastSavedRef.current = initialNotes || '';
    }
  }, [initialNotes]);

  // Debounce save when text changes
  useEffect(() => {
    if (!reservationId) return;
    if (notes === lastSavedRef.current) return;

    setStatus('editing');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      handleSave(true);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, reservationId]);

  const handleSave = useCallback(
    async (silent = false) => {
      if (!reservationId) return;

      // If text hasn't changed vs last saved, skip
      if (notes === lastSavedRef.current) return;

      // Prevent duplicate saves from debounce + onBlur + tap
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Cancel any pending debounce
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      try {
        setStatus('saving');

        const action = await dispatch(
          updateReservationNotes({ reservationId, notes })
        );

        if (updateReservationNotes.fulfilled.match(action)) {
          const updated = action.payload?.notes ?? notes;

          // Update local "last saved"
          lastSavedRef.current = updated;
          setStatus('saved');

          // Notify parent only once per new text value
          if (updated !== lastNotifiedRef.current) {
            lastNotifiedRef.current = updated;
            onSaved?.(action.payload?.raw?.data ?? action.payload?.raw);
          }

          // Store already updated by the thunk; no re-fetch needed
          setTimeout(() => setStatus('idle'), 900);
        } else {
          throw new Error(action.payload || action.error?.message || 'Save failed');
        }
      } catch (e) {
        if (!silent) {
          console.warn('Notes save error', e?.message || e);
        }
        setStatus('error');
      } finally {
        inFlightRef.current = false;
      }
    },
    [dispatch, notes, onSaved, reservationId]
  );

  // Surface save error from store
  useEffect(() => {
    if (saveError) setStatus('error');
  }, [saveError]);

  const disabled = saving || fetching || notes === lastSavedRef.current;

  return (
    <View style={s.wrap}>
      <View style={s.inputWrap}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={fetching ? 'Loading notes…' : 'Type notes here...'}
          multiline
          textAlignVertical="top"
          style={s.input}
          maxLength={2000}
          editable={!saving && !fetching}
          onBlur={() => handleSave(true)}  
        />

        <TouchableOpacity
          onPress={() => handleSave(false)}
          disabled={disabled}
          style={[s.iconBtn, disabled && { opacity: 0.7 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {saving ? (
            <ActivityIndicator />
          ) : status === 'saved' ? (
            <Icon name="check" size={20} color="#19a464" />
          ) : status === 'error' || status === 'fetch-error' ? (
            <Icon name="alert-circle-outline" size={20} color="#e74c3c" />
          ) : fetching ? (
            <ActivityIndicator />
          ) : (
            <Icon name="pencil" size={20} color="#0b486b" />
          )}
        </TouchableOpacity>
      </View>

      <View style={s.footerRow}>
        <Text style={s.counter}>{`${notes?.length || 0}/2000`}</Text>
        {fetching && <Text style={s.statusText}>Loading…</Text>}
        {status === 'saving' && <Text style={s.statusText}>Saving…</Text>}
        {status === 'saved' && <Text style={[s.statusText, { color: '#19a464' }]}>Saved</Text>}
        {status === 'error' && <Text style={[s.statusText, { color: '#e74c3c' }]}>Save failed</Text>}
        {status === 'fetch-error' && (
          <Text style={[s.statusText, { color: '#e74c3c' }]}>Load failed</Text>
        )}
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
