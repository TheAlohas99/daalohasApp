import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
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
  BackHandler,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { getProperty } from '../redux/slice/PropertySlice';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { getDueStatus } from '../utils/display';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
  const webviewRef = useRef(null);
  const canGoBackRef = useRef(false);

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

  console.log(reports);

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
        Alert.alert(
          'Success',
          `Report has been ${newStatus.toLowerCase()} successfully!`,
        );
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

  // ✅ Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (showWebView) {
        if (canGoBackRef.current && webviewRef.current) {
          webviewRef.current.goBack(); // go back inside the webview
        } else {
          setShowWebView(false); // close modal
        }
        return true;
      }

      if (selectedReport) {
        setSelectedReport(null);
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [showWebView, selectedReport]);

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
  const DirectGuest = reports.filter(r => r.isScan === true).length;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#f9f9f9',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }}
    >
      <View style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
        {/* Summary Bar */}
        <View style={styles.summaryContainer}>
          <View style={[styles.pill, { backgroundColor: '#FFEDD5' }]}>
            <Text style={[styles.pillLabel, { color: '#D97706' }]}>
              Pending
            </Text>
            <Text style={[styles.pillCount, { color: '#D97706' }]}>
              {pendingCount}
            </Text>
          </View>

          <View style={[styles.pill, { backgroundColor: '#E6F4EA' }]}>
            <Text style={[styles.pillLabel, { color: '#1B873F' }]}>
              Accepted
            </Text>
            <Text style={[styles.pillCount, { color: '#1B873F' }]}>
              {acceptedCount}
            </Text>
          </View>

          <View style={[styles.pill, { backgroundColor: '#E3F2FD' }]}>
            <Text style={[styles.pillLabel, { color: '#1976D2' }]}>
              Resolved
            </Text>
            <Text style={[styles.pillCount, { color: '#1976D2' }]}>
              {resolvedCount}
            </Text>
          </View>

          <View style={[styles.pill, { backgroundColor: '#F0F9FF' }]}>
            <Text style={[styles.pillLabel, { color: '#0284C7' }]}>
              Direct Guest
            </Text>
            <Text style={[styles.pillCount, { color: '#0284C7' }]}>
              {DirectGuest}
            </Text>
          </View>
        </View>

        {/* Reports List */}
        <FlatList
          data={reports}
          keyExtractor={item => item._id}
          renderItem={({ item }) => {
            const property = item.propertyId || {};
            const { label: dueLabel, color: dueColor } = getDueStatus(
              item.createdAt,
            );

            return (
              <View style={styles.card}>
                <View>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={styles.title}>{property.title}</Text>
                    {item.isScan === true && (
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
                    {/* 👇 NEW: Due Status Line */}
                    {item.status !== 'Resolved' && dueLabel ? (
                      <Text
                        style={[
                          styles.text,
                          { color: dueColor, fontWeight: '600' },
                        ]}
                      >
                        {dueLabel}
                      </Text>
                    ) : null}
                    {/* Existing Status Line */}
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
                        }}
                      >
                        {item.status || 'Pending'}
                      </Text>
                    </Text>
                    <Text
                      style={[
                        styles.text,
                        { fontSize: 12, color: '#515151ff' },
                      ]}
                    >
                      Ticket ID: {item?.ticketId}
                    </Text>
                    <Text
                      style={[
                        styles.text,
                        { fontSize: 12, color: '#515151ff' },
                      ]}
                    >
                      Open Date:
                      {new Date(item?.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.buttonSmall}
                    onPress={() => {
                      setSelectedReport({ ...item });
                    }}
                  >
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

        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => setShowWebView(true)}
          >
            <Text style={styles.floatingButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Report Modal */}
        <Modal
          visible={!!selectedReport}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedReport(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedReport(null)}
          >
            <Pressable
              style={styles.modalBox}
              onPress={e => e.stopPropagation()}
            >
              {selectedReport && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>
                    {selectedReport.propertyId?.title || 'Report Details'}
                  </Text>

                  {selectedReport.image?.url && (
                    <Image
                      source={{ uri: selectedReport.image.url }}
                      style={styles.image}
                    />
                  )}

                  <Text style={styles.text}>
                    Master category:{' '}
                    {selectedReport.masterCategory?.name || 'N/A'}
                  </Text>

                  <Text style={styles.text}>
                    Category: {selectedReport.category?.name || 'N/A'}
                  </Text>
                  <Text style={styles.text}>
                    Subcategory: {selectedReport.subcategory?.name || 'N/A'}
                  </Text>

                  <Text style={[styles.text, { marginTop: 10 }]}>
                    {selectedReport.userId?.firstName}{' '}
                    {selectedReport.userId?.lastName}
                  </Text>
                  <Text style={styles.text}>
                    {selectedReport.userId?.mobile}
                  </Text>
                  <Text style={styles.text}>
                    {selectedReport.userId?.email}
                  </Text>

                  <Text style={[styles.text, { marginTop: 10 }]}>
                    Notes: {selectedReport.notes || 'No notes'}
                  </Text>

                  <Text style={styles.date}>
                    Created:{' '}
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </Text>

                  {(role === 'admin' || role === 'operation') && (
                    <>
                      {selectedReport.status === 'Pending' && (
                        <TouchableOpacity
                          style={[styles.button, { backgroundColor: 'green' }]}
                          onPress={() =>
                            handleUpdateReport(selectedReport._id, 'Accepted')
                          }
                        >
                          <Text style={styles.buttonText}>Accept</Text>
                        </TouchableOpacity>
                      )}

                      {selectedReport.status === 'Accepted' && (
                        <TouchableOpacity
                          style={[styles.button, { backgroundColor: 'blue' }]}
                          onPress={() =>
                            handleUpdateReport(selectedReport._id, 'Resolved')
                          }
                        >
                          <Text style={styles.buttonText}>
                            Mark as Resolved
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedReport(null)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ✅ WebView Modal (no extra back button) */}
        <Modal
          visible={showWebView}
          animationType="slide"
          onRequestClose={() => setShowWebView(false)}
        >
          <View style={{ flex: 1 }}>
            <WebView
              ref={webviewRef}
              source={{ uri: 'https://www.daalohas.com/reports' }}
              startInLoadingState
              onNavigationStateChange={navState => {
                canGoBackRef.current = navState.canGoBack;
              }}
              onError={() => Alert.alert('Error', 'Failed to load page')}
            />
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  errorText: { color: 'red', fontSize: 16 },
  emptyText: { fontSize: 16, color: '#666' },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },

  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  pillCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryBox: {
    flexDirection: 'row',
    width: 95,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { marginRight: 4, fontSize: 13, color: '#fff' },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },

  floatingButton: {
    backgroundColor: '#2a6285ff',
    width: 70,
    height: 70,
    borderRadius: 50,
    elevation: 5,
    shadowColor: '#080707ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  floatingButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  text: { fontSize: 14, color: '#555' },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
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
});
