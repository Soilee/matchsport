import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { WorkoutDay } from '@/types';

interface Props {
    workout: WorkoutDay | null;
}

const DAY_LABELS: Record<string, string> = {
    mon: 'Pazartesi', tue: 'Salı', wed: 'Çarşamba',
    thu: 'Perşembe', fri: 'Cuma', sat: 'Cumartesi', sun: 'Pazar',
};

export default function TodayWorkoutCard({ workout }: Props) {
    if (!workout) {
        return (
            <Card>
                <View style={styles.header}>
                    <Ionicons name="barbell" size={22} color={Colors.primary} />
                    <Text style={styles.title}>Bugünün Antrenmanı</Text>
                </View>
                <View style={styles.restDay}>
                    <Text style={styles.restEmoji}>😴</Text>
                    <Text style={styles.restText}>Bugün dinlenme günü!</Text>
                    <Text style={styles.restSubtext}>Kaslarını dinlendir, yarın yakıyoruz 🔥</Text>
                </View>
            </Card>
        );
    }

    return (
        <Card glow>
            <View style={styles.header}>
                <Ionicons name="barbell" size={22} color={Colors.primary} />
                <Text style={styles.title}>Bugünün Antrenmanı</Text>
                <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>{DAY_LABELS[workout.day_of_week]}</Text>
                </View>
            </View>

            <View style={styles.muscleGroupContainer}>
                <Text style={styles.muscleGroup}>{workout.muscle_group}</Text>
                {workout.program_name && (
                    <Text style={styles.programName}>📋 {workout.program_name}</Text>
                )}
            </View>

            <View style={styles.exerciseList}>
                {workout.exercises.slice(0, 5).map((ex, i) => (
                    <View key={i} style={styles.exerciseItem}>
                        <View style={styles.exerciseNumber}>
                            <Text style={styles.exerciseNumberText}>{i + 1}</Text>
                        </View>
                        <View style={styles.exerciseInfo}>
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.exerciseDetail}>
                                {ex.sets}x{ex.reps} • {Math.round(ex.weight_kg)}kg • {ex.rest_seconds}s dinlenme
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </View>
                ))}
                {workout.exercises.length > 5 && (
                    <Text style={styles.moreText}>+{workout.exercises.length - 5} egzersiz daha</Text>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        flex: 1,
    },
    dayBadge: {
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dayBadgeText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    muscleGroupContainer: {
        marginBottom: 16,
    },
    muscleGroup: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 4,
    },
    programName: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    exerciseList: {
        gap: 8,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    exerciseNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    exerciseNumberText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    exerciseDetail: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    moreText: {
        fontSize: 13,
        color: Colors.primary,
        textAlign: 'center',
        paddingVertical: 8,
        fontWeight: '600',
    },
    restDay: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    restEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    restText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    restSubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
});
