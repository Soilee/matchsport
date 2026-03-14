import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { getDashboard } from '@/services/api';
import { LeaderboardEntry } from '@/types';
import { router } from 'expo-router';

export default function LeaderboardScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'attendance' | 'strength'>('attendance');
    const [data, setData] = useState<{ attendance: LeaderboardEntry[], strength: LeaderboardEntry[] } | null>(null);

    const loadData = useCallback(async () => {
        try {
            const dashboardData = await getDashboard();
            setData(dashboardData.leaderboard);
        } catch (error: any) {
            console.error('LB load error:', error);
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

    const maskName = (name: string) => {
        const parts = name.split(' ');
        if (parts.length < 2) return name[0] + '****';
        return parts.map(p => p[0] + '****').join(' ');
    };

    const renderItem = (item: LeaderboardEntry, index: number) => {
        const isTop3 = index < 3;
        const medals = [Colors.gold, Colors.silver, Colors.bronze];
        const maskedName = maskName(item.display_name);

        return (
            <View key={item.id} style={styles.item}>
                <View style={styles.rankContainer}>
                    {isTop3 ? (
                        <Ionicons name="trophy" size={20} color={medals[index]} />
                    ) : (
                        <Text style={styles.rankText}>{index + 1}.</Text>
                    )}
                </View>

                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.display_name[0]}</Text>
                </View>

                <View style={styles.info}>
                    <Text style={styles.name}>{maskedName}</Text>
                    {activeTab === 'attendance' && (
                        <Text style={styles.streak}>🔥 {item.current_streak} gün seri</Text>
                    )}
                </View>

                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>
                        {activeTab === 'attendance' ? item.monthly_visits : item.monthly_visits}
                    </Text>
                    <Text style={styles.scoreSubtext}>
                        {activeTab === 'attendance' ? 'giriş' : 'kg'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const currentList = activeTab === 'attendance' ? data?.attendance : data?.strength;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'strength' && styles.activeTab]}
                    onPress={() => setActiveTab('strength')}
                >
                    <Ionicons name="barbell" size={20} color={activeTab === 'strength' ? Colors.primary : Colors.textMuted} />
                    <Text style={[styles.tabText, activeTab === 'strength' && styles.activeTabText]}>En Güçlüler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
                    onPress={() => setActiveTab('attendance')}
                >
                    <Ionicons name="flame" size={20} color={activeTab === 'attendance' ? Colors.primary : Colors.textMuted} />
                    <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>En Çok Gelenler</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                <Card style={styles.lbCard}>
                    {currentList?.map((item, index) => renderItem(item, index))}
                </Card>

                <View style={styles.kvkkBox}>
                    <Ionicons name="shield-checkmark" size={14} color={Colors.textMuted} />
                    <Text style={styles.kvkkText}>Liderlik tablosu KVKK uyumlu olarak anonimleştirilmiştir.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    },
    lbCard: {
        padding: 0,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
    },
    rankText: {
        color: Colors.textMuted,
        fontWeight: '800',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 107, 53, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    avatarText: {
        color: Colors.primary,
        fontWeight: '700',
    },
    info: {
        flex: 1,
    },
    name: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    streak: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    scoreContainer: {
        alignItems: 'flex-end',
    },
    scoreText: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: '900',
    },
    scoreSubtext: {
        color: Colors.textMuted,
        fontSize: 10,
        textTransform: 'uppercase',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    kvkkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 20,
        opacity: 0.6,
    },
    kvkkText: {
        color: Colors.textMuted,
        fontSize: 12,
    }
});
