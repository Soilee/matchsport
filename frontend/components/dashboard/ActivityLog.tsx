import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { WorkoutLog } from '@/types';

interface Props {
    history: WorkoutLog[];
}

const ActivityLog = React.memo(({ history }: Props) => {
    // Generate last 7 days including today
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const maxDuration = Math.max(...history.map(h => h.duration_minutes), 60);

    return (
        <Card title="Son 7 Günlük Aktivite">
            <View style={styles.container}>
                <View style={styles.chart}>
                    {last7Days.map((date, i) => {
                        const log = history.find(h => h.workout_date === date);
                        const height = log ? Math.max((log.duration_minutes / maxDuration) * 80, 5) : 2;
                        const dayName = new Date(date).toLocaleDateString('tr-TR', { weekday: 'short' });
                        const isToday = date === new Date().toISOString().split('T')[0];

                        return (
                            <View key={i} style={styles.column}>
                                <View style={styles.barContainer}>
                                    <View style={[
                                        styles.bar,
                                        { height: `${height}%` },
                                        log ? styles.activeBar : styles.inactiveBar,
                                        isToday && styles.todayBar
                                    ]} />
                                </View>
                                <Text style={[styles.dayText, isToday && styles.todayText]}>{dayName}</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.legendText}>
                            Toplam: {history.reduce((acc, curr) => acc + curr.duration_minutes, 0)} dk
                        </Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Ionicons name="flame-outline" size={14} color={Colors.primary} />
                        <Text style={styles.legendText}>
                            Ortalama: {history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + curr.duration_minutes, 0) / history.length) : 0} dk
                        </Text>
                    </View>
                </View>
            </View>
        </Card>
    );
});

export default ActivityLog;

const styles = StyleSheet.create({
    container: {
        padding: 12,
    },
    chart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    column: {
        alignItems: 'center',
        flex: 1,
    },
    barContainer: {
        height: 80,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 8,
    },
    bar: {
        width: 12,
        borderRadius: 6,
    },
    activeBar: {
        backgroundColor: Colors.primary,
    },
    inactiveBar: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    todayBar: {
        backgroundColor: Colors.accent,
        borderWidth: 1,
        borderColor: 'white',
    },
    dayText: {
        fontSize: 10,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
    },
    todayText: {
        color: Colors.text,
        fontWeight: '700',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
