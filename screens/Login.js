import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../utils/api';

const BRAND = {
  primary: '#0b486b',
  primaryDark: '#083a56',
  accent: '#11a7a7',
  text: '#0e1b25',
  muted: '#748a9d',
  surface: '#ffffff',
  bg: '#f3f7fb',
  success: '#19a974',
  danger: '#d64545',
};

const LoginScreen = ({ setIsLoggedIn }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile'); 
  const [message, setMessage] = useState('');
  const [msgTone, setMsgTone] = useState('info'); 
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0); 

  // derived
  const isValidMobile = useMemo(
    () => /^(\+?91)?[6-9]\d{9}$/.test(mobile.replace(/\s|-/g, '')),
    [mobile]
  );
  const isValidOtp = useMemo(() => /^\d{4,6}$/.test(otp), [otp]);

  // format & sanitize
  const toE164 = (raw) => {
    const digits = raw.replace(/[^\d]/g, '');
    return digits.startsWith('91') && digits.length === 12
      ? `+${digits}`
      : `+91${digits.slice(-10)}`;
  };

  // cool-down timer for resend
  useEffect(() => {
    if (!resendIn) return;
    const t = setInterval(() => setResendIn((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const showInfo = (msg) => { setMessage(msg); setMsgTone('info'); };
  const showSuccess = (msg) => { setMessage(msg); setMsgTone('success'); };
  const showError = (msg) => { setMessage(msg); setMsgTone('error'); };

  const handleSendOtp = async () => {
    try {
      if (!isValidMobile) return showError('Please enter a valid Indian mobile number.');
      setLoading(true);
      const formattedMobile = toE164(mobile);

      const res = await apiFetch('https://api.daalohas.com/api/v1/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: formattedMobile }),
      });
      const data = await res.json();

      if (data && data.success) {
        setStep('otp');
        setResendIn(45);
        showSuccess('OTP sent to your mobile.');
      } else {
        showError((data && data.message) || 'Unable to send OTP. Try again.');
      }
    } catch (e) {
      showError('Network error while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!isValidOtp) return showError('Enter the 4–6 digit OTP.');
      setLoading(true);
      const formattedMobile = toE164(mobile);

      const res = await apiFetch('https://api.daalohas.com/api/v1/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: formattedMobile, otp }),
      });
      const data = await res.json();

      if (data && data.success) {
        showSuccess('Login successful 🎉');
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify({ ...(data.user || {}) }));
        await AsyncStorage.setItem('mobile', formattedMobile);
        setIsLoggedIn(true);
      } else {
        showError((data && data.message) || 'Invalid OTP. Please try again.');
      }
    } catch (e) {
      showError('Network error while verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (resendIn > 0) return;
    handleSendOtp();
  };

  // OTP input with 6 boxes (works with 4–6 digits)
  const otpRef = useRef(null);
  const boxes = Array.from({ length: 6 });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Icon name="home-city" size={28} color={BRAND.primary} />
        <Text style={styles.brand}>Da Alohas</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{step === 'mobile' ? 'Sign in with Mobile' : 'Enter OTP'}</Text>
        <Text style={styles.subtitle}>
          {step === 'mobile'
            ? 'We’ll send a one-time password to your number'
            : 'We’ve sent an OTP to your mobile'}
        </Text>

        {step === 'mobile' && (
          <>
            <View style={styles.inputRow}>
              <View style={styles.ccBox}>
                <Text style={styles.ccText}>+91</Text>
              </View>
              <TextInput
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
                returnKeyType="done"
                value={mobile}
                onChangeText={setMobile}
                style={[styles.input, !isValidMobile && mobile.length > 0 && styles.inputError]}
                maxLength={14}
                autoComplete="tel"
                textContentType="telephoneNumber"
                placeholderTextColor={BRAND.muted}
              />
            </View>

            <TouchableOpacity
              style={[styles.cta, (!isValidMobile || loading) && styles.ctaDisabled]}
              onPress={handleSendOtp}
              disabled={!isValidMobile || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Icon name="shield-key-outline" size={20} color="#fff" />
                  <Text style={styles.ctaText}>Send OTP</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.helperRow}>
              <Icon name="lock-check" size={16} color={BRAND.muted} />
              <Text style={styles.helperText}>Your number is used only for verification</Text>
            </View>
          </>
        )}

        {step === 'otp' && (
          <>
            <TouchableOpacity
              onPress={() => setStep('mobile')}
              style={styles.backRow}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="chevron-left" size={22} color={BRAND.primary} />
              <Text style={styles.backText}>Change number</Text>
            </TouchableOpacity>

            {/* OTP boxes */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => otpRef.current?.focus()}
              style={styles.otpRow}
            >
              {boxes.map((_, i) => {
                const char = otp[i] ?? '';
                const isFocused = otp.length === i;
                const filled = i < otp.length;

                return (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      isFocused && styles.otpBoxFocused,
                      filled && styles.otpBoxFilled,
                    ]}
                  >
                    <Text style={styles.otpChar}>{char}</Text>
                  </View>
                );
              })}
              {/* Invisible text input drives the OTP */}
              <TextInput
                ref={otpRef}
                style={styles.hiddenOtpInput}
                keyboardType="numeric"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^\d]/g, '').slice(0, 6))}
                autoFocus
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cta, (!isValidOtp || loading) && styles.ctaDisabled]}
              onPress={handleVerifyOtp}
              disabled={!isValidOtp || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Icon name="login" size={20} color="#fff" />
                  <Text style={styles.ctaText}>Verify & Sign in</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn’t get the code?</Text>
              <TouchableOpacity onPress={handleResend} disabled={resendIn > 0 || loading}>
                <Text
                  style={[
                    styles.resendLink,
                    (resendIn > 0 || loading) && styles.resendDisabled,
                  ]}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!!message && (
          <View
            style={[
              styles.msg,
              msgTone === 'success' && { backgroundColor: '#e9f9f1', borderColor: '#b6f0d7' },
              msgTone === 'error' && { backgroundColor: '#ffeaea', borderColor: '#ffc4c4' },
            ]}
          >
            <Icon
              name={
                msgTone === 'success'
                  ? 'check-circle-outline'
                  : msgTone === 'error'
                  ? 'alert-circle-outline'
                  : 'information-outline'
              }
              size={18}
              color={
                msgTone === 'success'
                  ? BRAND.success
                  : msgTone === 'error'
                  ? BRAND.danger
                  : BRAND.primary
              }
            />
            <Text
              style={[
                styles.msgText,
                msgTone === 'success' && { color: BRAND.success },
                msgTone === 'error' && { color: BRAND.danger },
              ]}
            >
              {message}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Icon name="shield-lock-outline" size={16} color={BRAND.muted} />
        <Text style={styles.footerText}>
          Protected by OTP • By continuing you agree to our Terms
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg, padding: 20, justifyContent: 'center' },
  header: { position: 'absolute', top: 18, left: 20, flexDirection: 'row', alignItems: 'center' },
  brand: { marginLeft: 8, fontSize: 18, fontWeight: '700', color: BRAND.primary },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: '700', color: BRAND.text },
  subtitle: { marginTop: 6, fontSize: 13, color: BRAND.muted },

  inputRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ccBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6eef3',
    backgroundColor: '#f9fbfd',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ccText: { fontSize: 16, fontWeight: '600', color: BRAND.text },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6eef3',
    paddingHorizontal: 14,
    fontSize: 16,
    color: BRAND.text,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#ffb4b4' },

  cta: {
    marginTop: 16,
    height: 50,
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  helperRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  helperText: { color: BRAND.muted, fontSize: 12 },

  backRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: BRAND.primary, fontSize: 14, fontWeight: '600' },

  otpRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6eef3',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: { borderColor: BRAND.accent, shadowColor: BRAND.accent, shadowOpacity: 0.12, shadowRadius: 8 },
  otpBoxFilled: { borderColor: '#d8e7ef' },
  otpChar: { fontSize: 20, fontWeight: '700', color: BRAND.text },
  hiddenOtpInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },

  resendRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  resendText: { color: BRAND.muted },
  resendLink: { color: BRAND.primary, fontWeight: '700' },
  resendDisabled: { color: '#98aab9', fontWeight: '600' },

  msg: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#d9e7f0',
    backgroundColor: '#f3f9ff',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  msgText: { color: BRAND.primary, fontSize: 13, flexShrink: 1 },

  footer: { marginTop: 16, alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, color: BRAND.muted },
});
