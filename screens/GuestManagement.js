// screens/GuestScreen.js
import React from "react";
import { View } from "react-native";
import WebView from "react-native-webview";

export default function GuestManagement({ route }) {
  const { reservationId } = route.params || {};
  // console.log(route)
  const url = `https://www.daalohas.com/guest-management-app?reservationId=${encodeURIComponent(
    reservationId ?? ""
  )}&action=checkin`;

  

  return (
    <View style={{ flex: 1 }}>
      <WebView source={{ uri: url }} style={{ flex: 1 }} />
      {/* <TouchableOpacity style={styles.button} onPress={copyToClipboard}>
        <Text style={styles.buttonText}>Copy Link</Text>
      </TouchableOpacity> */}
    </View>
  );
}


