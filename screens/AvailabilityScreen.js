import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { useDispatch, useSelector } from 'react-redux';
import { getProperty } from '../redux/slice/PropertySlice';

const properties = [
  { id: 1, name: 'Tranquil Peaks Penthouse', baseRate: 7100 },
  { id: 2, name: 'Hibiscus Oasis - EL REINO L2', baseRate: 7500 },
  { id: 3, name: 'El Reino L2 - 2 BHK', baseRate: 5200 },
];

const PROP_COL_WIDTH = 160;
const DAY_RANGE = 180;
const MONTH_HEADER_HEIGHT = 24;
const DAY_HEADER_HEIGHT = 48;
const CELL_HEIGHT = 40;

export default function AvailabilityScreen() {
  const dispatch = useDispatch();
  const { data } = useSelector((state) => state.property);

  const screenWidth = Dimensions.get('window').width;
  const dayWidth = (screenWidth - PROP_COL_WIDTH) / 7;
  const scrollRef = useRef(null);

  // 🔽 dropdown state
  const [selectedProperty, setSelectedProperty] = useState("all");

  const dates = useMemo(() => {
    const today = new Date();
    const list = [];
    for (let i = -DAY_RANGE; i <= DAY_RANGE; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const reservations = [
    {
      guest: 'Ankush',
      start: new Date('2025-09-10'),
      end: new Date('2025-09-13'),
    },
    {
      guest: 'Sumit',
      start: new Date('2025-09-20'),
      end: new Date('2025-09-24'),
    },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
  const [currentMonth, setCurrentMonth] = useState(todayLabel);

  const getMonthLabel = useCallback(
    (index) => {
      const start = dates[index];
      const end = dates[index + 6];
      if (!start || !end) return '';
      const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
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
    [dates]
  );

  useEffect(() => {
    if (scrollRef.current) {
      const index = DAY_RANGE;
      scrollRef.current.scrollTo({ x: dayWidth * index, animated: false });
      setCurrentMonth(getMonthLabel(index));
    }
  }, [dayWidth, getMonthLabel]);

  const onScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const firstIndex = Math.floor(offsetX / dayWidth);
    setCurrentMonth(getMonthLabel(firstIndex));
  };

  const isReserved = (date) =>
    reservations.find((r) => date >= r.start && date <= r.end);

  useEffect(() => {
    dispatch(getProperty());
  }, [dispatch]);

  const filteredProperties =
    selectedProperty === "all"
      ? properties
      : properties.filter((p) => p.id === selectedProperty);

  return (
    <View style={styles.container}>
      {/* 🔽 Dropdown */}
      {/* <View style={styles.dropdownWrapper}>
        <Picker
          selectedValue={selectedProperty}
          onValueChange={(itemValue) => setSelectedProperty(itemValue)}
        >
          <Picker.Item label="All Properties" value="all" />
          {properties.map((p) => (
            <Picker.Item key={p.id} label={p?.name} value={p.id} />
          ))}
        </Picker>
      </View> */}
      <View>
        {
          data.map((prop)=>{
            return(
              <Text>{prop.title}</Text>
            )
          })
        }
      </View>

      {/* Month Header */}
      <View style={styles.monthHeaderRow}>
        <View style={{ width: PROP_COL_WIDTH }} />
        <View style={styles.monthHeaderCell}>
          <Text style={styles.monthText}>{currentMonth}</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.tableWrapper}>
        <View style={styles.propColumn}>
          <View style={styles.dayPlaceholder} />
          {filteredProperties.map((p) => (
            <View key={p.name} style={styles.propCell}>
              <Text style={styles.propText}>{p.name}</Text>
            </View>
          ))}
        </View>
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
              {dates.map((d) => (
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
            {filteredProperties.map((p, pIdx) => (
              <View
                key={p.name}
                style={[styles.row, { width: dayWidth * dates.length }]}
              >
                {dates.map((d, idx) => {
                  const reservation = pIdx === 0 ? isReserved(d) : null;
                  return (
                    <View
                      key={idx}
                      style={[styles.dayCell, { width: dayWidth }]}
                    >
                      {!reservation && <Text>{p.baseRate}</Text>}
                    </View>
                  );
                })}

                {/* Reservation bars only for first property */}
                {pIdx === 0 &&
                  reservations.map((res) => {
                    const startIndex = dates.findIndex(
                      (d) => d.toDateString() === res.start.toDateString()
                    );
                    const endIndex = dates.findIndex(
                      (d) => d.toDateString() === res.end.toDateString()
                    );
                    if (startIndex === -1 || endIndex === -1) return null;
                    const left = startIndex * dayWidth + dayWidth / 2;
                    const width = (endIndex - startIndex) * dayWidth;
                    return (
                      <View
                        key={res.guest}
                        style={[styles.reservationBar, { left, width }]}
                      >
                        <Text style={styles.resText}>{res.guest}</Text>
                      </View>
                    );
                  })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* <Text>{JSON.stringify(data, null, 2)}</Text> */}
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
  propColumn: { width: PROP_COL_WIDTH },
  dayPlaceholder: {
    height: DAY_HEADER_HEIGHT,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  monthText: { fontWeight: '600' },
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
  propCell: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#eee',
    height: CELL_HEIGHT,
    justifyContent: 'center',
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
  propText: { fontWeight: '500', fontSize: 12 },
  reservationBar: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#78ea72ff',
    justifyContent: 'center',
    paddingLeft: 4,
    borderRadius: 5,
  },
  resText: { fontSize: 10, fontWeight: '500' },
});
