import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    // lets children (sheet) receive touches without the container blocking them
    pointerEvents: 'box-none',
  },

  // full-screen pressable behind the sheet
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    backgroundColor: '#fff',
    height: '98%',
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 0,
    zIndex: 1,
    elevation: 10, // Android stacking + shadow
  },

  // Header
  headerWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 0,
    paddingBottom: 6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  headerBtn: { padding: 8, marginRight: 4 },
  headerSub: { color: '#6a7b88', fontWeight: '700', marginLeft: 4 },
  headerTitle: { color: '#0b486b', fontSize: 20, fontWeight: '900', lineHeight: 28 },

  // Scroll area
  scroll: { flex: 1 },

  // KPI
  kpiRow: { flexDirection: 'row', columnGap: 16, marginTop: 8, marginBottom: 12, justifyContent: 'center' },
  kpiItem: { flexDirection: 'row', alignItems: 'center' },
  kpiText: { color: '#1a2e3b', fontWeight: '800', marginLeft: 6 },

  // Check panel
  checkPanel: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#0b86d0', borderRadius: 12, overflow: 'hidden' },
  checkCol: { flex: 1, paddingLeft:12, paddingRight:12, paddingBottom:5, paddingTop:5 },
  checkDivider: { width: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  inlineRow: { flexDirection: 'row', alignItems: 'center' },
  checkLabel: { color: '#cde9fb', fontWeight: '800', marginBottom: 2 },
  checkDate: { color: '#fff', fontWeight: '900', fontSize: 18 },

  // Money
  moneyRow: { flexDirection: 'row', marginTop: 1, columnGap: 16 },
  moneyCol: { flex: 1, paddingVertical: 8 },
  moneyBigGreen: { color: '#19a464', fontWeight: '900', fontSize: 17 },
  moneyBig: { color: '#0b486b', fontWeight: '900', fontSize: 17 },
  moneyCaption: { color: '#6a7b88', marginTop: 1, fontWeight: '700' },

  // Section
  section: { marginTop: 2,  paddingLeft:12, paddingRight:12, paddingBottom:5, paddingTop:5, backgroundColor: '#f6fbff', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e7eef3' },
  sectionTitle: { color: '#506070', fontWeight: '900', marginBottom: 6 },
  sectionValue: { color: '#17364a', fontWeight: '700' },

  // Booker card
  card: { marginTop: 5, borderWidth: 1, borderColor: '#e7eef3', borderRadius: 12, paddingLeft:12, paddingRight:12, paddingBottom:5, paddingTop:5, backgroundColor: '#fafcfe' },
  cardHeader: { color: '#6a7b88', fontWeight: '800', marginBottom: 2 },
  bookerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#d8eefc', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarLetters: { color: '#0b486b', fontWeight: '900' },
  bookerName: { color: '#0b486b', fontWeight: '900', fontSize: 16 },
  badgeRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, backgroundColor: '#eef6ff', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeMuted: { color: '#4b5a67', fontWeight: '900' },
  badgeValue: { color: '#0b486b', fontWeight: '900' },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#e7eef3' },
  rowLabel: { color: '#506070', fontWeight: '800' },
  rowValue: { color: '#17364a', fontWeight: '800' },

  // Others list
  smallCard: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: '#f8fcff', borderWidth: StyleSheet.hairlineWidth, borderColor: '#e7eef3' },
  otherTitle: { color: '#0b486b', fontWeight: '900' },
  otherSub: { color: '#5a6a77', fontWeight: '700', marginTop: 2 },
  otherMoney: { color: '#0b486b', fontWeight: '900', marginTop: 4 },

  // Actions
  actionRow: { marginTop: 3, flexDirection: 'row', columnGap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  actionBtnPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  checkInBtn: { backgroundColor: '#19a464' },
  checkOutBtn: { backgroundColor: '#e74c3c' },
  actionIcon: { width: 25, height: 25, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionTextWrap: { flex: 1 },
  actionTitle: { color: '#fff', fontWeight: '900', fontSize: 13, includeFontPadding: false },
  actionSubtitle: { color: '#ffffffcc', fontWeight: '700', fontSize: 10, marginTop: 2, includeFontPadding: false },
});
