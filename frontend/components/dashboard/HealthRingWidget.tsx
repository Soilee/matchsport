import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, G } from 'react-native-svg';

interface Props {
    steps: number;
    goalSteps: number;
    calories: number;
    goalCalories: number;
}

export default function HealthRingWidget({ steps, goalSteps, calories, goalCalories }: Props) {
    const size = 120;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    // Outer Ring: Steps
    const stepProgress = Math.min(steps / goalSteps, 1);
    const stepStrokeDashoffset = circumference - (circumference * stepProgress);

    // Inner Ring: Calories
    const innerRadius = radius - strokeWidth - 4;
    const innerCircumference = 2 * Math.PI * innerRadius;
    const calProgress = Math.min(calories / goalCalories, 1);
    const calStrokeDashoffset = innerCircumference - (innerCircumference * calProgress);

    return (
        <Card title="Günlük Aktiflik" style={styles.card}>
            <View style={styles.container}>
                <View style={styles.ringContainer}>
                    <Svg width={size} height={size}>
                        <G transform={`rotate(-90 ${center} ${center})`}>
                            {/* Steps Background */}
                            <Circle
                                stroke="rgba(255, 107, 53, 0.1)"
                                cx={center} cy={center} r={radius}
                                strokeWidth={strokeWidth} fill="none"
                            />
                            {/* Steps Progress */}
                            <Circle
                                stroke={Colors.primary}
                                cx={center} cy={center} r={radius}
                                strokeWidth={strokeWidth} fill="none"
                                strokeDasharray={circumference}
                                strokeDashoffset={stepStrokeDashoffset}
                                strokeLinecap="round"
                            />

                            {/* Calories Background */}
                            <Circle
                                stroke="rgba(52, 199, 89, 0.1)"
                                cx={center} cy={center} r={innerRadius}
                                strokeWidth={strokeWidth} fill="none"
                            />
                            {/* Calories Progress */}
                            <Circle
                                stroke={Colors.success}
                                cx={center} cy={center} r={innerRadius}
                                strokeWidth={strokeWidth} fill="none"
                                strokeDasharray={innerCircumference}
                                strokeDashoffset={calStrokeDashoffset}
                                strokeLinecap="round"
                            />
                        </G>
                    </Svg>
                    <View style={styles.centerIcon}>
                        <Ionicons name="flame" size={32} color={Colors.textMuted} style={{ opacity: 0.5 }} />
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statRow}>
                        <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                        <View>
                            <Text style={styles.statValue}>{steps.toLocaleString('tr-TR')} <Text style={styles.statLabel}>/ {goalSteps}</Text></Text>
                            <Text style={styles.statName}>Adım (Apple Health)</Text>
                        </View>
                    </View>

                    <View style={styles.statRow}>
                        <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                        <View>
                            <Text style={styles.statValue}>{calories.toLocaleString('tr-TR')} <Text style={styles.statLabel}>/ {goalCalories}</Text></Text>
                            <Text style={styles.statName}>Aktif Kalori</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    ringContainer: {
        position: 'relative',
        width: 120,
        height: 120,
    },
    centerIcon: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContainer: {
        flex: 1,
        gap: 16,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    statValue: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '800',
    },
    statLabel: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
    statName: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    }
});
