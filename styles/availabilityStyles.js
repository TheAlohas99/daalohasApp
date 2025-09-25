import { StyleSheet } from 'react-native';
import { RANGE_BAR_HEIGHT } from '../constants/availability';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecececff' },

  monthHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e6eef3',
    paddingHorizontal: 6,
  },
  monthNav: { width: 56, height: 26, alignItems: 'center', justifyContent: 'center' },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthTitle: { fontSize: 20, fontWeight: '700', color: '#0b486b' },

  dayHeaderCell: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#8d8d8dff',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  dayHeaderCellSelected: { backgroundColor: '#0b86d0' },
  weekdayText: { fontSize: 12, fontWeight: '700', color: '#51616e' },
  dateBadge: {
    marginTop: 4, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f4f7',
  },
  dateBadgeSelected: { backgroundColor: '#fff' },
  dateBadgeText: { fontSize: 13, color: '#111', fontWeight: '800' },
  dateBadgeTextSelected: { color: '#0b486b' },

  // Existing row wrapper
  propertyGroup: {
    marginTop: 1,
    paddingBottom: 1,
    borderBottomWidth: 1,
    borderColor: '#000000ff',
    borderWidth: 1,
  },

  // Crisp hairline divider under each row
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#decfcfff',
    borderWidth: 1,
  },

  // Line between the blue band and the grid
  bandDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#191919ff',
  },

  propertyBand: { backgroundColor: '#0b486b', paddingVertical: 10, paddingHorizontal: 12 },
  propertyBandText: { color: '#fff', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' },

  cell: {
    height: 72,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#e9f1f6',
    paddingTop: 6,
    paddingHorizontal: 6,
    justifyContent: 'flex-start',
    backgroundColor: '#f8fcff',
  },
  cellSelected: { backgroundColor: '#d9efff', borderColor: '#0b86d0', borderWidth: 1 },
  smallAvail: { position: 'absolute', top: 6, left: 8, fontSize: 14, fontWeight: '800' },
  smallAvailBooked: { color: '#d43f3f' },
  smallAvailFree: { color: '#19a464' },

  rangeBarBase: { position: 'absolute', top: 0, height: RANGE_BAR_HEIGHT, backgroundColor: '#0b9bf0', zIndex: 2 },
  rangeStart: {
    left: '50%', right: -1,
    borderTopRightRadius: RANGE_BAR_HEIGHT,
    borderBottomRightRadius: RANGE_BAR_HEIGHT,
  },
  rangeMiddle: { left: -1, right: -1 },
  rangeEnd: {
    left: -1, right: '50%',
    borderTopLeftRadius: RANGE_BAR_HEIGHT,
    borderBottomLeftRadius: RANGE_BAR_HEIGHT,
  },
  rangeSingle: { left: -1, right: -1, borderRadius: RANGE_BAR_HEIGHT },

  // NEW: vertical day separators (sit above range bars, below pills)
  separatorsOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 72,
    zIndex: 3,
  },
  separatorLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#b5b5b5ff',
    borderWidth: 0.4
  },

  pillOverlay: { position: 'absolute', left: 0, top: 0, height: 72, zIndex: 4, pointerEvents: 'box-none' },
  namePill: {
    position: 'absolute', bottom: 6, height: 26, borderRadius: 13, paddingHorizontal: 10,
    backgroundColor: '#e45458', alignItems: 'center', justifyContent: 'center',
  },
  namePillText: { color: '#fff', fontWeight: '800', fontSize: 13, maxWidth: '100%' },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
