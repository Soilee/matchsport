import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { WorkoutDay } from '@/types';

interface Props {
    workout: WorkoutDay | null;
}

export default function ChecklistWorkout({ workout }: Props) {
    if (!workout) {
        return (
            <Card title="Bugünkü Antrenman">
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Bugün dinlenme günü! 😴</Text>
                </View>
            </Card>
        );
    }

    return (
        <Card title="Bugünkü Antrenman" style={styles.card}>
            <View style={styles.list}>
                {workout.exercises.map((ex, i) => (
                    <View key={i} style={styles.item}>
                        <View style={[styles.checkbox, ex.completed && styles.checked]}>
                            {ex.completed ? (
                                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                            ) : (
                                <Ionicons name="ellipse-outline" size={24} color={Colors.accent} />
                            )}
                        </View>
                        <View style={styles.info}>
                            <Text style={[styles.name, ex.completed && styles.completedText]}>
                                {ex.name}
                            </Text>
                            <Text style={styles.subtext}>
                                {ex.sets}x{ex.reps} {ex.weight_kg ? `• ${ex.weight_kg}kg` : ''}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    list: {
        gap: 12,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checked: {
        opacity: 1,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.text,
    },
    completedText: {
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    subtext: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: 16,
    },
});
