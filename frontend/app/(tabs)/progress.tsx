import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Polyline } from 'react-native-svg';

import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { getDashboard, addMeasurement } from '@/services/api';
import { BodyMeasurement, PRRecord } from '@/types';
import { router } from 'expo-router';

export default function ProgressScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
    const [prs, setPrs] = useState<PRRecord[]>([]);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newMsg, setNewMsg] = useState({
        weight_kg: '',
        body_fat_pct: '',
        height_cm: '',
        shoulder_cm: '',
        bicep_cm: '',
        waist_cm: '',
        chest_cm: ''
    });

    const loadData = useCallback(async () => {
        try {
            const data = await getDashboard();
            setMeasurements(data.measurements || []);
            setPrs(data.prRecords || []);
        } catch (error: any) {
            console.error('Progress load error:', error);
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

    const handleSaveMeasurement = async () => {
        if (!newMsg.weight_kg) {
            Alert.alert('Hata', 'Kilo girişi zorunludur.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                weight_kg: parseFloat(newMsg.weight_kg),
                body_fat_pct: newMsg.body_fat_pct ? parseFloat(newMsg.body_fat_pct) : null,
                height_cm: newMsg.height_cm ? parseFloat(newMsg.height_cm) : null,
                shoulder_cm: newMsg.shoulder_cm ? parseFloat(newMsg.shoulder_cm) : null,
                bicep_cm: newMsg.bicep_cm ? parseFloat(newMsg.bicep_cm) : null,
                waist_cm: newMsg.waist_cm ? parseFloat(newMsg.waist_cm) : null,
                chest_cm: newMsg.chest_cm ? parseFloat(newMsg.chest_cm) : null,
            };
            await addMeasurement(payload);
            setIsModalVisible(false);
            setNewMsg({
                weight_kg: '', body_fat_pct: '', height_cm: '',
                shoulder_cm: '', bicep_cm: '', waist_cm: '', chest_cm: ''
            });
            loadData();
            Alert.alert('Başarılı', 'Ölçümleriniz kaydedildi.');
        } catch (error) {
            console.error('Save Measurement Error:', error);
            Alert.alert('Hata', 'Kayıt sırasında bir problem oluştu.');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const renderSparkline = (dataKey: keyof BodyMeasurement, baseColor: string, label: string, unit: string, height = 60) => {
        const validMeasurements = measurements.filter(m => m[dataKey] !== null && m[dataKey] !== undefined);
        if (validMeasurements.length < 1) return (
            <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>{label} verisi bulunmuyor</Text>
            </View>
        );

        const width = Dimensions.get('window').width - 80;
        const values = validMeasurements.map(m => Number(m[dataKey])).reverse(); // Reverse to show oldest to newest left-to-right
        const lastVal = values[values.length - 1];

        if (values.length < 2) {
            return (
                <View style={styles.singleValueContainer}>
                    <Text style={[styles.chartOverlayText, { color: baseColor }]}>
                        {lastVal} {unit}
                    </Text>
                    <Text style={styles.singleValueLabel}>İlk ölçüm kaydedildi</Text>
                </View>
            );
        }

        const min = Math.min(...values) * 0.98;
        const max = Math.max(...values) * 1.02;
        const range = max - min || 1;

        const points = values.map((val, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        }).join(' ');

        return (
            <View style={{ height, width: '100%', marginTop: 10 }}>
                <Svg height="100%" width="100%">
                    <Polyline points={points} fill="none" stroke={baseColor} strokeWidth="3" strokeLinejoin="round" />
                </Svg>
                <View style={styles.chartOverlay}>
                    <Text style={[styles.chartOverlayText, { color: baseColor }]}>
                        {lastVal} {unit}
                    </Text>
                </View>
            </View>
        );
    };

    const measurementTypes = [
        { key: 'weight_kg', label: 'Kilo', unit: 'kg', color: Colors.info },
        { key: 'body_fat_pct', label: 'Yağ Oranı', unit: '%', color: Colors.success },
        { key: 'height_cm', label: 'Boy', unit: 'cm', color: Colors.primary },
        { key: 'shoulder_cm', label: 'Omuz', unit: 'cm', color: '#FF9F0A' },
        { key: 'chest_cm', label: 'Göğüs', unit: 'cm', color: '#FF375F' },
        { key: 'waist_cm', label: 'Bel', unit: 'cm', color: '#5856D6' },
        { key: 'bicep_cm', label: 'V-Kol', unit: 'cm', color: '#64D2FF' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >

                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Gelişimim</Text>
                        <Text style={styles.subtitle}>Matchless Değişim Serüvenin</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <Card style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Ölçüm Sayısı</Text>
                        <Text style={styles.summaryValue}>{measurements.length}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Rekorlar (PR)</Text>
                        <Text style={styles.summaryValue}>{prs.length}</Text>
                    </View>
                </Card>

                {measurementTypes.map((type) => (
                    <Card key={type.key} title={type.label} style={styles.chartCard}>
                        {renderSparkline(type.key as any, type.color, type.label, type.unit)}
                    </Card>
                ))}

                <Card title="Kişisel Rekorlar (PR)" style={styles.prCard}>
                    {prs.length > 0 ? prs.map(pr => (
                        <View key={pr.id} style={styles.prRow}>
                            <View style={styles.prInfo}>
                                <Text style={styles.prName}>{pr.exercise_name}</Text>
                                <Text style={styles.prDate}>{new Date(pr.achieved_at).toLocaleDateString('tr-TR')}</Text>
                            </View>
                            <View style={styles.prScore}>
                                <Text style={styles.prWeight}>{pr.max_weight_kg} kg</Text>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                            </View>
                        </View>
                    )) : (
                        <View style={styles.emptyPr}>
                            <Text style={styles.emptyPrText}>Henüz kaydedilmiş PR bulunmuyor.</Text>
                        </View>
                    )}
                </Card>
            </ScrollView>

            {/* Entry Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni Ölçüm Ekle</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Kilo (kg) *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="80.5"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="numeric"
                                    value={newMsg.weight_kg}
                                    onChangeText={(val) => setNewMsg({ ...newMsg, weight_kg: val })}
                                />
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Boy (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="180"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={newMsg.height_cm}
                                        onChangeText={(val) => setNewMsg({ ...newMsg, height_cm: val })}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Yağ Oranı (%)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="15.5"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={newMsg.body_fat_pct}
                                        onChangeText={(val) => setNewMsg({ ...newMsg, body_fat_pct: val })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Omuz (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="120"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={newMsg.shoulder_cm}
                                        onChangeText={(val) => setNewMsg({ ...newMsg, shoulder_cm: val })}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Göğüs (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="105"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={newMsg.chest_cm}
                                        onChangeText={(val) => setNewMsg({ ...newMsg, chest_cm: val })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Bel (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="85"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={newMsg.waist_cm}
                                        onChangeText={(val) => setNewMsg({ ...newMsg, waist_cm: val })}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>V-Kol (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="40"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={newMsg.bicep_cm}
                                        onChangeText={(val) => setNewMsg({ ...newMsg, bicep_cm: val })}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveButton, saving && { opacity: 0.7 }]}
                            onPress={handleSaveMeasurement}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    addButton: {
        backgroundColor: Colors.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    summaryCard: {
        flexDirection: 'row',
        padding: 20,
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginBottom: 4,
    },
    summaryValue: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    chartCard: {
        padding: 20,
        minHeight: 120,
    },
    chartOverlay: {
        position: 'absolute',
        right: 0,
        top: -35,
    },
    chartOverlayText: {
        fontSize: 20,
        fontWeight: '800',
    },
    emptyChart: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyChartText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontStyle: 'italic',
    },
    singleValueContainer: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    singleValueLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 4,
    },
    prCard: {
        padding: 0,
        overflow: 'hidden',
        marginBottom: 40,
    },
    prRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    prInfo: {
        flex: 1,
    },
    prName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    prDate: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    prScore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    prWeight: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: '700',
    },
    emptyPr: {
        padding: 30,
        alignItems: 'center',
    },
    emptyPrText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.text,
    },
    modalForm: {
        marginBottom: 20,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 14,
        color: Colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
    }
});
