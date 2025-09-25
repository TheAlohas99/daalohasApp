// screens/GuestScreen.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Alert, Share } from "react-native";
import WebView from "react-native-webview";
import Clipboard from "@react-native-clipboard/clipboard";

export default function GuestScreen({ route }) {
  const { reservationId } = route.params || {};
  const url = `https://www.daalohas.com/guest-checkin?reservationId=${encodeURIComponent(
    reservationId ?? ""
  )}`;

  const copyToClipboard = async () => {
    try {
      if (Clipboard?.setString) {
        Clipboard.setString(url);
        Alert.alert("Copied!", "The link has been copied to your clipboard.");
      } else {
        // fallback (shouldn't happen on CLI if linked)
        await Share.share({ message: url, url });
      }
    } catch (e) {
      await Share.share({ message: url, url });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView source={{ uri: url }} style={{ flex: 1 }} />
      <TouchableOpacity style={styles.button} onPress={copyToClipboard}>
        <Text style={styles.buttonText}>Copy Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0a84ff",
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
