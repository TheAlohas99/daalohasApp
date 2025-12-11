import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getDueStatus } from '../../utils/display';
import styles from '../../styles/reportsStyles';

export default function ReportItem({ item, onPress }) {
  const property = item.propertyId || {};
//   console.log(item)
//   console.log(onPress)
  const { label: dueLabel, color: dueColor } = getDueStatus(item.createdAt);

  return (
    <View style={styles.card}>
      <View>
        <View style={{ flexDirection: 'row' }}>
          <Text style={styles.title}>{property.title}</Text>

          {item.isScan && (
            <Icon
              name="check-circle"
              size={20}
              color="#1976D2"
              style={{ marginLeft: 5 }}
            />
          )}
        </View>

        <Text style={styles.text}>{item.location}</Text>
      </View>

      <View style={styles.rowBetween}>
        <View>
          {item.status !== 'Resolved' && dueLabel && (
            <Text style={[styles.text, { color: dueColor, fontWeight: '600' }]}>
              {dueLabel}
            </Text>
          )}

          <Text style={styles.text}>
            Status:{' '}
            <Text
              style={{
                color:
                  item.status === 'Pending'
                    ? 'orange'
                    : item.status === 'Accepted'
                    ? 'green'
                    : item.status === 'Resolved'
                    ? 'blue'
                    : '#000',
              }}
            >
              {item.status}
            </Text>
          </Text>

          <Text style={styles.subText}>Ticket ID: {item?.ticketId}</Text>
        </View>

        <TouchableOpacity style={styles.buttonSmall} onPress={onPress}>
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
