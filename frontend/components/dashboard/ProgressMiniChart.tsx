import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { BodyMeasurement } from '@/types';

interface Props {
    measurements: BodyMeasurement[];
}

export default function ProgressMiniChart({ measurements }: Props) {
    if (!measurements || measurements.length < 2) {
        return (
            <Card>
                <View style={styles.header}>
                    <Ionicons name="trending-up" size={22} color={Colors.success} />
                    <Text style={styles.title}>Gelişim Takibi</Text>
                </View>
                <Text style={styles.emptyText}>Yetersiz veri. Ölçüm ekleyin!</Text>
            </Card>
        );
    }

    const latest = measurements[measurements.length - 1];
    const first = measurements[0];
    const weightDiff = (latest.weight_kg - first.weight_kg).toFixed(1);
    const fatDiff = (latest.body_fat_pct - first.body_fat_pct).toFixed(1);

    // Simple sparkline using bars
    const weights = measurements.map(m => m.weight_kg);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const rangeW = maxW - minW || 1;

    return (
        <Card>
            <View style={styles.header}>
                <Ionicons name="trending-up" size={22} color={Colors.success} />
                <Text style={styles.title}>Gelişim Takibi</Text>
            </View>

            {/* Mini bar chart for weight trend */}
            <View style={styles.chartContainer}>
                {weights.map((w, i) => {
                    const height = ((w - minW) / rangeW) * 60 + 10;
                    const isLatest = i === weights.length - 1;
                    return (
                        <View key={i} style={styles.barContainer}>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height,
                                        backgroundColor: isLatest ? Colors.primary : 'rgba(255, 107, 53, 0.3)',
                                    },
                                ]}
                            />
                        </View>
                    );
                })}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Kilo</Text>
                    <Text style={styles.statValue}>{latest.weight_kg.toFixed(1)} kg</Text>
                    <View style={styles.diffContainer}>
                        <Ionicons
                            name={Number(weightDiff) <= 0 ? 'arrow-down' : 'arrow-up'}
                            size={12}
                            color={Number(weightDiff) <= 0 ? Colors.success : Colors.warning}
                        />
                        <Text style={[styles.diffText, { color: Number(weightDiff) <= 0 ? Colors.success : Colors.warning }]}>
                            {weightDiff} kg
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Yağ %</Text>
                    <Text style={styles.statValue}>{latest.body_fat_pct.toFixed(1)}%</Text>
                    <View style={styles.diffContainer}>
                        <Ionicons
                            name={Number(fatDiff) <= 0 ? 'arrow-down' : 'arrow-up'}
                            size={12}
                            color={Number(fatDiff) <= 0 ? Colors.success : Colors.warning}
                        />
                        <Text style={[styles.diffText, { color: Number(fatDiff) <= 0 ? Colors.success : Colors.warning }]}>
                            {fatDiff}%
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Kol</Text>
                    <Text style={styles.statValue}>{latest.arm_cm.toFixed(1)} cm</Text>
                    <View style={styles.diffContainer}>
                        <Ionicons
                            name={(latest.arm_cm - first.arm_cm) >= 0 ? 'arrow-up' : 'arrow-down'}
                            size={12}
                            color={(latest.arm_cm - first.arm_cm) >= 0 ? Colors.success : Colors.warning}
                        />
                        <Text style={[styles.diffText, { color: (latest.arm_cm - first.arm_cm) >= 0 ? Colors.success : Colors.warning }]}>
                            {(latest.arm_cm - first.arm_cm).toFixed(1)} cm
                        </Text>
                    </View>
                </View>
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
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 80,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginHorizontal: 2,
    },
    bar: {
        width: '80%',
        borderRadius: 4,
        minHeight: 6,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    diffContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    diffText: {
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.cardBorder,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
        paddingVertical: 16,
    },
});
