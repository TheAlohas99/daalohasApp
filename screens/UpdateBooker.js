import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import SText from '../components/SText'; // Assuming SText is a custom Text component
import ServicesDropdown from '../components/GuestServices/ServicesDropdown'; // UPDATED PATH
import {
  fetchReservationById,
  selectReservationObj,
  updateReservationNotes,
} from '../redux/slice/ReservationSlice';
import { useDispatch, useSelector } from 'react-redux';

/* ===== Theme & API (kept for context, assuming this file works with it) ===== */
const BRAND = {
  primary: '#0b86d0',
  primaryDark: '#0b486b',
  bg: '#f3f7fb',
  card: '#ffffff',
  text: '#17364a',
  muted: '#506070',
  border: '#e7eef3',
  danger: '#d64545',
};

/* ---- helpers to safely pick fields from reservation ---- */
const pickName = r =>
  r?.booker_first_name ||
  r?.booker?.name ||
  r?.guest?.name ||
  r?.customer?.name ||
  r?.name ||
  '';
const pickPhone = r =>
  r?.booker_mobile ||
  r?.booker?.phone ||
  r?.guest?.phone ||
  r?.customer?.phone ||
  r?.mobile ||
  r?.phone ||
  '';
const pickEmail = r =>
  r?.booker_email ||
  r?.booker?.email ||
  r?.guest?.email ||
  r?.customer?.email ||
  r?.email ||
  '';

const toNumber = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pickPaidAmount = r =>
  toNumber(
    r?.amount_paid ??
      r?.paid_amount ??
      r?.payments?.paid ??
      r?.payment?.paid ??
      r?.advance_amount ??
      r?.amount?.paid ??
      0,
  );

