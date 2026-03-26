import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal } from 'react-native';
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
    const [originalDiet, setOriginalDiet] = useState<DietPlan | null>(null);
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

            // Set initial selected day to today
            const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const today = dayNames[new Date().getDay()];
            const todayData = workoutData.days.find((d: any) => d.day_of_week === today);
            if (todayData) setSelectedDayId(todayData.id);
            else if (workoutData.days.length > 0) setSelectedDayId(workoutData.days[0].id);

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

    const [selectedMeal, setSelectedMeal] = useState('1. Öğün');
    const mealOptions = ['1. Öğün', '2. Öğün', '3. Öğün', '4. Öğün', '5. Öğün', 'Atıştırmalık', 'Antrenman Öncesi', 'Antrenman Sonrası'];

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
            await logAiMeal(aiInput, selectedMeal);
            setAiInput('');
            setIsLogging(false);
            Alert.alert('Başarılı', 'Öğün analiz edildi ve kaydedildi! ✨');
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
                {/* 2. Hybrid Actions (Smart Visibility) */}
                {(!program && !manualWorkouts.some(mw => new Date(mw.created_at).toDateString() === new Date().toDateString())) && (
                    <View style={styles.hybridActions}>
                        <TouchableOpacity style={styles.manualEntryBtn} onPress={() => router.push('/workouts/manual' as any)}>
                            <Ionicons name="add-circle" size={24} color="#fff" />
                            <Text style={styles.manualEntryText}>Kendi Antrenmanını Gir</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 3. Official Exercise List (Accordion Style) */}
                <View style={styles.exercisesList}>
                    {days.map((day, dIdx) => {
                        const isExpanded = selectedDayId === day.id;
                        return (
                            <View key={day.id} style={{ marginBottom: 12 }}>
                                <TouchableOpacity
                                    style={[styles.accordionHeader, isExpanded && styles.accordionHeaderActive]}
                                    onPress={() => setSelectedDayId(isExpanded ? null : day.id)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={[styles.dayCircle, isExpanded && styles.dayCircleActive]}>
                                            <Text style={[styles.dayCircleText, isExpanded && styles.dayCircleTextActive]}>
                                                {dayMap[day.day_of_week] || day.day_of_week}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={styles.muscleText}>{day.muscle_group || 'Dinlenme Günü'}</Text>
                                            <Text style={styles.exerciseCountText}>{day.exercises?.length || 0} Hareket</Text>
                                        </View>
                                    </View>
                                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={isExpanded ? "#fff" : Colors.textMuted} />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.accordionContent}>
                                        {day.exercises.map((ex: Exercise, idx: number) => (
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
                                                    <TouchableOpacity style={styles.howToBtn} onPress={() => Alert.alert('Nasıl Yapılır?', `${ex.name} hareketi için video hazırlıyoruz! ✨`)}>
                                                        <Ionicons name="videocam-outline" size={20} color={Colors.primary} />
                                                    </TouchableOpacity>
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

                                        {/* Complete Day Button */}
                                        <TouchableOpacity
                                            style={styles.completeWorkoutBtn}
                                            onPress={async () => {
                                                try {
                                                    setLoading(true);
                                                    const { completeWorkoutDay } = await import('@/services/api');
                                                    await completeWorkoutDay(day.id);
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
                                            <Text style={styles.completeWorkoutBtnText}>GÜNÜ BİTİRDİM</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* 4. Manual History (NEW) */}
                {manualWorkouts.length > 0 && (
                    <View style={{ marginTop: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.sectionTitle}>Son Manuel Girişler</Text>
                        </View>
                        {manualWorkouts.map(mw => (
                            <Card key={mw.id} style={styles.manualHistoryCard}>
                                <View style={styles.manualHistoryContent}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.manualHistoryName}>{mw.workout_name}</Text>
                                        <Text style={styles.manualHistoryDate}>
                                            {new Date(mw.created_at).toLocaleDateString('tr-TR')}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity onPress={() => router.push({ pathname: '/workouts/manual', params: { id: mw.id } } as any)}>
                                            <Ionicons name="create-outline" size={22} color={Colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => {
                                            Alert.alert('Sil', 'Bu antrenmanı silmek istediğine emin misin?', [
                                                { text: 'Vazgeç', style: 'cancel' },
                                                {
                                                    text: 'Sil', style: 'destructive', onPress: async () => {
                                                        try {
                                                            const { supabase } = await import('@/services/supabase');
                                                            await supabase.from('user_manual_workouts').delete().eq('id', mw.id);
                                                            loadData();
                                                        } catch (e) { Alert.alert('Hata', 'Silinemedi'); }
                                                    }
                                                }
                                            ]);
                                        }}>
                                            <Ionicons name="trash-outline" size={22} color={Colors.error || '#ff4444'} />
                                        </TouchableOpacity>
                                    </View>
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
                    {originalDiet && (
                        <TouchableOpacity
                            style={[styles.dietAiBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.textMuted, marginTop: 12, marginHorizontal: 20 }]}
                            onPress={() => { setDiet(originalDiet); setOriginalDiet(null); }}
                        >
                            <Ionicons name="arrow-back" size={18} color={Colors.textMuted} />
                            <Text style={[styles.dietAiBtnText, { color: Colors.textMuted }]}>Vazgeç</Text>
                        </TouchableOpacity>
                    )}
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
                            <TouchableOpacity onPress={() => { setOriginalDiet(diet); setDiet(null); }}>
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

                {/* 2. Log Meal Modal */}
                <Modal visible={isLogging} transparent animationType="slide">
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Ne Yedin? 🥗</Text>

                                <Text style={styles.label}>Öğün Seçimi</Text>
                                <View style={styles.mealSelector}>
                                    {mealOptions.map(m => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.mealOption, selectedMeal === m && styles.selectedMealOption]}
                                            onPress={() => setSelectedMeal(m)}
                                        >
                                            <Text style={[styles.mealOptionText, selectedMeal === m && styles.selectedMealOptionText]}>{m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Örn: 1 kase yulaf, 2 tam yumurta ve 1 muz"
                                    placeholderTextColor={Colors.textMuted}
                                    value={aiInput}
                                    onChangeText={setAiInput}
                                    multiline
                                />

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity style={[styles.aiBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)' }]} onPress={() => setIsLogging(false)}>
                                        <Text style={styles.aiBtnText}>İptal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.aiBtn, { flex: 2 }]} onPress={handleAiMealLog} disabled={aiLoading}>
                                        {aiLoading ? <ActivityIndicator color="#fff" /> : (
                                            <>
                                                <Ionicons name="sparkles" size={20} color="#fff" />
                                                <Text style={styles.aiBtnText}>Analiz Et & Kaydet</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

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
                    <Modal visible={isManualDietMode} transparent animationType="slide">
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalOverlay}>
                                <KeyboardAvoidingView
                                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                    style={{ width: '100%', alignItems: 'center' }}
                                >
                                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                                        <Text style={styles.modalTitle}>Diyet Planı Oluştur</Text>
                                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                            <Text style={styles.label}>Hedefiniz</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Örn: Yağ yakımı ve kas kazanımı"
                                                placeholderTextColor={Colors.textMuted}
                                                value={manualDietData.goal}
                                                onChangeText={(val) => setManualDietData({ ...manualDietData, goal: val })}
                                            />

                                            <View style={styles.row}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.label}>Kalori</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        placeholder="2500"
                                                        keyboardType="numeric"
                                                        placeholderTextColor={Colors.textMuted}
                                                        value={manualDietData.daily_calories}
                                                        onChangeText={(val) => setManualDietData({ ...manualDietData, daily_calories: val })}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.label}>Protein (g)</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        placeholder="180"
                                                        keyboardType="numeric"
                                                        placeholderTextColor={Colors.textMuted}
                                                        value={manualDietData.protein_g}
                                                        onChangeText={(val) => setManualDietData({ ...manualDietData, protein_g: val })}
                                                    />
                                                </View>
                                            </View>

                                            <View style={styles.row}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.label}>Karb (g)</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        placeholder="200"
                                                        keyboardType="numeric"
                                                        placeholderTextColor={Colors.textMuted}
                                                        value={manualDietData.carbs_g}
                                                        onChangeText={(val) => setManualDietData({ ...manualDietData, carbs_g: val })}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.label}>Yağ (g)</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        placeholder="70"
                                                        keyboardType="numeric"
                                                        placeholderTextColor={Colors.textMuted}
                                                        value={manualDietData.fat_g}
                                                        onChangeText={(val) => setManualDietData({ ...manualDietData, fat_g: val })}
                                                    />
                                                </View>
                                            </View>

                                            <Text style={[styles.label, { marginTop: 12 }]}>Öğünler</Text>
                                            {manualDietData.meals.map((meal, idx) => (
                                                <View key={idx} style={styles.mealEditCard}>
                                                    <View style={styles.row}>
                                                        <TextInput
                                                            style={[styles.modalInput, { flex: 2, marginBottom: 0 }]}
                                                            value={meal.name}
                                                            onChangeText={(val) => {
                                                                const newMeals = [...manualDietData.meals];
                                                                newMeals[idx].name = val;
                                                                setManualDietData({ ...manualDietData, meals: newMeals });
                                                            }}
                                                        />
                                                        <TextInput
                                                            style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                                                            value={meal.time}
                                                            onChangeText={(val) => {
                                                                const newMeals = [...manualDietData.meals];
                                                                newMeals[idx].time = val;
                                                                setManualDietData({ ...manualDietData, meals: newMeals });
                                                            }}
                                                        />
                                                    </View>
                                                </View>
                                            ))}
                                            <TouchableOpacity
                                                style={{ alignItems: 'center', marginVertical: 12 }}
                                                onPress={() => setManualDietData({
                                                    ...manualDietData,
                                                    meals: [...manualDietData.meals, { name: `${manualDietData.meals.length + 1}. Öğün`, time: '00:00', items: [''] }]
                                                })}
                                            >
                                                <Text style={{ color: Colors.primary, fontWeight: '700' }}>+ Öğün Ekle</Text>
                                            </TouchableOpacity>
                                        </ScrollView>

                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                            <TouchableOpacity style={[styles.aiBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)' }]} onPress={() => setIsManualDietMode(false)}>
                                                <Text style={styles.aiBtnText}>İptal</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.aiBtn, { flex: 2 }]} onPress={handleManualDietSubmit}>
                                                <Text style={styles.aiBtnText}>Planı Kaydet</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </KeyboardAvoidingView>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
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
        </TouchableWithoutFeedback >
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
    },
    header: {
        paddingVertical: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.text,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 4,
        marginHorizontal: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
    },
    tabText: {
        color: Colors.textMuted,
        fontWeight: '700',
        fontSize: 13,
    },
    activeTabText: {
        color: Colors.primary,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    programCard: {
        padding: 0,
        overflow: 'hidden',
        marginBottom: 20,
    },
    programHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    activeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    daysScroll: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    dayButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 80,
    },
    dayButtonActive: {
        backgroundColor: Colors.primary,
    },
    dayText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    dayTextActive: {
        color: '#fff',
    },
    muscleText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    muscleTextActive: {
        color: '#fff',
    },
    hybridActions: {
        marginBottom: 24,
    },
    manualEntryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    manualEntryText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    // Accordion Styles
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    accordionHeaderActive: {
        backgroundColor: 'rgba(255, 107, 53, 0.05)',
        borderColor: 'rgba(255, 107, 53, 0.2)',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    dayCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCircleActive: {
        backgroundColor: Colors.primary,
    },
    dayCircleText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '800',
    },
    dayCircleTextActive: {
        color: '#fff',
    },
    exerciseCountText: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    accordionContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        padding: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 53, 0.1)',
        gap: 12,
    },
    howToBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exercisesList: {
        gap: 8,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
    },
    exerciseCard: {
        padding: 16,
        marginBottom: 4,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    exerciseNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseNumberText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '900',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    exerciseDetails: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    setsInfo: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 12,
    },
    setStat: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    statLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    completeWorkoutBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 20,
    },
    completeWorkoutBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        color: Colors.textMuted,
        textAlign: 'center',
        fontSize: 14,
    },
    manualHistoryCard: {
        padding: 16,
        marginBottom: 12,
    },
    manualHistoryContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    manualHistoryName: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    manualHistoryDate: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    dietHeaderCard: {
        padding: 20,
        marginBottom: 8,
    },
    dietGoal: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16,
        textAlign: 'center',
    },
    macroRow: {
        flexDirection: 'row',
        gap: 12,
    },
    macroStat: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    macroVal: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    macroLab: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    mealCard: {
        padding: 16,
        marginBottom: 4,
    },
    mealName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    mealTime: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    mealItems: {
        marginTop: 12,
        gap: 8,
    },
    mealItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mealItemText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    macroCard: {
        padding: 20,
        marginBottom: 20,
    },
    addFoodBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    addFoodText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
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
    logMealType: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    logFoodName: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    logCalories: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '800',
    },
    logWeight: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    logMacros: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 8,
    },
    logMacroText: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 420,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    mealSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    mealOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    selectedMealOption: {
        backgroundColor: Colors.primary,
    },
    mealOptionText: {
        color: Colors.text,
        fontSize: 13,
        fontWeight: '600',
    },
    selectedMealOptionText: {
        color: '#fff',
    },
    modalInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 15,
        marginBottom: 16,
    },
    aiBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    aiBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    mealEditCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    aiFeedbackContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        backgroundColor: 'rgba(255, 107, 53, 0.05)',
        padding: 8,
        borderRadius: 8,
    },
    aiFeedbackText: {
        color: Colors.text,
        fontSize: 11,
        fontStyle: 'italic',
        flex: 1,
    },
    dietAiContainer: {
        marginBottom: 20,
    },
    dietAiCard: {
        padding: 24,
    },
    dietAiTitle: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    dietAiSubtitle: {
        color: Colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    dietAiInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 14,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    dietAiBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    dietAiBtnText: {
        color: '#fff',
        fontWeight: '800',
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
    }
});
