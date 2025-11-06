import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Alert,
  Pressable,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { getProperty } from '../redux/slice/PropertySlice';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

const normalizeId = v => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    if (v._id) return normalizeId(v._id);
    if (v.id) return normalizeId(v.id);
    if (v.$oid) return String(v.$oid);
  }
  return String(v);
};

export default function ReportScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [role, setRole] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const dispatch = useDispatch();

  const { properties } = useSelector(
    s => ({ properties: (s.property && s.property.data) || [] }),
    shallowEqual,
  );

  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          const { email, mobile } = user || {};
          const mobileNoPlus = (mobile || '').replace(/^\+/, '');
          if (email || mobileNoPlus) {
            dispatch(getProperty({ email, mobile: mobileNoPlus }));
          }
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      }
    })();
  }, [dispatch]);

  const allowedPropertyIds = useMemo(() => {
    const arr = Array.isArray(properties) ? properties : [];
    return new Set(arr.map(p => normalizeId(p?._id ?? p?.id ?? p)));
  }, [properties]);

  const propertyIdParam = useMemo(() => {
    const ids = [...allowedPropertyIds].filter(Boolean);
    return ids.length ? ids.join(',') : undefined;
  }, [allowedPropertyIds]);

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');
      const user = JSON.parse(userJson);
      setRole(user?.role || '');

      if (!token) throw new Error('No token found, please log in again');

      const response = await fetch(
        `https://api.daalohas.com/api/v1/total/reports?propertyId=${propertyIdParam}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      const allReports = data.allReports || data.data || [];
      setReports(allReports);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyIdParam]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  // Update Report Status
  const handleUpdateReport = async (id, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Unauthorized');

      const response = await fetch(
        `https://api.daalohas.com/api/v1/report/${id}/accept`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', `Report has been ${newStatus.toLowerCase()} successfully!`);
        setSelectedReport(null);
        setReports(prev =>
          prev.map(r => (r._id === id ? { ...r, status: newStatus } : r)),
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to update report');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Render States
  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="tomato" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );

  if (reports.length === 0)
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No reports found.</Text>
      </View>
    );

  const pendingCount = reports.filter(r => r.status === 'Pending').length;
  const acceptedCount = reports.filter(r => r.status === 'Accepted').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
      {/* Summary Bar */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryBox, { backgroundColor: '#ff9800' }]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={styles.summaryCount}>{pendingCount}</Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: '#4caf50' }]}>
          <Text style={styles.summaryLabel}>Accepted</Text>
          <Text style={styles.summaryCount}>{acceptedCount}</Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: '#2196f3' }]}>
          <Text style={styles.summaryLabel}>Resolved</Text>
          <Text style={styles.summaryCount}>{resolvedCount}</Text>
        </View>

        <View style={styles.newTicketContainer}>
          <TouchableOpacity
            style={styles.newTicketButton}
            onPress={() => setShowWebView(true)}>
            <Text style={styles.newTicketText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          const property = item.propertyId || {};
          return (
            <View style={styles.card}>
              <View>
                <Text style={styles.title}>{property.title}</Text>
                <Text style={styles.text}>{item.location}</Text>
              </View>

              <View style={styles.rowBetween}>
                <View>
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
                            : '#555',
                        fontWeight: '600',
                      }}>
                      {item.status || 'Pending'}
                    </Text>
                  </Text>
                  <Text style={[styles.text, { fontSize: 12, color: '#515151ff' }]}>
                    Ticket ID: {item?.ticketId}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => {
                    setSelectedReport({ ...item });
                  }}>
                  <Text style={styles.buttonText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="tomato"
            colors={['tomato']}
          />
        }
      />

      {/* Report Modal */}
      <Modal
        visible={!!selectedReport}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedReport(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedReport(null)}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {selectedReport.propertyId?.title || 'Report Details'}
                </Text>

                {selectedReport.image?.url && (
                  <Image source={{ uri: selectedReport.image.url }} style={styles.image} />
                )}

                <Text style={styles.text}>
                  Category: {selectedReport.category?.name || 'N/A'}
                </Text>
                <Text style={styles.text}>
                  Subcategory: {selectedReport.subcategory?.name || 'N/A'}
                </Text>

                <Text style={[styles.text, { marginTop: 10 }]}>
                  {selectedReport.userId?.firstName} {selectedReport.userId?.lastName}
                </Text>
                <Text style={styles.text}>{selectedReport.userId?.mobile}</Text>
                <Text style={styles.text}>{selectedReport.userId?.email}</Text>

                <Text style={[styles.text, { marginTop: 10 }]}>
                  Notes: {selectedReport.notes || 'No notes'}
                </Text>

                <Text style={styles.date}>
                  Created: {new Date(selectedReport.createdAt).toLocaleString()}
                </Text>

                {(role === 'admin' || role === 'operation') && (
                  <>
                    {selectedReport.status === 'Pending' && (
                      <TouchableOpacity
                        style={[styles.button, { backgroundColor: 'green' }]}
                        onPress={() =>
                          handleUpdateReport(selectedReport._id, 'Accepted')
                        }>
                        <Text style={styles.buttonText}>Accept</Text>
                      </TouchableOpacity>
                    )}

                    {selectedReport.status === 'Accepted' && (
                      <TouchableOpacity
                        style={[styles.button, { backgroundColor: 'blue' }]}
                        onPress={() =>
                          handleUpdateReport(selectedReport._id, 'Resolved')
                        }>
                        <Text style={styles.buttonText}>Mark as Resolved</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedReport(null)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* WebView Modal */}
      <Modal visible={showWebView} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Text style={styles.closeWebText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.webviewTitle}>New Ticket</Text>
          </View>
          <WebView source={{ uri: 'https://www.daalohas.com/reports' }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  errorText: { color: 'red', fontSize: 16 },
  emptyText: { fontSize: 16, color: '#666' },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    elevation: 3,
  },
  summaryBox: {
    flexDirection: 'row',
    width: 90,
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { marginRight: 4, fontSize: 13, color: '#fff' },
  newTicketContainer: { padding: 3 },
  newTicketButton: {
    backgroundColor: 'tomato',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  newTicketText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  text: { fontSize: 14, color: '#555', marginVertical: 2 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSmall: {
    backgroundColor: 'tomato',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  button: {
    marginTop: 10,
    backgroundColor: 'tomato',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: 'tomato',
    borderRadius: 6,
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'tomato',
    marginBottom: 10,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginVertical: 10,
  },
  date: { fontSize: 12, color: '#888', marginTop: 6 },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'blue',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  closeWebText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  webviewTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
