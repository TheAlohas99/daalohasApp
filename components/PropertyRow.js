import React, { memo, useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import SText from './SText';
import styles from '../styles/availabilityStyles';
import { SCROLL_THROTTLE } from '../constants/availability';
import getRangeTypeFn from '../helpers/getRangeType';
import { displayString } from '../utils/display';

const PropertyRow = memo(
  function PropertyRow({
    property,
    getId,
    dates,
    dayWidth,
    contentWidth,
    rowRefsRef,
    byPropDate,
    byPropCheckout,
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
      return () => {
        delete rowRefsRef.current[propId];
      };
    }, [propId, rowRefsRef]);

    const spans = spansByProp[propId] || [];

    const renderCell = (date, index) => {
      const dateKey = date._iso;
      const reservations = byPropDate[propId]?.[dateKey] ?? [];
      const hasBooked = reservations.length > 0;

      const checkoutList = byPropCheckout?.[propId]?.[dateKey] ?? [];
      const hasCheckout = checkoutList.length > 0;

      const rangeType = hasBooked
        ? useCustomRangeType
          ? useCustomRangeType(date, reservations)
          : getRangeTypeFn(date, reservations)
        : null;

      const Wrapper = hasBooked ? TouchableOpacity : View;
      const props = hasBooked
        ? { activeOpacity: 0.85, onPress: () => openCellModal(propId, dateKey) }
        : {};

      // console.log(props)
      return (
        <Wrapper
          key={`${propId}-${dateKey}`}
          style={[
            styles.cell,
            { width: dayWidth },
            index === selectedDateIndex && styles.cellSelected,
          ]}
          {...props}
        >
          {/* Occupied nights bar */}
          {rangeType && (
            <View
              style={[
                styles.rangeBarBase,
                rangeType === 'start' && styles.rangeStart, // right half
                rangeType === 'middle' && styles.rangeMiddle, // full
                rangeType === 'end' && styles.rangeEnd, // full (last night)
                rangeType === 'single' && styles.rangeSingle, // right half
              ]}
            />
          )}

          {/* Checkout day left half */}
          {hasCheckout && (
            <View pointerEvents="none" style={styles.checkoutHalfLeft} />
          )}

          {/* Availability indicator */}
          {hasBooked ? (
            <SText style={[styles.smallAvail, styles.smallAvailBooked]}>
              0
            </SText>
          ) : (
            <SText
              style={[
                styles.smallAvail,
                styles.smallAvailFree,
                {
                  backgroundColor: '#0b86d0',
                  color: '#fff',
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  textAlign: 'center',
                  lineHeight: 20,
                  fontWeight: '900',
                  overflow: 'hidden',
                  alignSelf: 'center',
                },
              ]}
            />
          )}
        </Wrapper>
      );
    };

    return (
      <View style={[styles.propertyGroup, styles.rowBorder]}>
        {/* Property band */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.propertyBand}
          // onPress={() => {
          //   const currentDate = dates[selectedDateIndex];
          //   if (currentDate) {
          //     const dateKey = currentDate._iso || currentDate.toISOString().slice(0, 10);
          //     openCellModal(propId, dateKey);
          //   }
          // }}
        >
          <SText style={styles.propertyBandText} numberOfLines={2}>
            {displayString(
              property.title ??
                property.name ??
                property.internal_name ??
                property.property_title,
            )}
          </SText>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.bandDivider} />

        {/* Scroll-synced row */}
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
          <View style={{ width: contentWidth, height: 72, paddingBottom: 1 }}>
            {/* cells row */}
            <View style={{ flexDirection: 'row' }}>
              {dates.map(renderCell)}
            </View>

            {/* vertical separators */}
            <View
              pointerEvents="none"
              style={[styles.separatorsOverlay, { width: contentWidth }]}
            >
              {dates.map((_, idx) => {
                if (idx === 0) return null;
                const left = idx * dayWidth;
                return (
                  <View
                    key={`sep-${propId}-${idx}`}
                    style={[styles.separatorLine, { left }]}
                  />
                );
              })}
            </View>

            {/* name pills from mid-checkin to mid-checkout, vertically centered */}
            <View
              pointerEvents="box-none"
              style={[styles.pillOverlay, { width: contentWidth }]}
            >
              {spans.map(span => {
                // midpoints
                const checkinMidX =
                  span.startIndex * dayWidth + 6 + dayWidth / 2;
                const checkoutMidX =
                  (span.startIndex + span.nights) * dayWidth + 6 + dayWidth / 2;

                // left & width so pill spans exactly mid→mid
                const left = checkinMidX;
                const rawWidth = checkoutMidX - checkinMidX; // equals nights * dayWidth
                const maxWidth = Math.max(0, contentWidth - left - 6);
                const width = Math.max(22, Math.min(rawWidth, maxWidth));

                return (
                  <TouchableOpacity
                    key={span.key}
                    activeOpacity={0.9}
                    onPress={() => openCellModal(propId, span.dateKey)}
                    style={[
                      styles.namePill,
                      { left, width, backgroundColor: span.color },
                    ]}
                  >
                    <SText
                      style={[styles.namePillText, { color: '#fff' }]}
                      numberOfLines={1}
                    >
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
  },
  (prev, next) => {
    const idPrev = prev.getId(prev.property);
    const idNext = next.getId(next.property);
    return idPrev === idNext;
  },
);

export default PropertyRow;
