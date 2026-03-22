import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { adminPayInstallment } from '@/services/api';

interface Installment {
    id: string;
    amount: number;
    due_date: string;
    users?: { full_name: string };
}

interface Props {
    adminStats: {
        totalMembers: number;
        activeMembers: number;
        totalRevenue: number;
        pendingInstallments?: Installment[];
    };
    occupancy: {
        current_count: number;
        max_capacity: number;
    };
    onRefresh?: () => void;
}

export default function AdminDashboard({ adminStats, occupancy, onRefresh }: Props) {
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const screenWidth = Dimensions.get('window').width - 72;
    const chartHeight = 80;
    const pathData = `M0,${chartHeight} L0,40 C${screenWidth * 0.2},40 ${screenWidth * 0.4},60 ${screenWidth * 0.6},20 C${screenWidth * 0.8},0 ${screenWidth},10 ${screenWidth},10 L${screenWidth},${chartHeight} Z`;

    const handleApprove = async (id: string) => {
        Alert.alert(
            'Ödeme Onayı',
            'Bu taksit ödemesini onaylıyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Onayla',
                    onPress: async () => {
                        setApprovingId(id);
                        try {
                            await adminPayInstallment(id);
                            Alert.alert('Başarılı', 'Taksit ödemesi onaylandı.');
                            if (onRefresh) onRefresh();
                        } catch (err) {
                            Alert.alert('Hata', 'Ödeme onaylanırken bir sorun oluştu.');
                        } finally {
                            setApprovingId(null);
                        }
                    }
                }
            ]
        );
    };

    const pending = adminStats.pendingInstallments || [];

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Yönetim Özeti</Text>

            <View style={styles.gridRow}>
                <Card style={[styles.gridCard, { backgroundColor: 'rgba(52, 199, 89, 0.05)', padding: 16 }] as any}>
                    <Ionicons name="cash-outline" size={24} color={Colors.success} style={styles.icon} />
                    <Text style={styles.statVal}>₺{adminStats.totalRevenue.toLocaleString()}</Text>
                    <Text style={styles.statLab}>Toplam Gelir (Aylık)</Text>
                </Card>

                <Card style={[styles.gridCard, { backgroundColor: 'rgba(255, 107, 53, 0.05)', padding: 16 }] as any}>
                    <Ionicons name="people-outline" size={24} color={Colors.primary} style={styles.icon} />
                    <Text style={styles.statVal}>{adminStats.activeMembers}</Text>
                    <Text style={styles.statLab}>Aktif Üyeler</Text>
                </Card>
            </View>

            {/* NEW: Pending Installments Approval */}
            {pending.length > 0 && (
                <Card title="Onay Bekleyen Taksitler" style={styles.fullCard}>
                    {pending.map((inst) => (
                        <View key={inst.id} style={styles.installmentRow}>
                            <View style={styles.instInfo}>
                                <Text style={styles.instUser}>{inst.users?.full_name || 'Bilinmeyen Kullanıcı'}</Text>
                                <Text style={styles.instDate}>{new Date(inst.due_date).toLocaleDateString('tr-TR')} Vadeli</Text>
                            </View>
                            <View style={styles.instAction}>
                                <Text style={styles.instAmount}>₺{inst.amount}</Text>
                                <TouchableOpacity
                                    style={styles.approveBtn}
                                    onPress={() => handleApprove(inst.id)}
                                    disabled={approvingId === inst.id}
                                >
                                    {approvingId === inst.id ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={styles.approveBtnText}>Onayla</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </Card>
            )}

            <Card title="Salon Doluluğu" style={styles.fullCard}>
                <View style={styles.occupancyContainer}>
                    <View style={styles.occCircle}>
                        <Text style={styles.occText}>{occupancy.current_count}</Text>
                        <Text style={styles.occLab}>Kişi</Text>
                    </View>
                    <View style={styles.occInfo}>
                        <Text style={styles.occStatus}>
                            {occupancy.current_count < 40 ? 'Sakin' : occupancy.current_count < 75 ? 'Orta' : 'Yoğun'}
                        </Text>
                        <Text style={styles.occSub}>Maksimum kapasite: {occupancy.max_capacity}</Text>
                    </View>
                </View>
            </Card>

            <Card title="Gelir Trendi" style={styles.fullCard}>
                <View style={styles.chartContainer}>
                    <Svg width={screenWidth} height={chartHeight} style={styles.svg}>
                        <Defs>
                            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={Colors.success} stopOpacity="0.4" />
                                <Stop offset="1" stopColor={Colors.success} stopOpacity="0.0" />
                            </LinearGradient>
                        </Defs>
                        <Path d={pathData} fill="url(#grad)" />
                        <Path d={`M0,40 C${screenWidth * 0.2},40 ${screenWidth * 0.4},60 ${screenWidth * 0.6},20 C${screenWidth * 0.8},0 ${screenWidth},10`} fill="none" stroke={Colors.success} strokeWidth="3" />
                    </Svg>
                </View>
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
        marginBottom: 20,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    gridCard: {
        flex: 1,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    icon: {
        marginBottom: 12,
    },
    statVal: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.text,
        marginBottom: 4,
    },
    statLab: {
        fontSize: 12,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    fullCard: {
        marginBottom: 16,
    },
    installmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    instInfo: {
        flex: 1,
    },
    instUser: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    instDate: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    instAction: {
        alignItems: 'flex-end',
        gap: 8,
    },
    instAmount: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    approveBtn: {
        backgroundColor: Colors.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    approveBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '800',
    },
    occupancyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginTop: 8,
    },
    occCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    occText: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '800',
    },
    occLab: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '700',
        marginTop: -2,
    },
    occInfo: {
        flex: 1,
    },
    occStatus: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    occSub: {
        color: Colors.textMuted,
        fontSize: 13,
    },
    chartContainer: {
        marginTop: 20,
        height: 80,
        overflow: 'hidden',
    },
    svg: {
        marginTop: -10,
    }
});
