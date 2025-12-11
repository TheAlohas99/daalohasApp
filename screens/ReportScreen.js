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
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProperty } from '../redux/slice/PropertySlice';
import ReportItem from '../components/Reports/ReportItem';
import styles from '../styles/reportsStyles';
import ReportCategoryModal from '../components/Reports/ReportCategoryModal';

const normalizeId = v => {
  if (!v) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    if (v._id) return normalizeId(v._id);
    if (v.id) return normalizeId(v.id);
    if (v.$oid) return String(v.$oid);
  }
  return String(v);
};

//  UPDATED SummaryPill with ACTIVE HIGHLIGHT — safe position
const SummaryPill = ({ label, count, color, bg, onPress, active }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.pill,
      { backgroundColor: bg },
      active && {
        borderWidth: 2,
        borderColor: color,
        transform: [{ scale: 1.05 }],
      },
    ]}
  >
    <Text
      style={[styles.pillLabel, { color }, active && { fontWeight: 'bold' }]}
    >
      {label}
    </Text>

    <Text
      style={[styles.pillCount, { color }, active && { fontWeight: 'bold' }]}
    >
      {count}
    </Text>
  </TouchableOpacity>
);

export default function ReportScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [role, setRole] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState(null);
  const [scannedReports, setScannedReports] = useState([]);

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
          const mobileFixed = (user.mobile || '').replace(/^\+/, '');
          dispatch(getProperty({ email: user.email, mobile: mobileFixed }));
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  const allowedPropertyIds = useMemo(() => {
    return new Set(
      (properties || []).map(p => normalizeId(p?._id ?? p?.id ?? p)),
    );
  }, [properties]);

  const propertyIdParam = [...allowedPropertyIds].join(',');

  const fetchReports = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const u = JSON.parse(await AsyncStorage.getItem('user'));
      setRole(u?.role || '');

      const res = await fetch(
        `https://api.daalohas.com/api/v1/total/reports?propertyId=${propertyIdParam}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const data = await res.json();

      if (data.data) {
        const merged = [
          ...(data.data.Pending || []),
          ...(data.data.Accepted || []),
          ...(data.data.Resolved || []),
          ...(data.data.Scanned || []),
        ];
        setReports(merged);
      } else {
        setReports(data.allReports || []);
      }
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

  const handleUpdateReport = async (
    id,
    newStatus,
    masterCategory,
    category,
    subcategory,
  ) => {
    if (updatingId) return; // prevent duplicates
    setUpdatingId(id);

    try {
      const token = await AsyncStorage.getItem('token');

      const res = await fetch(
        `https://api.daalohas.com/api/v1/report/${id}/accept`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            masterCategory: masterCategory || '',
            category: category || '',
            subcategory: subcategory || '',
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message || 'Failed to update report';
        Alert.alert('Error', msg);
        setUpdatingId(null);
        return;
      }

      // Use canonical report returned by server if available
      const updated = data?.report || null;

      if (updated) {
        // If updated.isScan true => move to scannedReports and remove from reports
        if (updated.isScan === true) {
          setScannedReports(prev => {
            // replace or append
            const found = prev.find(p => p._id === updated._id);
            if (found)
              return prev.map(p => (p._id === updated._id ? updated : p));
            return [updated, ...prev];
          });
          // remove from non-scanned list if exists
          setReports(prev => prev.filter(r => r._id !== updated._id));
        } else {
          // updated is not scanned => update or insert in non-scanned list
          setReports(prev => {
            const found = prev.find(r => r._id === updated._id);
            if (found)
              return prev.map(r => (r._id === updated._id ? updated : r));
            return [updated, ...prev];
          });
          // also ensure removed from scanned list
          setScannedReports(prev => prev.filter(s => s._id !== updated._id));
        }
      } else {
        // fallback: server didn't return populated report — patch locally
        setReports(prev =>
          prev.map(r =>
            r._id === id
              ? {
                  ...r,
                  status: newStatus,
                  masterCategory: masterCategory
                    ? { _id: masterCategory }
                    : r.masterCategory,
                  category: category ? { _id: category } : r.category,
                  subcategory: subcategory
                    ? { _id: subcategory }
                    : r.subcategory,
                }
              : r,
          ),
        );
      }

      Alert.alert('Success', `Report ${newStatus} successfully`);
      setSelectedReport(null);
    } catch (err) {
      console.error('Update error', err);
      Alert.alert('Error', err.message || 'Server error');
    } finally {
      setUpdatingId(null);
    }
  };
  // BACK BUTTON HANDLING
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (showWebView) {
          if (canGoBackRef.current && webviewRef.current) {
            webviewRef.current.goBack();
          } else {
            setShowWebView(false);
          }
          return true;
        }
        return false;
      },
    );

    return () => backHandler.remove();
  }, [showWebView]);

  const filteredReports = useMemo(() => {
    if (activeFilter === 'Pending')
      return reports.filter(r => r.status === 'Pending');
    if (activeFilter === 'Accepted')
      return reports.filter(r => r.status === 'Accepted');
    if (activeFilter === 'Resolved')
      return reports.filter(r => r.status === 'Resolved');
    if (activeFilter === 'Scanned')
      return reports.filter(r => r.isScan === true);

    return reports;
  }, [activeFilter, reports]);

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="tomato" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#f9f9f9',
        paddingTop:
          Platform.OS === 'android' ? StatusBar.currentHeight || 30 : 0,
      }}
    >
      {/* SUMMARY PILLS */}
      <View style={styles.summaryContainer}>
        <SummaryPill
          label="Pending"
          active={activeFilter === 'Pending'}
          count={reports.filter(r => r.status === 'Pending').length}
          color="#D97706"
          bg="#FFEDD5"
          onPress={() => setActiveFilter('Pending')}
        />
        <SummaryPill
          label="Accepted"
          active={activeFilter === 'Accepted'}
          count={reports.filter(r => r.status === 'Accepted').length}
          color="#1B873F"
          bg="#E6F4EA"
          onPress={() => setActiveFilter('Accepted')}
        />
        <SummaryPill
          label="Resolved"
          active={activeFilter === 'Resolved'}
          count={reports.filter(r => r.status === 'Resolved').length}
          color="#1976D2"
          bg="#E3F2FD"
          onPress={() => setActiveFilter('Resolved')}
        />
        <SummaryPill
          label="Direct Guest"
          active={activeFilter === 'Scanned'}
          count={reports.filter(r => r.isScan === true).length}
          color="#1976D2"
          bg="#E3F2FD"
          onPress={() => setActiveFilter('Scanned')}
        />
      </View>

      {/* REPORT LIST */}
      <FlatList
        data={filteredReports}
        keyExtractor={i => i._id}
        renderItem={({ item }) => (
          <ReportItem item={item} onPress={() => setSelectedReport(item)} />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* ADD NEW */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowWebView(true)}
      >
        <Text style={styles.floatingButtonText}>New</Text>
      </TouchableOpacity>

      {/* WEBVIEW */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => {
          if (canGoBackRef.current && webviewRef.current) {
            webviewRef.current.goBack();
          } else {
            setShowWebView(false);
          }
        }}
      >
        <WebView
          ref={webviewRef}
          source={{ uri: 'https://www.daalohas.com/reports' }}
          onNavigationStateChange={nav => {
            canGoBackRef.current = nav.canGoBack;
          }}
          androidHardwareAccelerationDisabled={false}
          setSupportMultipleWindows={false}
          style={{ flex: 1 }}
        />
      </Modal>

      <ReportCategoryModal
        visible={!!selectedReport}
        report={selectedReport}
        role={role}
        onClose={() => setSelectedReport(null)}
        onUpdateStatus={handleUpdateReport}
        updatingId={updatingId}
      />
    </SafeAreaView>
  );
}
