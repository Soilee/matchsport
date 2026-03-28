import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { adminPayInstallment } from '@/services/api';
import GymManagementModal from './GymManagementModal';

interface Installment {
    id: string;
    amount: number;
    due_date: string;
    users?: { full_name: string };
}

interface Props {
    trainerStats: {
        totalMembers: number;
        activeMembers: number;
        activeStudents: number;
        expiringIn1Day: number;
        expiringIn7Days: number;
        expiringIn14Days: number;
        students: any[];
        pendingInstallments?: Installment[];
    };
    occupancy: {
        current_count: number;
        max_capacity: number;
    };
    onRefresh?: () => void;
}

export default function TrainerDashboard({ trainerStats, occupancy, onRefresh }: Props) {
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [isGymModalVisible, setIsGymModalVisible] = useState(false);

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

    const pending = trainerStats.pendingInstallments || [];

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Eğitmen Paneli</Text>

            <View style={styles.gridRow}>
                <Card style={[styles.gridCard, { backgroundColor: 'rgba(0, 122, 255, 0.05)', padding: 16 }] as any}>
                    <Ionicons name="people-outline" size={24} color="#007AFF" style={styles.icon} />
                    <Text style={styles.statVal}>{trainerStats.totalMembers}</Text>
                    <Text style={styles.statLab}>Toplam Üye</Text>
                </Card>

                <Card style={[styles.gridCard, { backgroundColor: 'rgba(52, 199, 89, 0.05)', padding: 16 }] as any}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={Colors.success} style={styles.icon} />
                    <Text style={styles.statVal}>{trainerStats.activeMembers}</Text>
                    <Text style={styles.statLab}>Aktif Üyeler</Text>
                </Card>
            </View>

            {/* Expiring memberships info for operational awareness */}
            {(trainerStats.expiringIn1Day > 0 || trainerStats.expiringIn7Days > 0) && (
                <View style={[styles.gridRow, { marginBottom: 16 }]}>
                    <Card style={[styles.gridCard, { backgroundColor: 'rgba(255, 82, 82, 0.05)', borderColor: 'rgba(255, 82, 82, 0.1)' }] as any}>
                        <Text style={[styles.statVal, { color: Colors.error, fontSize: 18 }]}>{trainerStats.expiringIn1Day}</Text>
                        <Text style={styles.statLab}>Bugün Biten</Text>
                    </Card>
                    <Card style={[styles.gridCard, { backgroundColor: 'rgba(255, 214, 0, 0.05)', borderColor: 'rgba(255, 214, 0, 0.1)' }] as any}>
                        <Text style={[styles.statVal, { color: Colors.warning, fontSize: 18 }]}>{trainerStats.expiringIn7Days}</Text>
                        <Text style={styles.statLab}>1 Haftada Biten</Text>
                    </Card>
                    <Card style={[styles.gridCard, { backgroundColor: 'rgba(64, 196, 255, 0.05)', borderColor: 'rgba(64, 196, 255, 0.1)' }] as any}>
                        <Text style={[styles.statVal, { color: Colors.info, fontSize: 18 }]}>{trainerStats.expiringIn14Days}</Text>
                        <Text style={styles.statLab}>2 Haftada Biten</Text>
                    </Card>
                </View>
            )}

            <Card style={styles.summaryCard} glow>
                <View style={styles.statRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="school-outline" size={24} color={Colors.primary} />
                        <Text style={styles.statVal}>{trainerStats.activeStudents}</Text>
                        <Text style={styles.statLab}>Öğrencim</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Ionicons name="card-outline" size={24} color={Colors.warning} />
                        <Text style={styles.statVal}>{pending.length}</Text>
                        <Text style={styles.statLab}>Bekleyen Ödeme</Text>
                    </View>
                </View>
            </Card>

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
                        <Text style={styles.occSub}>Kapasite: {occupancy.max_capacity}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.manageBtn}
                        onPress={() => setIsGymModalVisible(true)}
                    >
                        <Ionicons name="settings-outline" size={20} color={Colors.primary} />
                        <Text style={styles.manageBtnText}>Yönet</Text>
                    </TouchableOpacity>
                </View>
            </Card>

            <GymManagementModal
                visible={isGymModalVisible}
                onClose={() => {
                    setIsGymModalVisible(false);
                    if (onRefresh) onRefresh();
                }}
            />

            {/* NEW: Pending Installments Approval */}
            {pending.length > 0 && (
                <Card title="Onay Bekleyen Taksitler" style={styles.installmentCard}>
                    {pending.map((inst) => (
                        <View key={inst.id} style={styles.installmentRow}>
                            <View style={styles.instInfo}>
                                <Text style={styles.instUser}>{inst.users?.full_name || 'Öğrenci'}</Text>
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

            <Text style={styles.sectionTitle}>Öğrencilerim</Text>

            {trainerStats.students.length === 0 ? (
                <Text style={styles.emptyText}>Henüz size atanmış bir öğrenci yok.</Text>
            ) : (
                trainerStats.students.map((student) => (
                    <Card key={student.id} style={[styles.studentCard, { padding: 16 }] as any}>
                        <View style={styles.studentHeader}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={20} color={Colors.primary} />
                            </View>
                            <View style={styles.studentInfo}>
                                <Text style={styles.studentName}>{student.full_name}</Text>
                                <Text style={styles.studentEmail}>{student.email}</Text>
                            </View>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Ionicons name="barbell" size={16} color="#fff" />
                                <Text style={styles.actionBtnText}>Program</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(0, 122, 255, 0.2)' }]}>
                                <Ionicons name="folder-open-outline" size={16} color="#007AFF" />
                                <Text style={[styles.actionBtnText, { color: '#007AFF' }]}>Kayıtlar</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                ))
            )}
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
    summaryCard: {
        marginBottom: 10,
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
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 8,
    },
    statItem: {
        alignItems: 'center',
        gap: 6,
    },
    statVal: {
        color: Colors.text,
        fontSize: 24,
        fontWeight: '900',
    },
    statLab: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginTop: 8,
        marginBottom: 4,
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    studentCard: {
        marginBottom: 12,
    },
    fullCard: {
        marginBottom: 16,
    },
    occupancyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginTop: 8,
    },
    occCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    occText: {
        color: Colors.text,
        fontSize: 18,
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
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    occSub: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 53, 0.2)',
    },
    manageBtnText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    installmentCard: {
        marginBottom: 12,
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
    studentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    studentEmail: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 107, 53, 0.8)',
        paddingVertical: 10,
        borderRadius: 8,
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    }
});
