import { StyleSheet, Platform, StatusBar } from 'react-native';

export default StyleSheet.create({
//   safe: {
//     flex: 1,
//     backgroundColor: '#f9f9f9',
//     paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
//   },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  errorText: { color: 'red', fontSize: 16 },

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
  pillLabel: { fontSize: 12, fontWeight: '600' },
  pillCount: { fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  text: { fontSize: 14, color: '#555' },
  subText: { fontSize: 12, color: '#777' },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
    alignItems: 'center',
  },

  buttonSmall: {
    backgroundColor: 'tomato',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', fontWeight: '600' },

  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2a6285ff',
    width: 70,
    height: 70,
    borderRadius: 50,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

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

  closeButton: {
    backgroundColor: 'tomato',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: { color: '#fff', fontWeight: '600' },

  button: {
    marginTop: 10,
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
});
