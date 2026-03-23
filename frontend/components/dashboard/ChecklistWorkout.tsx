import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { WorkoutDay } from '@/types';

interface Props {
    workout: WorkoutDay | null;
}

const ChecklistWorkout = React.memo(({ workout }: Props) => {
    if (!workout || workout.is_off_day) {
        return (
            <Card title="Bugünkü Antrenman">
                <View style={styles.emptyContainer}>
                    <Ionicons name="sunny-outline" size={48} color={Colors.primary} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>Bugün dinlenme günü! 😴</Text>
                    <Text style={[styles.emptyText, { fontSize: 13, marginTop: 4, opacity: 0.7 }]}>Kaslarınızı dinlendirmeyi unutmayın.</Text>
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={styles.subtext}>
                                    {ex.sets}x{ex.reps} {ex.weight_kg ? `• ${ex.weight_kg}kg` : ''}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        const url = ex.video_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise how to')}`;
                                        import('react-native').then(({ Linking }) => Linking.openURL(url));
                                    }}
                                    style={styles.howToBtn}
                                >
                                    <Ionicons name="play-circle-outline" size={14} color={Colors.primary} />
                                    <Text style={styles.howToText}>Nasıl Yapılır?</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </Card>
    );
});

export default ChecklistWorkout;

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
    howToBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderRadius: 12,
    },
    howToText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
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
