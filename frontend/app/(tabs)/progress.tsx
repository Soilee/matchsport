import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Line, Polyline } from 'react-native-svg';

import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { getDashboard } from '@/services/api';
import { BodyMeasurement, PRRecord } from '@/types';
import { router } from 'expo-router';

export default function ProgressScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
    const [prs, setPrs] = useState<PRRecord[]>([]);

    const loadData = useCallback(async () => {
        try {
            const data = await getDashboard();
            setMeasurements(data.measurements);
            setPrs(data.prRecords);
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

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // Very simplified sparklines for demo
    const renderSparkline = (dataKey: keyof BodyMeasurement, baseColor: string, height = 60) => {
        if (measurements.length < 2) return null;

        const width = Dimensions.get('window').width - 80;
        const values = measurements.map(m => Number(m[dataKey]));
        const min = Math.min(...values) * 0.95;
        const max = Math.max(...values) * 1.05;
        const range = max - min || 1;

        const points = values.map((val, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        }).join(' ');

        const lastVal = values[values.length - 1];

        return (
            <View style={{ height, width: '100%' }}>
                <Svg height="100%" width="100%">
                    <Polyline points={points} fill="none" stroke={baseColor} strokeWidth="3" strokeLinejoin="round" />
                </Svg>
                <View style={styles.chartOverlay}>
                    <Text style={[styles.chartOverlayText, { color: baseColor }]}>
                        {lastVal}{dataKey === 'weight_kg' ? ' kg' : '%'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >

                <View style={styles.header}>
                    <Text style={styles.title}>Gelişimim</Text>
                    <Text style={styles.subtitle}>Matchless Değişim Serüvenin</Text>
                </View>

                <Card style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Vücut Ölçüleri</Text>
                        <Text style={styles.summaryValue}>{measurements.length}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Rekorlar (PR)</Text>
                        <Text style={styles.summaryValue}>{prs.length}</Text>
                    </View>
                </Card>

                <Card title="Kilo Değişimi" style={styles.chartCard}>
                    {renderSparkline('weight_kg', Colors.info)}
                </Card>

                <Card title="Yağ Oranı (%)" style={styles.chartCard}>
                    {renderSparkline('body_fat_pct', Colors.success)}
                </Card>
                <Card title="Kişisel Rekorlar (PR)" style={styles.prCard}>
                    {prs.map(pr => (
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
                    ))}
                </Card>
            </ScrollView>
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
    },
    chartOverlay: {
        position: 'absolute',
        right: 0,
        top: -25,
    },
    chartOverlayText: {
        fontSize: 20,
        fontWeight: '800',
    },
    prCard: {
        padding: 0,
        overflow: 'hidden',
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
    }
});
