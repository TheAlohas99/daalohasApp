// AvailabilityScreen.js
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import { getProperty } from '../redux/slice/PropertySlice';

const PROP_COL_WIDTH = 160;
const DAY_RANGE = 180;
const MONTH_HEADER_HEIGHT = 24;
const DAY_HEADER_HEIGHT = 48;
const CELL_HEIGHT = 40;

export default function AvailabilityScreen() {
  const dispatch = useDispatch();
  const { data: properties = [] } = useSelector(state => state.property);

  const screenWidth = Dimensions.get('window').width;
  const dayWidth = (screenWidth - PROP_COL_WIDTH) / 7;
  const scrollRef = useRef(null);

  const [selectedProperty, setSelectedProperty] = useState('all');

  // Generate date range
  const dates = useMemo(() => {
    const today = new Date();
    const list = [];
    for (let i = -DAY_RANGE; i <= DAY_RANGE; i++) {
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
    index => {
      const start = dates[index];
      const end = dates[index + 6];
      if (!start || !end) return '';
      const startMonth = start.toLocaleDateString(undefined, {
        month: 'short',
      });
      const startYear = start.getFullYear();
      const endMonth = end.toLocaleDateString(undefined, { month: 'short' });
      const endYear = end.getFullYear();
      if (startMonth === endMonth && startYear === endYear) {
        return `${startMonth} ${startYear}`;
      }
      if (startYear === endYear) {
        return `${startMonth} / ${endMonth} ${startYear}`;
      }
      return `${startMonth} ${startYear} / ${endMonth} ${endYear}`;
    },
    [dates],
  );

  useEffect(() => {
    if (scrollRef.current) {
      const index = DAY_RANGE;
      scrollRef.current.scrollTo({ x: dayWidth * index, animated: false });
      setCurrentMonth(getMonthLabel(index));
    }
  }, [dayWidth, getMonthLabel]);

  const onScroll = e => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const firstIndex = Math.floor(offsetX / dayWidth);
    setCurrentMonth(getMonthLabel(firstIndex));
  };

  useEffect(() => {
    dispatch(getProperty());
  }, [dispatch]);

  const filteredProperties =
  selectedProperty === 'all'
    ? properties.filter(p => p && p._id) 
    : properties.filter(p => p && p._id === selectedProperty);


  console.log('filteredProperties', filteredProperties);

  return (
    <View style={styles.container}>
      {/* Dropdown */}
      <View style={styles.dropdownWrapper}>
        <Picker
          selectedValue={selectedProperty}
          onValueChange={itemValue => setSelectedProperty(itemValue)}
        >
          <Picker.Item label="All Properties" value="all" />
          {properties.map(p => (
            <Picker.Item key={p._id} label={p.title || p.name} value={p._id} />
          ))}
        </Picker>
      </View>

      {/* Calendar Table */}
      <View style={{ flex: 1 }}>
        <View style={styles.monthHeaderRow}>
          <View style={{ width: PROP_COL_WIDTH }} />
          <View style={styles.monthHeaderCell}>
            <Text style={styles.monthText}>{currentMonth}</Text>
          </View>
        </View>

        <View style={styles.tableWrapper}>
          <ScrollView
            ref={scrollRef}
            horizontal
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
          >
            <View>
              {/* Days Header */}
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

              {/* Properties Rows */}
              {filteredProperties.map(p => (
              <View
                key={p._id}
                style={[styles.row, { width: dayWidth * dates.length }]}
              >
                {dates.map((d, idx) => (
                  <View
                    key={idx}
                    style={[styles.dayCell, { width: dayWidth }]}
                  >
                    <Text>{p.baseRate ?? '-'}</Text>
                  </View>
                ))}
              </View>
            ))}
            </View>
          </ScrollView>
        </View>
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
  monthHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableWrapper: { flexDirection: 'row' },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    height: DAY_HEADER_HEIGHT,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    position: 'relative',
    height: CELL_HEIGHT,
  },
  dayCell: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: '#eee',
    height: CELL_HEIGHT,
    overflow: 'hidden',
  },
  dayText: { fontWeight: '600' },
  dateText: { fontSize: 12, color: '#555' },
  monthText: { fontWeight: '600' },
});
