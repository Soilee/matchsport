import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { getDashboard, getInstallments } from '@/services/api';
import { router } from 'expo-router';

export default function MembershipDetailScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<any>(null);
    const [installments, setInstallments] = useState<any[]>([]);

    const loadData = async () => {
        try {
            const [dash, inst] = await Promise.all([getDashboard(), getInstallments()]);
            setData(dash);
            setInstallments(inst);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const membership = data?.user?.memberships?.[0];
    const totalPaid = membership?.amount || 0;
    const totalPrice = membership?.total_price || 0;
    const remainingDebt = totalPrice - totalPaid;
    const progress = totalPrice > 0 ? (totalPaid / totalPrice) : 0;

    if (loading && !refreshing) return <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ödeme Bilgileri</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
                keyboardDismissMode="on-drag"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
            >
                <View style={styles.businessCard}>
                    <Text style={styles.businessName}>Matchless Fitness 7/24</Text>
                </View>

                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <Text style={styles.statLabel}>Toplam Tutar</Text>
                        <Text style={styles.statValue}>{totalPrice.toLocaleString('tr-TR')} ₺</Text>
                        <Text style={styles.statSub}>{membership?.package_type || 'Paket'}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statLabel}>Toplam Ödenen</Text>
                        <Text style={styles.statValue}>{totalPaid.toLocaleString('tr-TR')} ₺</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statLabel}>Sonraki Ödeme</Text>
                        <Text style={styles.statValue}>
                            {membership?.next_payment_date ? new Date(membership.next_payment_date).toLocaleDateString('tr-TR') : '-'}
                        </Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statLabel}>Kalan Ödeme</Text>
                        <Text style={[styles.statValue, { color: remainingDebt > 0 ? '#34C759' : '#34C759' }]}>
                            {remainingDebt.toLocaleString('tr-TR')} ₺
                        </Text>
                        <Text style={styles.statSub}>Kalan Taksit: {installments.filter(i => i.status === 'pending').length}</Text>
                    </Card>
                </View>

                <Text style={styles.sectionTitle}>İşletme Taksitleri</Text>

                {installments.map((inst, idx) => (
                    <Card key={inst.id} style={StyleSheet.flatten([styles.installmentCard, inst.status === 'paid' ? styles.paidBorder : styles.pendingBorder])}>
                        <View style={styles.instHeader}>
                            <Text style={styles.instLabel}>{idx + 1}. Taksit</Text>
                            <View style={styles.instMeta}>
                                <Text style={styles.instDate}>{new Date(inst.due_date).toLocaleDateString('tr-TR')}</Text>
                                <View style={[styles.statusBadge, inst.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                                    <Text style={styles.statusText}>{inst.status === 'paid' ? 'ÖDENDİ' : 'BEKLEYEN'}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.instFooter}>
                            <Text style={styles.instAmount}>{inst.amount.toLocaleString('tr-TR')} ₺</Text>
                            <View style={styles.instIndicators}>
                                <View style={styles.indicatorItem}><View style={[styles.dot, { backgroundColor: '#FF3B30' }]} /><Text style={styles.indicatorText}>Bekleyen {'\n'} {inst.status === 'paid' ? '0,00' : inst.amount.toLocaleString('tr-TR')}</Text></View>
                                <View style={styles.indicatorItem}><View style={[styles.dot, { backgroundColor: '#34C759' }]} /><Text style={styles.indicatorText}>Ödenen {'\n'} {inst.status === 'paid' ? inst.amount.toLocaleString('tr-TR') : '0,00'}</Text></View>
                            </View>
                        </View>
                    </Card>
                ))}

                {installments.length === 0 && (
                    <Text style={styles.emptyText}>Henüz taksit planı oluşturulmamış.</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    businessCard: { backgroundColor: '#1C1C1E', padding: 12, borderRadius: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    businessName: { color: '#fff', fontSize: 14, fontWeight: '600' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statCard: { width: '48%', padding: 16, backgroundColor: '#000', borderWidth: 1, borderColor: '#333', borderRadius: 20 },
    statLabel: { color: '#fff', opacity: 0.8, fontSize: 12, fontWeight: '600', marginBottom: 4 },
    statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
    statSub: { color: '#666', fontSize: 11, marginTop: 4 },
    progressBar: { height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8 },
    progressFill: { height: '100%', backgroundColor: '#FF6B35', borderRadius: 2 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
    installmentCard: { padding: 16, marginBottom: 12, backgroundColor: '#000', borderWidth: 1, borderRadius: 20 },
    paidBorder: { borderColor: '#34C759', opacity: 0.8 },
    pendingBorder: { borderColor: '#FF6B35' },
    instHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    instLabel: { color: '#666', fontSize: 12 },
    instMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    instDate: { color: '#666', fontSize: 12 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusPaid: { backgroundColor: 'rgba(52, 199, 89, 0.2)' },
    statusPending: { backgroundColor: 'rgba(255, 59, 48, 0.2)' },
    statusText: { fontSize: 10, fontWeight: '800' },
    statusPaidText: { color: '#34C759' },
    instFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    instAmount: { color: '#fff', fontSize: 20, fontWeight: '800' },
    instIndicators: { flexDirection: 'row', gap: 12 },
    indicatorItem: { flexDirection: 'row', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
    indicatorText: { color: '#fff', fontSize: 10, fontWeight: '600', lineHeight: 14 },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
});
