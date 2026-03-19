import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { HeatmapData } from '@/types';

interface Props {
    data: HeatmapData[];
}

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_MAP: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function getHeatColor(value: number, max: number): string {
    const ratio = value / max;
    if (ratio < 0.2) return '#1a2a1a';
    if (ratio < 0.4) return '#2d5a2d';
    if (ratio < 0.6) return '#8B8000';
    if (ratio < 0.8) return '#FF6B35';
    return '#FF3366';
}

export default function HeatmapCard({ data }: Props) {
    // Build a grid: days x hours
    const grid: Record<string, Record<number, number>> = {};
    let maxVal = 1;

    for (const d of data) {
        const dayIdx = DAY_MAP[d.day_of_week];
        if (dayIdx === undefined) continue;
        if (!grid[d.day_of_week]) grid[d.day_of_week] = {};
        grid[d.day_of_week][d.hour_of_day] = d.avg_count;
        if (d.avg_count > maxVal) maxVal = d.avg_count;
    }

    return (
        <Card>
            <View style={styles.header}>
                <Ionicons name="flame" size={22} color={Colors.accent} />
                <Text style={styles.title}>Yoğunluk Haritası</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} contentContainerStyle={{ paddingRight: 20 }}>
                <View>
                    {/* Hour labels */}
                    <View style={styles.row}>
                        <View style={styles.dayLabel} />
                        {HOURS.map(h => (
                            <View key={h} style={styles.hourLabel}>
                                <Text style={styles.hourText}>{h}:00</Text>
                            </View>
                        ))}
                    </View>

                    {/* Grid */}
                    {Object.keys(DAY_MAP).map(dayKey => {
                        const dayIdx = DAY_MAP[dayKey];
                        return (
                            <View key={dayKey} style={styles.row}>
                                <View style={styles.dayLabel}>
                                    <Text style={styles.dayText}>{DAYS[dayIdx]}</Text>
                                </View>
                                {HOURS.map(h => {
                                    const val = grid[dayKey]?.[h] || 0;
                                    return (
                                        <View
                                            key={h}
                                            style={[
                                                styles.cell,
                                                { backgroundColor: getHeatColor(val, maxVal) },
                                            ]}
                                        >
                                            <Text style={styles.cellText}>{Math.round(val)}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Legend */}
            <View style={styles.legend}>
                <Text style={styles.legendLabel}>Sakin</Text>
                {['#1a2a1a', '#2d5a2d', '#8B8000', '#FF6B35', '#FF3366'].map((c, i) => (
                    <View key={i} style={[styles.legendDot, { backgroundColor: c }]} />
                ))}
                <Text style={styles.legendLabel}>Yoğun</Text>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dayLabel: {
        width: 36,
        paddingRight: 4,
    },
    dayText: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    hourLabel: {
        width: 44,
        alignItems: 'center',
    },
    hourText: {
        fontSize: 9,
        color: Colors.textMuted,
    },
    cell: {
        width: 40,
        height: 28,
        margin: 2,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellText: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    legendDot: {
        width: 16,
        height: 10,
        borderRadius: 3,
    },
    legendLabel: {
        fontSize: 11,
        color: Colors.textMuted,
    },
});
