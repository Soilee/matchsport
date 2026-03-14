import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { PRRecord } from '@/types';

interface Props {
    records: PRRecord[];
}

export default function PRRecordsCard({ records }: Props) {
    if (!records || records.length === 0) {
        return (
            <Card>
                <View style={styles.header}>
                    <Ionicons name="trophy" size={22} color={Colors.warning} />
                    <Text style={styles.title}>PR Rekorları</Text>
                </View>
                <Text style={styles.emptyText}>Henüz PR kaydı yok. İlk rekorunu kır! 💪</Text>
            </Card>
        );
    }

    return (
        <Card>
            <View style={styles.header}>
                <Ionicons name="trophy" size={22} color={Colors.warning} />
                <Text style={styles.title}>PR Rekorları</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{records.length} PR</Text>
                </View>
            </View>

            <View style={styles.list}>
                {records.slice(0, 4).map((pr, i) => (
                    <View key={pr.id} style={styles.prItem}>
                        <View style={styles.medal}>
                            <Text style={styles.medalText}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏆'}
                            </Text>
                        </View>
                        <View style={styles.prInfo}>
                            <Text style={styles.exerciseName}>{pr.exercise_name}</Text>
                            <Text style={styles.date}>{pr.achieved_at}</Text>
                        </View>
                        <View style={styles.weightContainer}>
                            <Text style={styles.weight}>{pr.max_weight_kg}</Text>
                            <Text style={styles.weightUnit}>kg</Text>
                        </View>
                    </View>
                ))}
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
        flex: 1,
    },
    countBadge: {
        backgroundColor: 'rgba(255, 214, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        fontSize: 12,
        color: Colors.warning,
        fontWeight: '600',
    },
    list: {
        gap: 10,
    },
    prItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    medal: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 214, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    medalText: {
        fontSize: 18,
    },
    prInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    weightContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    weight: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.primary,
    },
    weightUnit: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
        paddingVertical: 16,
    },
});
