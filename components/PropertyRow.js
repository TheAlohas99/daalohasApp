import React, { memo, useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import SText from './SText';
import styles from '../styles/availabilityStyles';
import { SCROLL_THROTTLE } from '../constants/availability';
import getRangeTypeFn from '../helpers/getRangeType';
import { displayString } from '../utils/display';

const PropertyRow = memo(function PropertyRow({
  property,
  getId,
  dates,
  dayWidth,
  contentWidth,
  rowRefsRef,
  byPropDate,
  spansByProp,
  selectedDateIndex,
  openCellModal,
  syncTo,
  useCustomRangeType,
}) {
  const propId = getId(property);

  // keep a ref per-row so we can sync scroll positions
  const rowRef = useRef(null);
  useEffect(() => {
    rowRefsRef.current[propId] = rowRef.current;
    return () => { delete rowRefsRef.current[propId]; };
  }, [propId, rowRefsRef]);

  const spans = spansByProp[propId] || [];

  const renderCell = (date, index) => {
    const dateKey = date._iso;
    const reservations = byPropDate[propId]?.[dateKey] ?? [];
    const hasBooked = reservations.length > 0;
    const availabilityText = hasBooked ? '0' : '1';

    const rangeType = hasBooked
      ? (useCustomRangeType ? useCustomRangeType(date, reservations) : getRangeTypeFn(date, reservations))
      : null;

    const Wrapper = hasBooked ? TouchableOpacity : View;
    const props = hasBooked ? { activeOpacity: 0.85, onPress: () => openCellModal(propId, dateKey) } : {};

    return (
      <Wrapper
        key={`${propId}-${dateKey}`}
        style={[styles.cell, { width: dayWidth }, index === selectedDateIndex && styles.cellSelected]}
        {...props}
      >
        {rangeType && (
          <View
            style={[
              styles.rangeBarBase,
              rangeType === 'start' && styles.rangeStart,
              rangeType === 'middle' && styles.rangeMiddle,
              rangeType === 'end' && styles.rangeEnd,
              rangeType === 'single' && styles.rangeSingle,
            ]}
          />
        )}
        <SText
          style={[
            styles.smallAvail,
            hasBooked ? styles.smallAvailBooked : styles.smallAvailFree,
          ]}
        >
          {availabilityText}
        </SText>
      </Wrapper>
    );
  };

  return (
    // Added crisp row border
    <View style={[styles.propertyGroup, styles.rowBorder]}>
      {/* Property name — tappable to open details for the selected date */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.propertyBand}
        onPress={() => {
          const currentDate = dates[selectedDateIndex];
          if (currentDate) {
            const dateKey = currentDate._iso || currentDate.toISOString().slice(0, 10);
            openCellModal(propId, dateKey);
          }
        }}
      >
        <SText style={styles.propertyBandText} numberOfLines={2}>
          {displayString(
            property.title ??
            property.name ??
            property.internal_name ??
            property.property_title
          )}
        </SText>
      </TouchableOpacity>

      {/* Subtle line between band and grid */}
      <View style={styles.bandDivider} />

      {/* Scroll-synced calendar row + overlay pills */}
      <ScrollView
        ref={rowRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: contentWidth }}
        onScroll={e => syncTo(e.nativeEvent.contentOffset.x, propId)}
        snapToInterval={dayWidth}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={SCROLL_THROTTLE}
      >
        <View style={{ width: contentWidth, height: 72, paddingBottom: 1}}>
          {/* cells row */}
          <View style={{ flexDirection: 'row' }}>
            {dates.map(renderCell)}
          </View>

          {/* NEW: vertical separators above range bars, below pills */}
          <View
            pointerEvents="none"
            style={[styles.separatorsOverlay, { width: contentWidth }]}
          >
            {dates.map((_, idx) => {
              if (idx === 0) return null; // boundary lines between days only
              const left = idx * dayWidth;
              return (
                <View
                  key={`sep-${propId}-${idx}`}
                  style={[styles.separatorLine, { left }]}
                />
              );
            })}
          </View>

          {/* name pills overlay */}
          <View pointerEvents="box-none" style={[styles.pillOverlay, { width: contentWidth }]}>
            {spans.map(span => {
              const left = span.startIndex * dayWidth + 6;
              const width = Math.max(22, span.nights * dayWidth - 12);
              return (
                <TouchableOpacity
                  key={span.key}
                  activeOpacity={0.9}
                  onPress={() => openCellModal(propId, span.dateKey)}
                  style={[styles.namePill, { left, width }]}
                >
                  <SText style={styles.namePillText} numberOfLines={1}>
                    {span.name}
                  </SText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}, (prev, next) => {
  const idPrev = prev.getId(prev.property);
  const idNext = next.getId(next.property);
  return idPrev === idNext;
});

export default PropertyRow;
