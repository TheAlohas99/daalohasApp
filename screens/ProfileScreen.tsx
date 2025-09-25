// screens/ProfileScreen.tsx
import React from "react";
import { View, Text, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ProfileScreen({ setIsLoggedIn }: Props) {
  const onLogout = async () => {
    await AsyncStorage.removeItem("token");
    
    setIsLoggedIn(false); 
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 18, marginBottom: 16 }}>Profile</Text>
      <Button title="Logout" color="#d9534f" onPress={onLogout} />
    </View>
  );
}
