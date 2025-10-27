import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const BRAND = {
    primary: '#0b86d0',
    primaryDark: '#0b486b',
    card: '#ffffff',
    text: '#17364a',
    muted: '#65798a',
    border: '#e2e8f0',
};

function moneyINR(n) {
    const num = Number(n || 0);
    return num.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    });
}


export default function SixMonthSummaryTable({ data, selectedMonth, onSelectMonth }) {

    const renderHeader = () => (
        <View style={[styles.rowContainer, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.monthCell]}>Month</Text>
            <Text style={[styles.cell, styles.headerCell, styles.reservationCell]}>No. Res.</Text>
            <Text style={[styles.cell, styles.headerCell, styles.amountCell]}>Amount</Text>
        </View>
    );

    console.log(data)

    const renderItem = ({ item }) => {
        const isSelected = selectedMonth?.monthLabel === item.monthLabel;
        console.log(item)

        return (
            <TouchableOpacity
                key={`${item.year}-${item.month}`}
                style={[styles.rowContainer, isSelected && styles.rowSelected]}
                onPress={() => onSelectMonth(item)}
            >
                <Text style={[styles.cell, styles.monthCell, isSelected && styles.textSelected]}>
                    {item.monthLabel}
                </Text>
                <Text style={[styles.cell, styles.reservationCell, isSelected && styles.textSelected]}>
                    {item.totalReservation || 0}
                </Text>
                <Text style={[styles.cell, styles.amountCell, isSelected && styles.textSelected]}>
                    {moneyINR(item.totalAmount)}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Last 6 Months Summary</Text>
            {renderHeader()}
            {/* Using FlatList for scrollability and performance */}
            <FlatList
                data={data}
                keyExtractor={item => `${item.year}-${item.month}`}
                renderItem={renderItem}
                scrollEnabled={false} // Since there are only 6 items, scroll is not necessary
                ListEmptyComponent={<Text style={styles.emptyText}>No summary data available.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: BRAND.card,
        marginVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BRAND.border,
        overflow: 'hidden',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: BRAND.text,
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: BRAND.border,
    },
    rowContainer: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: BRAND.border,
    },
    headerRow: {
        backgroundColor: '#f9f9f9',
    },
    rowSelected: {
        backgroundColor: BRAND.primary, // Highlight selected row
    },
    cell: {
        paddingHorizontal: 10,
        fontSize: 14,
        color: BRAND.text,
    },
    headerCell: {
        fontWeight: '700',
        color: BRAND.muted,
        paddingVertical: 8,
    },
    monthCell: { flex: 3, textAlign: 'left', fontWeight: '600' },
    reservationCell: { flex: 1, textAlign: 'center' },
    amountCell: { flex: 2, textAlign: 'right' },
    textSelected: {
        color: BRAND.card, // White text for selected row
    },
    emptyText: {
        padding: 10,
        textAlign: 'center',
        color: BRAND.muted,
    }
});