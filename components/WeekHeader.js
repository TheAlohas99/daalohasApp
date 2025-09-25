import React, { memo } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import SText from './SText';
import styles from '../styles/availabilityStyles';
import { SCROLL_THROTTLE } from '../constants/availability';

const WeekHeader = memo(function WeekHeader({
  headerRef,
  dates,
  dayWidth,
  selectedDateIndex,
  setSelectedDateIndex,
  syncTo,
  contentWidth,
}) {
  const headerContentStyle = { width: contentWidth };
  return (
    <ScrollView
      ref={headerRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={headerContentStyle}
      onScroll={e => syncTo(e.nativeEvent.contentOffset.x, 'header')}
      snapToInterval={dayWidth}
      decelerationRate="fast"
      bounces={false}
      overScrollMode="never"
      scrollEventThrottle={SCROLL_THROTTLE}
    >
      <View style={{ flexDirection: 'row', height: 80 }}>
        {dates.map((item, index) => {
          const selected = index === selectedDateIndex;
          return (
            <TouchableOpacity
              key={item._iso}
              onPress={() => setSelectedDateIndex(index)}
              activeOpacity={0.8}
              style={[styles.dayHeaderCell, { width: dayWidth }, selected && styles.dayHeaderCellSelected]}
            >
              <SText style={[styles.weekdayText, selected && { color: '#fff' }]}>
                {item.toLocaleDateString(undefined, { weekday: 'short' })}
              </SText>
              <View style={[styles.dateBadge, selected && styles.dateBadgeSelected]}>
                <SText style={[styles.dateBadgeText, selected && styles.dateBadgeTextSelected]}>
                  {item.getDate()}
                </SText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
});

export default WeekHeader;
