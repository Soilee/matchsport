import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { getExercises } from '@/services/api';
import { Exercise } from '@/types';
import { router } from 'expo-router';

export default function ExercisesScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [activeGroup, setActiveGroup] = useState<string>('Hepsi');

    const loadData = useCallback(async () => {
        try {
            const data = await getExercises();
            setExercises(data);
        } catch (error: any) {
            console.error('Exercises load error:', error);
            if (error?.response?.status === 401 || error?.message?.includes('401')) {
                router.replace('/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const muscleGroups = ['Hepsi', ...Array.from(new Set(exercises.map(e => e.muscle_group)))];
    const filteredExercises = activeGroup === 'Hepsi' ? exercises : exercises.filter(e => e.muscle_group === activeGroup);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.filtersWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                    {muscleGroups.map(group => (
                        <TouchableOpacity
                            key={group}
                            style={[styles.filterChip, activeGroup === group && styles.filterChipActive]}
                            onPress={() => setActiveGroup(group)}
                        >
                            <Text style={[styles.filterText, activeGroup === group && styles.filterTextActive]}>
                                {group}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {filteredExercises.map(ex => (
                    <Card key={ex.id} style={styles.exerciseCard}>
                        {/* Simulated Video Placeholder */}
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.7)" />
                            <View style={styles.muscleBadge}>
                                <Text style={styles.muscleBadgeText}>{ex.muscle_group}</Text>
                            </View>
                        </View>

                        <View style={styles.content}>
                            <Text style={styles.name}>{ex.name}</Text>
                            <View style={styles.detailsRow}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="hardware-chip-outline" size={16} color={Colors.textMuted} />
                                    <Text style={styles.detailText}>{ex.equipment}</Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    filtersWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 12,
    },
    filters: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        borderColor: Colors.primary,
    },
    filterText: {
        color: Colors.textMuted,
        fontWeight: '600',
        fontSize: 14,
    },
    filterTextActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 16,
        gap: 16,
        paddingBottom: 40,
    },
    exerciseCard: {
        padding: 0,
        overflow: 'hidden',
    },
    videoPlaceholder: {
        height: 160,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    muscleBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    muscleBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    content: {
        padding: 16,
    },
    name: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '500',
    }
});
