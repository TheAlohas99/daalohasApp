// src/components/MultiPropertyPicker.js
import React, { useMemo, useState, memo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { displayString } from '../utils/display';

function MultiPropertyPicker({
  items = [],
  selectedIds = [],
  onChange,
  getId,
  noneLabel = 'No properties selected',
  title = 'Select properties',
  confirmLabel = 'Done',
  autoCloseOnSelect = false,
  searchPlaceholder = 'Search properties…',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // const [loaded, setLoaded] = useState(false);

  //-------------------------------------------
  // 1️⃣ LOAD FROM ASYNC STORAGE (ONLY ONCE)
  //-------------------------------------------
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const saved = await AsyncStorage.getItem('multiPropertySelectedIds');
  //       if (saved) {
  //         onChange(JSON.parse(saved)); // apply saved selection
  //       }
  //     } catch (e) {
  //       console.warn('Failed to load saved properties', e);
  //     } finally {
  //       setLoaded(true);
  //     }
  //   })();
  // }, []);

  //-------------------------------------------
  // 2️⃣ DO NOT SAVE ANYTHING HERE ANYMORE
  //    (Removed second useEffect)
  //-------------------------------------------

  const getLabel = (it) =>
    displayString(it.title ?? it.name ?? it.internal_name ?? it.property_title);

  const label = useMemo(() => {
    if (selectedIds.length === 0) return noneLabel;
    if (selectedIds.length === 1) {
      const p = items.find((it) => getId(it) === selectedIds[0]);
      return p ? getLabel(p) : '1 selected';
    }
    return `${selectedIds.length} selected`;
  }, [selectedIds, items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => getLabel(it).toLowerCase().includes(q));
  }, [items, query]);

  const sortedItems = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const indexMap = new Map(filteredItems.map((it, i) => [getId(it), i]));

    const arr = [...filteredItems];
    arr.sort((a, b) => {
      const aId = getId(a);
      const bId = getId(b);
      const aSel = selectedSet.has(aId);
      const bSel = selectedSet.has(bId);

      if (aSel !== bSel) return aSel ? -1 : 1;

      return indexMap.get(aId) - indexMap.get(bId);
    });
    return arr;
  }, [filteredItems, selectedIds]);

  const visibleIds = sortedItems.map((it) => getId(it));
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      onChange(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      const newSet = new Set(selectedIds);
      visibleIds.forEach((id) => newSet.add(id));
      onChange([...newSet]);
    }
  };

  const toggle = (id) => {
    const cur = new Set(selectedIds);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    onChange([...cur]);

    if (autoCloseOnSelect) setOpen(false);
  };

  const renderRow = ({ item }) => {
    const id = getId(item);
    if (!id) return null;

    const checked = selectedIds.includes(id);

    return (
      <TouchableOpacity
        style={s.row}
        onPress={() => toggle(id)}
        activeOpacity={0.8}
      >
        <Icon
          name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={checked ? '#0b86d0' : '#6a7b88'}
        />
        <Text style={s.rowText}>{getLabel(item)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 }}>
      <TouchableOpacity
        style={s.trigger}
        onPress={() => {
          setOpen(true);
          setQuery('');
        }}
        activeOpacity={0.8}
      >
        <Icon name="home-city" size={18} color="#0b486b" />
        <Text style={s.triggerText}>{'  '}{label}</Text>
        <Icon name="chevron-down" size={20} color="#0b486b" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* MODAL */}
      <Modal visible={open} transparent animationType="fade">
        <View style={s.modalRoot}>
          <Pressable style={s.backdrop} onPress={() => setOpen(false)} />

          <View style={s.sheet}>
            {/* HEADER */}
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{title}</Text>
              <TouchableOpacity
                onPress={toggleAll}
                disabled={visibleIds.length === 0}
              >
                <Text
                  style={[
                    s.selectAll,
                    visibleIds.length === 0 && { opacity: 0.4 },
                  ]}
                >
                  {allVisibleSelected ? 'Clear all' : 'Select all'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SEARCH */}
            <View style={s.searchWrap}>
              <Icon name="magnify" size={18} color="#5f7686" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor="#90a4af"
                style={s.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Icon name="close-circle" size={18} color="#8aa0ad" />
                </TouchableOpacity>
              )}
            </View>

            {/* LIST */}
            {sortedItems.length === 0 ? (
              <View style={s.emptyState}>
                <Icon name="text-search" size={24} color="#9fb2bd" />
                <Text style={s.emptyText}>No properties match “{query}”.</Text>
              </View>
            ) : (
              <FlatList
                data={sortedItems}
                renderItem={renderRow}
                keyExtractor={(it) => String(getId(it))}
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: '#e7eef3',
                    }}
                  />
                )}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* DONE BUTTON (ONLY SAVE HERE) */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await AsyncStorage.setItem(
                      'multiPropertySelectedIds',
                      JSON.stringify(selectedIds)
                    );
                  } catch (e) {
                    console.warn('Failed to save', e);
                  }
                  setOpen(false);
                }}
                style={s.doneBtn}
              >
                <Text style={s.doneText}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default memo(MultiPropertyPicker);

const s = StyleSheet.create({
  trigger: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7e4ec',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
  },
  triggerText: { color: '#0b486b', fontWeight: '800' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },

  sheet: {
    maxHeight: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { flex: 1, color: '#0b486b', fontWeight: '900', fontSize: 16 },
  selectAll: { color: '#0b86d0', fontWeight: '900' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7e4ec',
    backgroundColor: '#f7fbfe',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: '#17364a', fontWeight: '600', paddingVertical: 0 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowText: { marginLeft: 10, color: '#17364a', fontWeight: '700', flex: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyText: { color: '#7f97a6', fontWeight: '700' },

  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0b86d0',
  },
  doneText: { color: '#fff', fontWeight: '900' },
});
