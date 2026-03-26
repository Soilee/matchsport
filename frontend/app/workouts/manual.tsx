import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { supabase } from '@/services/supabase';

import { useLocalSearchParams } from 'expo-router';

export default function ManualWorkoutScreen() {
    const { id: editId } = useLocalSearchParams<{ id: string }>();
    const [workoutName, setWorkoutName] = useState('');
    const [selectedDay, setSelectedDay] = useState('');
    const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weight: '' }]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    React.useEffect(() => {
        if (editId) {
            loadExistingWorkout();
        }
    }, [editId]);

    const loadExistingWorkout = async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase.from('user_manual_workouts').select('*').eq('id', editId).single();
            if (error) throw error;

            // Extract raw name from [Day] Name format
            const rawName = data.workout_name.replace(/^\[.*?\]\s*/, '');
            setWorkoutName(rawName);

            // Try to match day from prefix
            const match = data.workout_name.match(/^\[(.*?)\]/);
            if (match) {
                const dayObj = DAYS.find(d => d.label === match[1]);
                if (dayObj) setSelectedDay(dayObj.id);
            }

            const { data: exData } = await supabase.from('workout_logs').select('*').eq('workout_id', editId);
            if (exData && exData.length > 0) {
                setExercises(exData.map(e => ({
                    name: e.exercise_name,
                    sets: String(e.sets_count),
                    reps: String(e.reps_count),
                    weight: String(e.weight_kg)
                })));
            }
        } catch (err) {
            console.error('Load error:', err);
            Alert.alert('Hata', 'Antrenman verileri yüklenemedi.');
        } finally {
            setFetching(false);
        }
    };

    const DAYS = [
        { id: 'mon', label: 'Pzt' }, { id: 'tue', label: 'Sal' }, { id: 'wed', label: 'Çar' },
        { id: 'thu', label: 'Per' }, { id: 'fri', label: 'Cum' }, { id: 'sat', label: 'Cmt' }, { id: 'sun', label: 'Paz' }
    ];

    const addExercise = () => {
        setExercises([...exercises, { name: '', sets: '', reps: '', weight: '' }]);
    };

    const updateExercise = (index: number, field: string, value: string) => {
        const newExercises = [...exercises];
        (newExercises[index] as any)[field] = value;
        setExercises(newExercises);
    };

    const saveWorkout = async () => {
        if (!selectedDay) {
            Alert.alert('Hata', 'Lütfen bir gün seçin.');
            return;
        }
        if (!workoutName) {
            Alert.alert('Hata', 'Lütfen antrenman adı girin.');
            return;
        }

        setLoading(true);
        try {
            const finalWorkoutName = `[${DAYS.find(d => d.id === selectedDay)?.label}] ${workoutName}`;

            if (editId) {
                // Update existing
                await supabase.from('user_manual_workouts').update({ workout_name: finalWorkoutName }).eq('id', editId);
                // Delete old logs and insert new ones (simpler than syncing)
                await supabase.from('workout_logs').delete().eq('workout_id', editId);
                const { data: userData } = await supabase.auth.getUser();
                const userId = userData.user?.id;
                const logs = exercises.filter(ex => ex.name).map(ex => ({
                    user_id: userId,
                    workout_id: editId,
                    exercise_name: ex.name,
                    sets_count: parseInt(ex.sets) || 1,
                    reps_count: parseInt(ex.reps) || 1,
                    weight_kg: parseFloat(ex.weight) || 0,
                    logged_at: new Date().toISOString().split('T')[0]
                }));
                await supabase.from('workout_logs').insert(logs);
                Alert.alert('Başarılı', 'Antrenman güncellendi! ✨');
            } else {
                const { saveManualWorkout } = await import('@/services/api');
                await saveManualWorkout({
                    workout_name: finalWorkoutName,
                    exercises: exercises.filter(ex => ex.name)
                });
                Alert.alert('Başarılı', 'Antrenman kaydedildi! 🔥');
            }

            router.back();
        } catch (err: any) {
            console.error('Save error:', err);
            Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Yeni Antrenman Girişi</Text>
                    <TouchableOpacity onPress={saveWorkout} disabled={loading}>
                        <Text style={[styles.saveBtn, loading && { opacity: 0.5 }]}>KAYDET</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <Text style={styles.label}>Antrenman Adı</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Örn: Göğüs & Ön Kol"
                        placeholderTextColor={Colors.textMuted}
                        value={workoutName}
                        onChangeText={setWorkoutName}
                    />

                    <Text style={[styles.label, { marginTop: 24 }]}>Gün Seçimi</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                        {DAYS.map(day => (
                            <TouchableOpacity
                                key={day.id}
                                style={[styles.dayBtn, selectedDay === day.id && styles.dayBtnActive]}
                                onPress={() => setSelectedDay(day.id)}
                            >
                                <Text style={[styles.dayBtnText, selectedDay === day.id && styles.dayBtnTextActive]}>
                                    {day.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={[styles.label, { marginTop: 24 }]}>Egzersizler</Text>
                    {exercises.map((ex, index) => (
                        <Card key={index} style={styles.exerciseCard}>
                            <TextInput
                                style={styles.exerciseNameInput}
                                placeholder="Hareket Adı (Örn: Bench Press)"
                                placeholderTextColor={Colors.textMuted}
                                value={ex.name}
                                onChangeText={(val) => updateExercise(index, 'name', val)}
                            />
                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <Text style={styles.miniLabel}>Set</Text>
                                    <TextInput
                                        style={styles.miniInput}
                                        keyboardType="numeric"
                                        value={ex.sets}
                                        onChangeText={(val) => updateExercise(index, 'sets', val)}
                                    />
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.miniLabel}>Tekrar</Text>
                                    <TextInput
                                        style={styles.miniInput}
                                        keyboardType="numeric"
                                        value={ex.reps}
                                        onChangeText={(val) => updateExercise(index, 'reps', val)}
                                    />
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.miniLabel}>Ağırlık (kg)</Text>
                                    <TextInput
                                        style={styles.miniInput}
                                        keyboardType="numeric"
                                        value={ex.weight}
                                        onChangeText={(val) => updateExercise(index, 'weight', val)}
                                    />
                                </View>
                            </View>
                        </Card>
                    ))}

                    <TouchableOpacity style={styles.addExerciseBtn} onPress={addExercise}>
                        <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                        <Text style={styles.addExerciseText}>Hareket Ekle</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    title: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    saveBtn: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
    },
    daysScroll: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    dayBtnActive: {
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        borderColor: Colors.primary,
    },
    dayBtnText: {
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    dayBtnTextActive: {
        color: Colors.primary,
    },
    exerciseCard: {
        marginBottom: 16,
        padding: 16,
    },
    exerciseNameInput: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '600',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingBottom: 8,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    col: {
        flex: 1,
    },
    miniLabel: {
        color: Colors.textMuted,
        fontSize: 12,
        marginBottom: 4,
    },
    miniInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 12,
        color: Colors.text,
        fontSize: 16,
        textAlign: 'center',
    },
    addExerciseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 53, 0.3)',
        borderRadius: 12,
        borderStyle: 'dashed',
    },
    addExerciseText: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
