import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';

interface Props {
    currentCount: number;
    maxCapacity: number;
}

export default function OccupancyWidget({ currentCount, maxCapacity }: Props) {
    const percentage = Math.round((currentCount / maxCapacity) * 100);

    const getStatusColor = () => {
        if (percentage < 30) return Colors.success;
        if (percentage < 60) return Colors.warning;
        return Colors.accent;
    };

    const getStatusText = () => {
        if (percentage < 30) return 'Sakin 😌';
        if (percentage < 60) return 'Normal 🏃';
        return 'Yoğun 🔥';
    };

    const statusColor = getStatusColor();

    return (
        <Card>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="people" size={22} color={Colors.primary} />
                    <Text style={styles.title}>Salon Yoğunluğu</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{getStatusText()}</Text>
                </View>
            </View>

            <View style={styles.countContainer}>
                <Text style={styles.currentCount}>{currentCount}</Text>
                <Text style={styles.separator}>/</Text>
                <Text style={styles.maxCapacity}>{maxCapacity}</Text>
                <Text style={styles.label}>kişi</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarBg}>
                <View
                    style={[
                        styles.progressBarFill,
                        {
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: statusColor,
                        },
                    ]}
                />
            </View>
            <Text style={styles.percentText}>%{percentage} doluluk</Text>
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 12,
        gap: 4,
    },
    currentCount: {
        fontSize: 48,
        fontWeight: '800',
        color: Colors.text,
    },
    separator: {
        fontSize: 28,
        color: Colors.textMuted,
        fontWeight: '300',
    },
    maxCapacity: {
        fontSize: 22,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    label: {
        fontSize: 16,
        color: Colors.textMuted,
        marginLeft: 4,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    percentText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 6,
        textAlign: 'right',
    },
});
