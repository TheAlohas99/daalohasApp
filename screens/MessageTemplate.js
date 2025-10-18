// src/screens/MessageTemplate.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import axios from 'axios';

export default function MessageTemplate({ route }) {
  const { phone, reservation } = route.params;
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const baseUrl = 'https://api.daalohas.com';

  // ✅ Fetch templates from backend
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await axios.get(`${baseUrl}/api/v1/templates`);
        const sortedTemplates = (res.data || []).sort((a, b) =>
          a.template_name.localeCompare(b.template_name),
        );
        setTemplates(sortedTemplates);
      } catch (error) {
        console.error('Error fetching templates:', error);
        Alert.alert('Error', 'Could not load templates');
      }
    };
    fetchTemplates();
  }, []);

  // ✅ Format phone (always starts with 91, no +)
  const formatPhone = rawPhone => {
    let num = rawPhone.toString().trim();
    if (num.startsWith('+')) {
      num = num.slice(1); // remove +
    }
    if (!num.startsWith('91')) {
      num = '91' + num;
    }
    return num;
  };

  // ✅ Call backend to generate message
  const sendWhatsApp = async () => {
    if (!selected) return;
    const template = templates.find(t => t._id === selected);
    if (!template) return;

    try {
      const res = await axios.post(`${baseUrl}/api/v1/generate-message`, {
        templateId: template._id,
        reservationId: reservation._id,
        propertyId: reservation.propertyId,
      });

      const message = res.data.message;
      const formattedPhone = formatPhone(phone);

      const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(
        message,
      )}`;

      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Make sure WhatsApp is installed on your device'),
      );
    } catch (error) {
      console.error('Error generating message:', error);
      Alert.alert('Error', 'Failed to generate message');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Select a Template</Text>

      <FlatList
        data={templates}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.card,
              selected === item._id && {
                borderColor: '#25D366',
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelected(item._id)}
          >
            <Text style={styles.title}>{item.template_name}</Text>
            {/* <Text style={styles.body}>{item.template_body}</Text> */}
          </Pressable>
        )}
      />

      <Pressable
        style={[
          styles.button,
          { backgroundColor: selected ? '#25D366' : 'gray' },
        ]}
        disabled={!selected}
        onPress={sendWhatsApp}
      >
        <Text style={styles.buttonText}>Send WhatsApp</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: 'bold' },
  body: { fontSize: 14, marginTop: 6, color: '#555' },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