export default function UpdateBooker() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { reservationId } = route.params || {};
  const reservation = useSelector(s => selectReservationObj(s, reservationId));

  // Local editable fields (prefilled from reservation)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  // State to hold objects in the format expected by ServicesDropdown: { id: '...', price: X }
  const [selectedServices, setSelectedServices] = useState([]); 

  // Prefill inputs when reservation arrives/changes
  useEffect(() => {
    if (reservation && reservationId) {
      setName(String(pickName(reservation) ?? ''));
      setPhone(String(pickPhone(reservation) ?? ''));
      setEmail(String(pickEmail(reservation) ?? ''));
      
      if (
        Array.isArray(reservation.service) &&
        reservation.service.length > 0
      ) {
        // Map the backend's 'serviceId' to the dropdown's 'id'
        const mappedServices = reservation.service
            .filter(s => s?.serviceId)
            .map(s => ({
                id: s.serviceId, // Map serviceId to 'id'
                price: toNumber(s.price), // Use price from reservation (potentially custom)
                // We keep original _id if needed, but the dropdown only cares about id/price
                _id: s._id || undefined, 
            }));
            
        // Filter out bad data and ensure uniqueness by service ID
        const uniqueServices = Array.from(new Map(
            mappedServices.map(s => [s.id, s])
        ).values());

        setSelectedServices(uniqueServices);
      } else {
          setSelectedServices([]);
      }
    }
  }, [reservationId, reservation]);

  // Amount already paid (shown in dropdown footer)
  const reservationPaidAmount = useMemo(
    () => pickPaidAmount(reservation),
    [reservation],
  );

  // Allow submit regardless of field values (all optional)
  const canSubmit = !!reservationId && !saving;

  const onSubmit = async () => {
    if (!reservationId) {
      return Alert.alert('Missing Data', 'Reservation ID is required.');
    }

    setSaving(true);
    try {
      const nameTrim = (name || '').trim();
      const phoneTrim = (phone || '').trim();
      const emailTrim = (email || '').trim();
      
      // Map the selectedServices state back to the backend's required format:
      // [{ id: '...', price: X }] -> [{ serviceId: '...', price: X }]
      const servicesForBackend = selectedServices
        .map(svc => ({
          serviceId: svc.id, 
          // Ensure price is a number and includes the user's editable value
          price: toNumber(svc.price), 
          // You might include other fields like svc._id if your API requires it
        }))
        .filter(svc => svc.serviceId); // Only include valid service entries

      // Dispatch the unified updateReservationNotes thunk
      const resultAction = await dispatch(
        updateReservationNotes({
          reservationId,
          booker_first_name: nameTrim || undefined,
          booker_email: emailTrim || undefined,
          booker_mobile:
            phoneTrim && Number.isFinite(Number(phoneTrim))
              ? Number(phoneTrim)
              : undefined,
          // Pass the mapped array of objects for the service field
          service: servicesForBackend, 
        }),
      );

      if (updateReservationNotes.fulfilled.match(resultAction)) {
        Alert.alert('Success', 'Guest updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const err =
          resultAction.payload ||
          resultAction.error?.message ||
          'Update failed';
        Alert.alert('Error', err);
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Fetch reservation on mount/when id changes
  useEffect(() => {
    if (reservationId) dispatch(fetchReservationById({ reservationId }));
  }, [dispatch, reservationId]);

  const loadingReservation = !reservation && !!reservationId;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 10 : 0) },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.headerBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Icon name="chevron-left" size={18} color={BRAND.primaryDark} />
        </Pressable>
        <SText style={styles.headerTitle}>Update Guest</SText>
        <View style={styles.headerBtn} />
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={styles.card}>
            {/* Name (optional) */}
            <SText style={styles.label}>Full Name </SText>
            <View style={styles.inputWrap}>
              <Icon
                name="user"
                size={16}
                color={BRAND.muted}
                style={styles.inputIcon}
              />
              <TextInput
                editable={!loadingReservation}
                style={styles.input}
                placeholder="Enter full name "
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                placeholderTextColor="#9ab0bf"
              />
            </View>

            {/* Phone (optional) */}
            <SText style={styles.label}>Phone </SText>
            <View style={styles.inputWrap}>
              <Icon
                name="phone"
                size={16}
                color={BRAND.muted}
                style={styles.inputIcon}
              />
              <TextInput
                editable={!loadingReservation}
                style={styles.input}
                placeholder="Enter phone"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor="#9ab0bf"
              />
            </View>

            {/* Email (optional) */}
            <SText style={styles.label}>Email</SText>
            <View style={styles.inputWrap}>
              <Icon
                name="envelope"
                size={14}
                color={BRAND.muted}
                style={styles.inputIcon}
              />
              <TextInput
                editable={!loadingReservation}
                style={styles.input}
                placeholder="Enter email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#9ab0bf"
              />
            </View>

            {/* Guest Services (footer shows: services total + reservation paid + grand total) */}
            <ServicesDropdown
              value={selectedServices} // Pass array of { id: '...', price: X }
              onChange={setSelectedServices} // Receive array of { id: '...', price: X }
              reservationPaidAmount={reservationPaidAmount}
              currencySymbol="₹"
            />

            {/* Submit */}
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.btnBig,
                !canSubmit && styles.btnDisabled,
                pressed && canSubmit && { transform: [{ scale: 0.98 }] },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon
                    name="save"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 10 }}
                  />
                  <SText style={styles.btnText}>Save Changes</SText>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.bg },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: BRAND.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: BRAND.primaryDark,
  },

  card: {
    backgroundColor: BRAND.card,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  label: {
    fontWeight: '800',
    color: BRAND.muted,
    marginTop: 8,
    marginBottom: 6,
  },

  inputWrap: {
    position: 'relative',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingLeft: 38,
    paddingRight: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 4,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: Platform.OS === 'ios' ? 13 : 12,
  },
  input: { color: BRAND.text, fontSize: 16, padding: 0 },

  btnBig: {
    marginTop: 16,
    height: 54,
    borderRadius: 14,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnDisabled: { backgroundColor: '#a9cbe2' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});