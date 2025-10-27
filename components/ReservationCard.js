import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
/* -------------------- channel color -------------------- */
export const getChannelColor = name => {
  const n = String(name || '').toLowerCase();
  if (n.includes('airbnb')) return '#FF5A5F';
  if (n.includes('alohas')) return '#7EC8FF';
  if (n.includes('make') || n.includes('makemytrip')) return '#2ECC71';
  if (n.includes('direct')) return '#FF8A80';
  if (n.includes('agoda')) return '#FFA500';
  if (n.includes('booking')) return '#003580';
  if (n) return '#9B59B6';
  return '#9B59B6';
};

/* -------------------- helpers (exported for reuse) -------------------- */
export const ymdLocal = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const toYmd = v => {
  if (!v) return '';
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const t = new Date(v);
    return isNaN(t) ? '' : ymdLocal(t);
  }
  return ymdLocal(v);
};

const monthShort = i =>
  [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][i] || '';

export const parseDateParts = yyyyMmDd => {
  const [y, m, d] = (yyyyMmDd || '').split('-').map(Number);
  if (!y || !m || !d) return { d: '', mon: '', y: '' };
  return { d: String(d), mon: monthShort(m - 1), y: String(y) };
};

export const daysBetween = (start, end) => {
  try {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
};

export const nnum = v => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  if (v && typeof v === 'object') {
    if (v.$numberInt) return Number(v.$numberInt);
    if (v.$numberDouble) return Number(v.$numberDouble);
  }
  return 0;
};

export const firstName = name => {
  if (!name) return '—';
  const s = String(name).trim();
  const [first] = s.split(/\s+/);
  return first || s;
};

const ReservationCard = React.memo(function ReservationCard({
  item,
  onPress,
  showChannelChip = true,
  showCounts = true,
  style,
}) {
  // Dates
  const ci = useMemo(
    () =>
      toYmd(
        item?.check_in_date ||
          item?.checkin_date ||
          item?.checkInDate ||
          item?.start_date,
      ),
    [item?._id, item?.reservation_id],
  );
  const co = useMemo(
    () =>
      toYmd(
        item?.check_out_date ||
          item?.checkout_date ||
          item?.checkOutDate ||
          item?.end_date,
      ),
    [item?._id, item?.reservation_id],
  );

  const { d: d1, mon: m1, y: y1 } = parseDateParts(ci);
  const { d: d2, mon: m2, y: y2 } = parseDateParts(co);

  // Counts
  const adults = nnum(item?.adults ?? item?.adult_count);
  const children = nnum(item?.children ?? item?.child_count);
  const persons = Math.max(1, adults + children);
  const nights = daysBetween(ci, co);

  // Labels
  const property =
    item?.property_title ||
    item?.property?.name ||
    item?.propertyTitle ||
    item?.property ||
    'Property';
  const booker = firstName(
    item?.booker_first_name ||
      item?.guestName ||
      item?.primary_guest ||
      item?.customer_name,
  );
  const channel = item?.channel_name || item?.channel || item?.source || '';
  const chipColor = getChannelColor(channel);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#eef3f7' }}
      style={[styles.card, style]}
    >
      <View style={styles.dateRail}>
        <Text style={styles.dateBig}>
          {d1} <Text style={styles.dateMon}>{m1}</Text>
        </Text>
        <View style={styles.dateDivider} />
        <Text style={styles.dateSmall}>
          {d2} <Text style={styles.dateMon}>{m2}</Text>
        </Text>
        <Text style={styles.dateYear}>{y2 || y1}</Text>

        {showCounts && (
          <>
            <View style={{ height: 8 }} />
            <View style={styles.iconRow}>
              <Icon name="account-outline" size={16} color="#0b86d0" />
              <Text style={styles.iconTxt}>{persons}</Text>
              <Icon
                name="moon-waning-crescent"
                size={16}
                color="#0b86d0"
                style={{ marginLeft: 8 }}
              />
              <Text style={styles.iconTxt}>{nights}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.cardBody}>
        {!!channel && showChannelChip && (
          <View style={[styles.channelChip, { backgroundColor: chipColor }]}>
            <Text style={styles.channelChipText}>{channel}</Text>
          </View>
        )}

        <Text style={styles.unitTitle}>{property}</Text>
        <Text style={styles.booker}>Booked by: {booker}</Text>

        {item?.total_amount != null && (
          <View style={[styles.datesRow, { marginTop: 4 }]}>
            <Icon name="currency-inr" size={16} color="#0b86d0" />
            <Text style={[styles.datesText, { color: '#0b86d0' }]}>
              {Number(item.total_amount)
                ? Number(item.total_amount).toLocaleString()
                : '0'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

export default ReservationCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebf1f6',
    overflow: 'hidden',
  },

  // Left rail
  dateRail: {
    width: 88,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#f2f5f8',
    alignItems: 'flex-start',
  },
  dateBig: { fontSize: 16, fontWeight: '900', color: '#17364a' },
  dateSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: '#17364a',
    marginTop: 6,
  },
  dateMon: { color: '#17364a', fontWeight: '700' },
  dateYear: { marginTop: 2, color: '#6b7a87', fontWeight: '700' },
  dateDivider: {
    width: 12,
    height: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#0b86d0',
    marginVertical: 4,
    marginLeft: 6,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  iconTxt: { color: '#0b86d0', fontWeight: '800', marginLeft: 4 },

  // Right body
  cardBody: { flex: 1, padding: 12 },

  channelChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  channelChipText: { color: '#ffffff', fontWeight: '800' },

  unitTitle: { fontSize: 16, fontWeight: '900', color: '#17364a' },
  booker: { marginTop: 2, color: '#6b7a87', fontWeight: '700' },

  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  datesText: { color: '#17364a', fontWeight: '700' },
});
