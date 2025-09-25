// src/components/MultiPropertyPicker.js
import React, { useMemo, useState, memo } from 'react';
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

  // Normalize -> get display label for an item
  const getLabel = (it) =>
    displayString(it.title ?? it.name ?? it.internal_name ?? it.property_title);

  // All item ids (normalized)
  const allIds = useMemo(
    () => items.map((it) => getId(it)).filter(Boolean),
    [items, getId]
  );

  // Trigger label
  const label = useMemo(() => {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) return noneLabel;
    if (selectedIds.length === 1) {
      const p = items.find((it) => getId(it) === selectedIds[0]);
      return p ? getLabel(p) : '1 selected';
    }
    return `${selectedIds.length} selected`;
  }, [selectedIds, items, getId, noneLabel]);

  // Filtered items based on search query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => getLabel(it).toLowerCase().includes(q));
  }, [items, query]);

  // Selected items appear on top (within filtered set), stable within groups
  const sortedItems = useMemo(() => {
    const selectedSet = new Set(selectedIds || []);
    const indexMap = new Map(filteredItems.map((it, i) => [getId(it), i]));
    const arr = [...filteredItems];
    arr.sort((a, b) => {
      const aId = getId(a);
      const bId = getId(b);
      const aSel = selectedSet.has(aId);
      const bSel = selectedSet.has(bId);
      if (aSel !== bSel) return aSel ? -1 : 1; // selected first
      const ia = indexMap.get(aId) ?? 0;
      const ib = indexMap.get(bId) ?? 0;
      return ia - ib; // original filtered order inside each group
    });
    return arr;
  }, [filteredItems, selectedIds, getId]);

  // Visible IDs (after filtering)
  const visibleIds = useMemo(
    () => sortedItems.map((it) => getId(it)).filter(Boolean),
    [sortedItems, getId]
  );

  // Whether all visible are selected
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => (selectedIds || []).includes(id));

  // Toggle a single id
  const toggle = (id) => {
    if (!id) return;
    const cur = new Set(selectedIds || []);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    onChange(Array.from(cur));
    if (autoCloseOnSelect) setOpen(false);
  };

  // Header toggle: Select/Clear all (scopes to visible list if searching)
  const allToggleLabel = allVisibleSelected ? 'Clear all' : 'Select all';
  const onPressAllToggle = () => {
    if (allVisibleSelected) {
      // remove all visible from selection
      const next = (selectedIds || []).filter((id) => !visibleIds.includes(id));
      onChange(next);
    } else {
      // add all visible to selection (union)
      const cur = new Set(selectedIds || []);
      for (const id of visibleIds) cur.add(id);
      onChange(Array.from(cur));
    }
  };

  const renderRow = ({ item }) => {
    const id = getId(item);
    if (!id) return null;
    const checked = (selectedIds || []).includes(id);
    return (
      <TouchableOpacity style={s.row} activeOpacity={0.8} onPress={() => toggle(id)}>
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
        activeOpacity={0.8}
        onPress={() => {
          setOpen(true);
          setQuery(''); // reset search each open (optional)
        }}
      >
        <Icon name="home-city" size={18} color="#0b486b" />
        <Text style={s.triggerText}>{'  '}{label}</Text>
        <Icon name="chevron-down" size={20} color="#0b486b" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Root container so backdrop and sheet are siblings */}
        <View style={s.modalRoot}>
          {/* Backdrop */}
          <Pressable style={s.backdrop} onPress={() => setOpen(false)} />

          {/* Sheet */}
          <View style={s.sheet}>
            {/* Title + Select/Clear all */}
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={onPressAllToggle} disabled={visibleIds.length === 0}>
                <Text style={[s.selectAll, visibleIds.length === 0 && { opacity: 0.4 }]}>
                  {allToggleLabel}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search box */}
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
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Icon name="close-circle" size={18} color="#8aa0ad" />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            {sortedItems.length === 0 ? (
              <View style={s.emptyState}>
                <Icon name="text-search" size={24} color="#9fb2bd" />
                <Text style={s.emptyText}>No properties match “{query}”.</Text>
              </View>
            ) : (
              <FlatList
                data={sortedItems}
                keyExtractor={(it) => String(getId(it))}
                ItemSeparatorComponent={() => (
                  <View
                    style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#e7eef3' }}
                  />
                )}
                renderItem={renderRow}
                keyboardShouldPersistTaps="handled"
              />
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.doneBtn}>
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

  // Modal layout
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
  searchInput: {
    flex: 1,
    color: '#17364a',
    paddingVertical: 0,
    fontWeight: '600',
  },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowText: { marginLeft: 10, color: '#17364a', fontWeight: '700', flex: 1 },

  emptyState: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  emptyText: { color: '#7f97a6', fontWeight: '700' },

  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0b86d0',
  },
  doneText: { color: '#fff', fontWeight: '900' },
});
