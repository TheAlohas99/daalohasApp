// AvailabilityScreen.js
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import { getProperty } from '../redux/slice/PropertySlice';

const PROP_COL_WIDTH = 160;
const VISIBLE_DAYS = 180;
const MONTH_HEADER_HEIGHT = 24;
const DAY_HEADER_HEIGHT = 48;
const ROW_HEIGHT = 60;

export default function AvailabilityScreen() {
  const dispatch = useDispatch();
  const { data: properties = [] } = useSelector(state => state.property);
  const {Allreservation} = useSelector((state)=>state.reservation)
  console.log(Allreservation)

  const screenWidth = Dimensions.get('window').width;
  const dayWidth = (screenWidth - PROP_COL_WIDTH) / 7;
  const scrollRef = useRef(null);

  const [selectedProperty, setSelectedProperty] = useState('all');

  const getId = p => String(p?._id || '');

  // Generate 180 days starting today
  const dates = useMemo(() => {
    const today = new Date();
    const list = [];
    for (let i = 0; i < VISIBLE_DAYS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
  const [currentMonth, setCurrentMonth] = useState(todayLabel);

  const getMonthLabel = useCallback(
    firstIndex => {
      const start = dates[firstIndex] || dates[0];
      const end =
        dates[Math.min(firstIndex + 6, dates.length - 1)] ||
        dates[dates.length - 1];
      if (!start || !end) return '';
      const sM = start.toLocaleDateString(undefined, { month: 'short' });
      const sY = start.getFullYear();
      const eM = end.toLocaleDateString(undefined, { month: 'short' });
      const eY = end.getFullYear();
      if (sM === eM && sY === eY) return `${sM} ${sY}`;
      if (sY === eY) return `${sM} / ${eM} ${sY}`;
      return `${sM} ${sY} / ${eM} ${eY}`;
    },
    [dates],
  );

  const onScroll = e => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const firstIndex = Math.floor(offsetX / dayWidth);
    setCurrentMonth(getMonthLabel(firstIndex));
  };

  useEffect(() => {
    dispatch(getProperty());
  }, [dispatch]);

  const filteredProperties = useMemo(() => {
    const list = Array.isArray(properties) ? properties : [];
    if (selectedProperty === 'all') return list.filter(p => getId(p));
    return list.filter(p => getId(p) === selectedProperty);
  }, [properties, selectedProperty]);

  return (
    <View style={styles.container}>
      {/* Dropdown */}
      <View style={styles.dropdownWrapper}>
        <Picker
          selectedValue={selectedProperty}
          onValueChange={val => setSelectedProperty(val)}
        >
          <Picker.Item label="All Properties" value="all" />
          {properties.map(p => (
            <Picker.Item
              key={getId(p)}
              label={p.title ?? '(no title)'}
              value={getId(p)}
            />
          ))}
        </Picker>
      </View>

      {/* Month header */}
      <View style={styles.monthHeaderRow}>
        <View style={{ width: PROP_COL_WIDTH }} />
        <View style={styles.monthHeaderCell}>
          <Text style={styles.monthText}>{currentMonth}</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.tableWrapper}>
        {/* Left column: Property names */}
        <View style={{ width: PROP_COL_WIDTH }}>
          <View
            style={[
              styles.headerRow,
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <Text style={{ fontWeight: '600' }}>Properties</Text>
          </View>

          <FlatList
            data={filteredProperties}
            keyExtractor={item => getId(item)}
            renderItem={({ item }) => (
              <View style={styles.leftRow}>
                <Text style={{ color: '#111' }} numberOfLines={1}>
                  {item.title ?? '(no title)'}
                </Text>
              </View>
            )}
            style={{
              maxHeight: ROW_HEIGHT * Math.min(10, filteredProperties.length),
            }}
          />
        </View>

        {/* Right side: days */}
        <ScrollView
          ref={scrollRef}
          horizontal
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={true}
          style={{ flex: 1 }}
        >
          <View>
            {/* Days header */}
            <View style={styles.headerRow}>
              {dates.map(d => (
                <View
                  key={d.toISOString()}
                  style={[styles.dayCell, { width: dayWidth }]}
                >
                  <Text style={styles.dayText}>
                    {d.toLocaleDateString(undefined, { weekday: 'short' })}
                  </Text>
                  <Text style={styles.dateText}>{d.getDate()}</Text>
                </View>
              ))}
            </View>

            {/* Property rows */}
            <FlatList
              data={filteredProperties}
              keyExtractor={item => `row-${getId(item)}`}
              renderItem={({ item }) => (
                <View style={[styles.row, { width: dayWidth * dates.length }]}>
                  {dates.map((d, idx) => (
                    <View
                      key={`${getId(item)}-${idx}`}
                      style={[styles.dayCell, { width: dayWidth }]}
                    >
                      <Text style={{ color: '#111' }}>
                        {item.baseRate ?? '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  dropdownWrapper: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    height: MONTH_HEADER_HEIGHT,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  monthHeaderCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontWeight: '600', color: '#111' },
  tableWrapper: { flexDirection: 'row', flex: 1 },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    height: DAY_HEADER_HEIGHT,
  },
  leftRow: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    height: ROW_HEIGHT,
  },
  dayCell: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: '#eee',
    height: ROW_HEIGHT,
    overflow: 'hidden',
  },
  dayText: { fontWeight: '600', color: '#111' },
  dateText: { fontSize: 12, color: '#555' },
});
