import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../utils/api';

type LoginProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

const LoginScreen = ({ setIsLoggedIn }: LoginProps) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile');
  const [message, setMessage] = useState('');

  // ✅ Utility: format number with +91
  const formatMobile = (num: string) => {
    if (!num.startsWith('+91')) {
      return `+91${num}`;
    }
    return num;
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    try {
      const formattedMobile = formatMobile(mobile);

      const response = await fetch(
        'https://api.daalohas.com/api/v1/send-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: formattedMobile }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setStep('otp');
        setMessage('OTP sent to your mobile ✅');
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error(error);
      setMessage('Error sending OTP');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    try {
      const formattedMobile = formatMobile(mobile);

      const response = await apiFetch(
        'https://api.daalohas.com/api/v1/otp-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: formattedMobile, otp }),
        },
      );

      const data = await response.json();
      console.log(data);
      if (data.success) {
        setMessage('Login successful 🎉');

        // Store token
        await AsyncStorage.setItem('token', data.token);
        const userData = {
          ...data.user,
        };

        await AsyncStorage.setItem('user', JSON.stringify(userData));

        // 🔑 Switch to HomeTabs
        setIsLoggedIn(true);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error(error);
      setMessage('Error verifying OTP');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {step === 'mobile' ? (
        <>
          <TextInput
            placeholder="Enter Mobile Number"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
          />
          <Button title="Send OTP" onPress={handleSendOtp} />
        </>
      ) : (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
          />
          <Button title="Verify OTP" onPress={handleVerifyOtp} />
        </>
      )}

      <Text style={{ marginTop: 10, fontWeight: 'bold' }}>{message}</Text>
    </View>
  );
};

export default LoginScreen;
