import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, TextInput, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { getWorkoutProgram, getDietPlan } from '@/services/api';
import { WorkoutProgram, WorkoutDay, DietPlan, Exercise } from '@/types';
import { router } from 'expo-router';

export default function WorkoutsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [activeTab, setActiveTab] = useState<'workout' | 'diet' | 'nutrition'>('workout');
    const [program, setProgram] = useState<WorkoutProgram | null>(null);
    const [days, setDays] = useState<WorkoutDay[]>([]);
    const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
    const [diet, setDiet] = useState<DietPlan | null>(null);
    const [manualWorkouts, setManualWorkouts] = useState<any[]>([]);

    // Nutrition State
    const [nutritionLogs, setNutritionLogs] = useState<any[]>([]);
    const [foods, setFoods] = useState<any[]>([]);
    const [isLogging, setIsLogging] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // AI & Manual Diet State
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [isManualDietMode, setIsManualDietMode] = useState(false);
    const [manualDietData, setManualDietData] = useState({
        goal: '',
        daily_calories: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        meals: [{ name: '1. Öğün', time: '08:00', items: [''] }]
    });

    const loadData = useCallback(async () => {
        try {
            const [workoutData, dietData, foodData, nutritionData] = await Promise.all([
                getWorkoutProgram(),
                getDietPlan(),
                import('@/services/api').then(a => a.getFoods()),
                import('@/services/api').then(a => a.getDailyNutrition())
            ]);

            setProgram(workoutData.program);
            setDays(workoutData.days);
            if (workoutData.days.length > 0 && !selectedDayId) {
                const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const today = dayNames[new Date().getDay()];
                const todayData = workoutData.days.find((d: any) => d.day_of_week === today);
                setSelectedDayId(todayData ? todayData.id : workoutData.days[0].id);
            }

            setDiet(dietData);
            setFoods(foodData);
            setNutritionLogs(nutritionData);

            // Load manual workouts
            const { data: manual } = await import('@/services/supabase').then(s => s.supabase.from('user_manual_workouts').select('*').order('created_at', { ascending: false }).limit(5));
            setManualWorkouts(manual || []);
        } catch (error: any) {
            console.error('Workouts load error:', error);
            if (error?.response?.status === 401 || error?.message?.includes('401')) {
                router.replace('/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDayId]);

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

    const handleAiMealLog = async () => {
        if (!aiInput) return Alert.alert('Hata', 'Lütfen ne yediğinizi yazın.');
        setAiLoading(true);
        try {
            const { logAiMeal } = await import('@/services/api');
            await logAiMeal(aiInput);
            setAiInput('');
            setIsLogging(false);
            Alert.alert('Başarılı', 'Öğün yapay zeka tarafından analiz edildi ve kaydedildi! ✨');
            loadData();
        } catch (error) {
            console.error('AI Log Error:', error);
            Alert.alert('Hata', 'Analiz yapılamadı.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleManualDietSubmit = async () => {
        if (!manualDietData.goal) return Alert.alert('Hata', 'Lütfen diyet hedefinizi girin.');
        setAiLoading(true);
        try {
            const { saveDietPlan } = await import('@/services/api');
            await saveDietPlan({
                plan_name: manualDietData.goal,
                description: 'Kullanıcı tarafından manuel girildi.',
                daily_calories: parseInt(manualDietData.daily_calories) || 0,
                protein_g: parseFloat(manualDietData.protein_g) || 0,
                carbs_g: parseFloat(manualDietData.carbs_g) || 0,
                fat_g: parseFloat(manualDietData.fat_g) || 0,
                meals: manualDietData.meals.filter(m => m.items[0] !== '')
            });
            setIsManualDietMode(false);
            Alert.alert('Başarılı', 'Diyet programınız kaydedildi.');
            loadData();
        } catch (error) {
            console.error('Manual Diet Error:', error);
            Alert.alert('Hata', 'Diyet kaydedilemedi.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleGenerateAiDiet = async () => {
        if (!aiInput) return Alert.alert('Hata', 'Lütfen hedefinizi belirtin (Örn: Haftada 1 kilo vermek istiyorum).');
        setAiLoading(true);
        try {
            const { generateAiDiet } = await import('@/services/api');
            const res = await generateAiDiet(aiInput);
            // In a real app, the backend would save this. For now, we update local state or the backend will return the saved plan.
            setDiet(res.plan);
            setAiInput('');
            Alert.alert('Harika!', 'Yapay zeka size özel bir program hazırladı. Alt kısımda görebilirsiniz.');
            loadData();
        } catch (error) {
            console.error('AI Diet Error:', error);
            Alert.alert('Hata', 'Program oluşturulamadı.');
        } finally {
            setAiLoading(false);
        }
    };

    const dayMap: Record<string, string> = {
        'mon': 'Pzt', 'tue': 'Sal', 'wed': 'Çar', 'thu': 'Per', 'fri': 'Cum', 'sat': 'Cmt', 'sun': 'Paz'
    };

    const selectedDay = days.find(d => d.id === selectedDayId);

    const renderWorkoutContent = () => {
        return (
            <View>
                {/* 1. Official Program */}
                {program ? (
                    <Card style={styles.programCard} glow>
                        <View style={styles.programHeader}>
                            <View>
                                <Text style={styles.programTitle}>{program.program_name}</Text>
                                <Text style={styles.programDates}>
                                    {new Date(program.start_date).toLocaleDateString('tr-TR')} - {new Date(program.end_date).toLocaleDateString('tr-TR')}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                                <View style={styles.activeBadge}>
                                    <Text style={styles.activeText}>Aktif</Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                            {days.map(day => (
                                <TouchableOpacity
                                    key={day.id}
                                    style={[styles.dayButton, selectedDayId === day.id && styles.dayButtonActive]}
                                    onPress={() => setSelectedDayId(day.id)}
                                >
                                    <Text style={[styles.dayText, selectedDayId === day.id && styles.dayTextActive]}>
                                        {dayMap[day.day_of_week] || day.day_of_week}
                                    </Text>
                                    <Text style={[styles.muscleText, selectedDayId === day.id && styles.muscleTextActive]}>
                                        {day.muscle_group}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Card>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="barbell-outline" size={64} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>Aktif bir antrenman programınız bulunmuyor.</Text>
                    </View>
                )}

                {/* 2. Hybrid Actions (NEW) */}
                <View style={styles.hybridActions}>
                    <TouchableOpacity style={styles.manualEntryBtn} onPress={() => router.push('/workouts/manual' as any)}>
                        <Ionicons name="add-circle" size={24} color="#fff" />
                        <Text style={styles.manualEntryText}>Kendi Antrenmanını Gir</Text>
                    </TouchableOpacity>
                </View>

                {/* 3. Official Exercise List */}
                {selectedDay && (
                    <View style={styles.exercisesList}>
                        <Text style={styles.sectionTitle}>Antrenman</Text>
                        {selectedDay.exercises.map((ex: Exercise, idx: number) => (
                            <Card key={ex.id} style={styles.exerciseCard}>
                                <View style={styles.exerciseHeader}>
                                    <View style={styles.exerciseNumber}>
                                        <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                                    </View>
                                    <View style={styles.exerciseInfo}>
                                        <Text style={styles.exerciseName}>{ex.name}</Text>
                                        <Text style={styles.exerciseDetails}>
                                            {ex.equipment} • {ex.rest_seconds}s Dinlenme
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.setsInfo}>
                                    <View style={styles.setStat}>
                                        <Text style={styles.statVal}>{ex.sets}</Text>
                                        <Text style={styles.statLabel}>Set</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.setStat}>
                                        <Text style={styles.statVal}>{ex.reps}</Text>
                                        <Text style={styles.statLabel}>Tekrar</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.setStat}>
                                        <Text style={styles.statVal}>{ex.weight_kg}</Text>
                                        <Text style={styles.statLabel}>kg</Text>
                                    </View>
                                </View>
                            </Card>
                        ))}

                        {/* Complete Workout Button (STREAK SYSTEM) */}
                        <TouchableOpacity
                            style={styles.completeWorkoutBtn}
                            onPress={async () => {
                                try {
                                    setLoading(true);
                                    const { completeWorkoutDay } = await import('@/services/api');
                                    await completeWorkoutDay(selectedDay.id);
                                    Alert.alert('Tebrikler!', 'Antrenman tamamlandı, serin güncellendi! 🔥');
                                    loadData();
                                } catch (error: any) {
                                    Alert.alert('Hata', error?.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            <Ionicons name="flame" size={24} color="#fff" />
                            <Text style={styles.completeWorkoutBtnText}>ANTRENMANI BİTİRDİM</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 4. Manual History (NEW) */}
                {manualWorkouts.length > 0 && (
                    <View style={{ marginTop: 24 }}>
                        <Text style={styles.sectionTitle}>Son Manuel Girişler</Text>
                        {manualWorkouts.map(mw => (
                            <Card key={mw.id} style={styles.manualHistoryCard}>
                                <View style={styles.manualHistoryContent}>
                                    <View>
                                        <Text style={styles.manualHistoryName}>{mw.workout_name}</Text>
                                        <Text style={styles.manualHistoryDate}>
                                            {new Date(mw.created_at).toLocaleDateString('tr-TR')}
                                        </Text>
                                    </View>
                                    <Ionicons name="checkmark-done-circle" size={24} color={Colors.success} />
                                </View>
                            </Card>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const renderDietContent = () => {
        if (!diet) {
            return (
                <View style={styles.dietAiContainer}>
                    <Card style={styles.dietAiCard} glow>
                        <Ionicons name="sparkles" size={48} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
                        <Text style={styles.dietAiTitle}>Yapay Zeka Diyet Asistanı</Text>
                        <Text style={styles.dietAiSubtitle}>Kendi diyet planını henüz oluşturmamışsın. İsteklerini yaz, AI senin için hazırlasın!</Text>

                        <TextInput
                            style={styles.dietAiInput}
                            placeholder="Örn: 75 kiloyum, kas kütlemi artırmak için protein ağırlıklı bir plan istiyorum."
                            placeholderTextColor={Colors.textMuted}
                            value={aiInput}
                            onChangeText={setAiInput}
                            multiline
                        />

                        <TouchableOpacity
                            style={styles.dietAiBtn}
                            onPress={handleGenerateAiDiet}
                            disabled={aiLoading}
                        >
                            {aiLoading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Ionicons name="flask" size={20} color="#fff" />
                                    <Text style={styles.dietAiBtnText}>Programımı Oluştur</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </Card>
                </View>
            );
        }

        return (
            <View style={{ gap: 20 }}>
                <Card style={styles.dietHeaderCard} glow>
                    <Text style={styles.dietGoal}>{diet?.plan_name || 'Diyet Planı Henüz Yok'}</Text>
                    {diet && (
                        <View style={styles.macroRow}>
                            <View style={styles.macroStat}>
                                <Text style={styles.macroVal}>{diet.daily_calories}</Text>
                                <Text style={styles.macroLab}>Kalori</Text>
                            </View>
                            <View style={styles.macroStat}>
                                <Text style={[styles.macroVal, { color: Colors.primary }]}>{diet.protein_g}g</Text>
                                <Text style={styles.macroLab}>Protein</Text>
                            </View>
                            <View style={styles.macroStat}>
                                <Text style={[styles.macroVal, { color: Colors.warning }]}>{diet.carbs_g}g</Text>
                                <Text style={styles.macroLab}>Karb</Text>
                            </View>
                            <View style={styles.macroStat}>
                                <Text style={[styles.macroVal, { color: Colors.info }]}>{diet.fat_g}g</Text>
                                <Text style={styles.macroLab}>Yağ</Text>
                            </View>
                        </View>
                    )}
                </Card>

                {!diet && (
                    <View style={styles.dietAiContainer}>
                        <Card style={styles.dietAiCard}>
                            <Text style={styles.dietAiTitle}>Yapay Zeka Diyet Asistanı 🧠</Text>
                            <Text style={styles.dietAiSubtitle}>Hangi hedef için diyet planına ihtiyacınız var? (Örn: Hacim kazanmak, yağ yakmak vb.)</Text>
                            <TextInput
                                style={styles.dietAiInput}
                                placeholder="Hedefinizi yazın..."
                                placeholderTextColor={Colors.textMuted}
                                multiline
                                value={aiInput}
                                onChangeText={setAiInput}
                            />
                            <TouchableOpacity style={styles.dietAiBtn} onPress={handleGenerateAiDiet} disabled={aiLoading}>
                                {aiLoading ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Ionicons name="sparkles" size={20} color="#fff" />
                                        <Text style={styles.dietAiBtnText}>Diyet Programımı Oluştur</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dietAiBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary, marginTop: 12 }]}
                                onPress={() => setIsManualDietMode(true)}
                            >
                                <Text style={[styles.dietAiBtnText, { color: Colors.primary }]}>Diyetimi Kendim Gireceğim</Text>
                            </TouchableOpacity>
                        </Card>
                    </View>
                )}

                {diet && (
                    <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.sectionTitle}>Öğünler</Text>
                            <TouchableOpacity onPress={() => setDiet(null)}>
                                <Text style={{ color: Colors.primary, fontSize: 12 }}>Planı Değiştir</Text>
                            </TouchableOpacity>
                        </View>
                        {diet.meals && Array.isArray(diet.meals) && diet.meals.map((meal: any, idx: number) => (
                            <Card key={idx} style={styles.mealCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.mealName}>{meal.name || meal.meal_name}</Text>
                                    <Text style={styles.mealTime}>{meal.time}</Text>
                                </View>
                                <View style={styles.mealItems}>
                                    {(meal.items || []).map((item: string, i: number) => (
                                        <View key={i} style={styles.mealItemRow}>
                                            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                                            <Text style={styles.mealItemText}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            </Card>
                        ))}
                    </>
                )}
            </View>
        );
    };

    const renderNutritionContent = () => {
        const totals = nutritionLogs.reduce((acc, curr) => ({
            protein: acc.protein + (parseFloat(curr.protein_g) || 0),
            carbs: acc.carbs + (parseFloat(curr.carbs_g) || 0),
            fat: acc.fat + (parseFloat(curr.fat_g) || 0),
            calories: acc.calories + (curr.calories || 0)
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

        // Group by date
        const grouped = nutritionLogs.reduce((acc, log) => {
            const date = log.log_date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(log);
            return acc;
        }, {} as Record<string, any[]>);

        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

        return (
            <View>
                {/* 1. Daily Summary */}
                <Card style={styles.macroCard} glow>
                    <Text style={styles.sectionTitle}>Bugünkü Makroların</Text>
                    <View style={styles.macroRow}>
                        <View style={styles.macroStat}>
                            <Text style={styles.macroVal}>{Math.round(totals.calories)}</Text>
                            <Text style={styles.macroLab}>Kalori</Text>
                        </View>
                        <View style={styles.macroStat}>
                            <Text style={[styles.macroVal, { color: Colors.primary }]}>{Math.round(totals.protein)}g</Text>
                            <Text style={styles.macroLab}>Protein</Text>
                        </View>
                        <View style={styles.macroStat}>
                            <Text style={[styles.macroVal, { color: Colors.warning }]}>{Math.round(totals.carbs)}g</Text>
                            <Text style={styles.macroLab}>Karb</Text>
                        </View>
                        <View style={styles.macroStat}>
                            <Text style={[styles.macroVal, { color: Colors.info }]}>{Math.round(totals.fat)}g</Text>
                            <Text style={styles.macroLab}>Yağ</Text>
                        </View>
                    </View>
                </Card>

                {/* 2. Log Meal */}
                <TouchableOpacity style={styles.addFoodBtn} onPress={() => setIsLogging(true)}>
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.addFoodText}>Yediklerini Kaydet</Text>
                </TouchableOpacity>

                {/* 3. History */}
                {sortedDates.map(date => (
                    <View key={date} style={{ marginBottom: 24 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                            {date === new Date().toISOString().split('T')[0] ? 'Bugün' : new Date(date).toLocaleDateString('tr-TR')}
                        </Text>
                        {grouped[date].map((log: any) => (
                            <Card key={log.id} style={styles.logCard}>
                                <View style={styles.logHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.logMealType}>{log.meal_type || 'Öğün'}</Text>
                                        <Text style={styles.logFoodName}>{log.food_items?.name || log.raw_text || 'İsimsiz Besin'}</Text>
                                        {log.ai_feedback && (
                                            <View style={styles.aiFeedbackContainer}>
                                                <Ionicons name="sparkles" size={14} color={Colors.primary} />
                                                <Text style={styles.aiFeedbackText}>{log.ai_feedback}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.logCalories}>{log.calories} kcal</Text>
                                        <Text style={styles.logWeight}>{log.quantity_g}g</Text>
                                    </View>
                                </View>
                                <View style={styles.logMacros}>
                                    <Text style={styles.logMacroText}>P: {log.protein_g}g • C: {log.carbs_g}g • Y: {log.fat_g}g</Text>
                                </View>
                            </Card>
                        ))}
                    </View>
                ))}
                {nutritionLogs.length === 0 && (
                    <Text style={styles.emptyText}>Henüz bir şey kaydetmediniz.</Text>
                )}
            </View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Antrenman & Beslenme</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'workout' && styles.activeTab]}
                            onPress={() => setActiveTab('workout')}
                        >
                            <Ionicons name="barbell" size={20} color={activeTab === 'workout' ? Colors.primary : Colors.textMuted} />
                            <Text style={[styles.tabText, activeTab === 'workout' && styles.activeTabText]}>Programım</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'diet' && styles.activeTab]}
                            onPress={() => setActiveTab('diet')}
                        >
                            <Ionicons name="restaurant" size={20} color={activeTab === 'diet' ? Colors.primary : Colors.textMuted} />
                            <Text style={[styles.tabText, activeTab === 'diet' && styles.activeTabText]}>Diyet Planı</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'nutrition' && styles.activeTab]}
                            onPress={() => setActiveTab('nutrition')}
                        >
                            <Ionicons name="calculator" size={20} color={activeTab === 'nutrition' ? Colors.primary : Colors.textMuted} />
                            <Text style={[styles.tabText, activeTab === 'nutrition' && styles.activeTabText]}>Beslenme</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                >
                    {activeTab === 'workout' ? renderWorkoutContent() :
                        activeTab === 'diet' ? renderDietContent() : renderNutritionContent()}
                </ScrollView>

                {/* Manual Diet Entry Modal */}
                {isManualDietMode && (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                                <Text style={styles.modalTitle}>Manuel Diyet Girişi</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Hedef / Plan Adı</Text>
                                    <TextInput
                                        style={styles.aiInputModal}
                                        placeholder="Örn: 1. Ay Hacim Planı"
                                        value={manualDietData.goal}
                                        onChangeText={t => setManualDietData({ ...manualDietData, goal: t })}
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Kalori</Text>
                                        <TextInput style={styles.aiInputModal} keyboardType="numeric" value={manualDietData.daily_calories} onChangeText={t => setManualDietData({ ...manualDietData, daily_calories: t })} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>P (g)</Text>
                                        <TextInput style={styles.aiInputModal} keyboardType="numeric" value={manualDietData.protein_g} onChangeText={t => setManualDietData({ ...manualDietData, protein_g: t })} />
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>K (g)</Text>
                                        <TextInput style={styles.aiInputModal} keyboardType="numeric" value={manualDietData.carbs_g} onChangeText={t => setManualDietData({ ...manualDietData, carbs_g: t })} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Y (g)</Text>
                                        <TextInput style={styles.aiInputModal} keyboardType="numeric" value={manualDietData.fat_g} onChangeText={t => setManualDietData({ ...manualDietData, fat_g: t })} />
                                    </View>
                                </View>

                                <Text style={[styles.label, { marginBottom: 10 }]}>Öğünler</Text>
                                {manualDietData.meals.map((meal, idx) => (
                                    <View key={idx} style={{ marginBottom: 20, padding: 10, borderLeftWidth: 2, borderLeftColor: Colors.primary }}>
                                        <TextInput
                                            style={[styles.aiInputModal, { minHeight: 40, marginBottom: 5 }]}
                                            placeholder="Öğün Adı (Örn: Kahvaltı)"
                                            value={meal.name}
                                            onChangeText={t => {
                                                const newMeals = [...manualDietData.meals];
                                                newMeals[idx].name = t;
                                                setManualDietData({ ...manualDietData, meals: newMeals });
                                            }}
                                        />
                                        <TextInput
                                            style={[styles.aiInputModal, { minHeight: 60 }]}
                                            placeholder="Yiyecekler (Virgül ile ayırın)"
                                            multiline
                                            onChangeText={t => {
                                                const newMeals = [...manualDietData.meals];
                                                newMeals[idx].items = t.split(',').map(s => s.trim());
                                                setManualDietData({ ...manualDietData, meals: newMeals });
                                            }}
                                        />
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={{ alignItems: 'center', marginBottom: 20 }}
                                    onPress={() => setManualDietData({
                                        ...manualDietData,
                                        meals: [...manualDietData.meals, { name: `${manualDietData.meals.length + 1}. Öğün`, time: '00:00', items: [''] }]
                                    })}
                                >
                                    <Text style={{ color: Colors.primary }}>+ Öğün Ekle</Text>
                                </TouchableOpacity>

                                <View style={styles.modalFooter}>
                                    <TouchableOpacity
                                        style={styles.btnSecondary}
                                        onPress={() => {
                                            setManualDietData({ goal: '', daily_calories: '', protein_g: '', carbs_g: '', fat_g: '', meals: [{ name: '1. Öğün', time: '08:00', items: [''] }] });
                                            setIsManualDietMode(false);
                                        }}
                                    >
                                        <Text style={styles.btnSecondaryText}>Vazgeç</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.aiLogBtn} onPress={handleManualDietSubmit}>
                                        {aiLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.aiLogBtnText}>Kaydet</Text>}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                )}

                {/* Logging Modal */}
                {isLogging && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Besin Ara</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Besin ismi girin..."
                                placeholderTextColor="#666"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />

                            <ScrollView style={{ maxHeight: 300, marginTop: 15 }}>
                                {foods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(food => (
                                    <TouchableOpacity
                                        key={food.id}
                                        style={styles.foodItem}
                                        onPress={async () => {
                                            try {
                                                const { addNutritionLog } = await import('@/services/api');
                                                await addNutritionLog({
                                                    food_item_id: food.id,
                                                    quantity_g: 100,
                                                    meal_type: 'Atıştırmalık'
                                                });
                                                setIsLogging(false);
                                                loadData();
                                            } catch (e) { console.error(e); }
                                        }}
                                    >
                                        <Text style={styles.foodName}>{food.name}</Text>
                                        <Text style={styles.foodMacros}>100g: {food.calories_100g} kcal</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity style={styles.closeBtn} onPress={() => setIsLogging(false)}>
                                <Text style={styles.closeBtnText}>İptal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </TouchableWithoutFeedback>
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
    tabs: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTab: {
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderColor: Colors.primary,
    },
    tabText: {
        color: Colors.textMuted,
        fontWeight: '700',
        fontSize: 14,
    },
    activeTabText: {
        color: Colors.text,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    emptyText: {
        color: Colors.textMuted,
        textAlign: 'center',
        fontSize: 16,
    },
    programCard: {
        padding: 0,
        overflow: 'hidden',
        marginBottom: 24,
    },
    programHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    programTitle: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    programDates: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    activeBadge: {
        backgroundColor: Colors.success,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    daysScroll: {
        padding: 16,
        gap: 12,
    },
    dayButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        minWidth: 80,
    },
    dayButtonActive: {
        backgroundColor: Colors.primary,
    },
    dayText: {
        color: Colors.textMuted,
        fontWeight: '700',
        marginBottom: 4,
    },
    dayTextActive: {
        color: '#fff',
    },
    muscleText: {
        color: Colors.text,
        fontSize: 12,
        fontWeight: '600',
    },
    muscleTextActive: {
        color: '#fff',
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    exercisesList: {
        gap: 16,
    },
    exerciseCard: {
        padding: 16,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    exerciseNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseNumberText: {
        color: Colors.primary,
        fontWeight: '800',
        fontSize: 16,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    exerciseDetails: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    setsInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
        padding: 12,
    },
    setStat: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '800',
    },
    statLabel: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    restText: {
        color: Colors.success,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 20,
    },
    dietHeaderCard: {
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
    },
    dietGoal: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 20,
    },
    macroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    macroStat: {
        alignItems: 'center',
    },
    macroVal: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.text,
    },
    macroLab: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 4,
    },
    mealCard: {
        padding: 20,
        marginBottom: 16,
    },
    mealName: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '800',
    },
    mealTime: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
        marginTop: 4,
    },
    mealItems: {
        gap: 8,
    },
    mealItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mealItemText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 53, 0.2)',
    },
    editButtonText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    hybridActions: {
        marginBottom: 24,
    },
    manualEntryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
    },
    manualEntryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    manualHistoryCard: {
        marginBottom: 12,
        padding: 16,
    },
    manualHistoryContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    manualHistoryName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    manualHistoryDate: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    completeWorkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
    },
    completeWorkoutBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    aiSubtitle: {
        color: Colors.textMuted,
        fontSize: 14,
        marginBottom: 16,
    },
    aiInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    aiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    aiBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    aiResultContainer: {
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.3)',
    },
    aiResultTitle: {
        color: Colors.success,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 12,
    },
    aiResultGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    aiResultText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
        width: '45%',
    },
    aiSaveBtn: {
        backgroundColor: Colors.success,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    aiSaveBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    macroCard: {
        padding: 20,
        marginBottom: 20,
    },
    addFoodBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    addFoodText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    logCard: {
        padding: 16,
        marginBottom: 12,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    logFoodName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    logWeight: {
        color: Colors.primary,
        fontWeight: '700',
    },
    logMacros: {
        opacity: 0.7,
    },
    logMacroText: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#1E1E2E',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,107,53,0.2)',
    },
    modalTitle: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 20,
    },
    foodItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    foodName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    foodMacros: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    closeBtn: {
        marginTop: 20,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        alignItems: 'center',
    },
    closeBtnText: {
        color: Colors.text,
        fontWeight: '700',
    },
    aiFeedbackContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 107, 53, 0.05)',
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    aiFeedbackText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    btnSecondary: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnSecondaryText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    // AI & DIET ENHANCEMENTS
    dietAiContainer: {
        marginTop: 10,
    },
    dietAiCard: {
        padding: 24,
    },
    dietAiTitle: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
    },
    dietAiSubtitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    dietAiInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    dietAiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: Colors.primary,
        padding: 18,
        borderRadius: 16,
    },
    dietAiBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    logMealType: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    logCalories: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    modalSubtitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: 20,
    },
    aiInputModal: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    aiLogBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
    },
    aiLogBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    orText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 16,
    },
    label: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 4,
    },
    formGroup: {
        marginBottom: 16,
    },
    header: {
        padding: 24,
        paddingTop: 40,
        backgroundColor: Colors.surface,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.text,
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    modalInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        marginBottom: 12,
    },
});
