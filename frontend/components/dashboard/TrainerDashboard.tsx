import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { adminPayInstallment } from '@/services/api';

interface Installment {
    id: string;
    amount: number;
    due_date: string;
    users?: { full_name: string };
}

interface Props {
    trainerStats: {
        activeStudents: number;
        students: any[];
        pendingInstallments?: Installment[];
    };
    onRefresh?: () => void;
}

export default function TrainerDashboard({ trainerStats, onRefresh }: Props) {
    const [approvingId, setApprovingId] = useState<string | null>(null);

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
        <ScrollView style={styles.container} scrollEnabled={false}>
            <Text style={styles.headerTitle}>Eğitmen Paneli</Text>

            <Card title="Özet" style={styles.summaryCard} glow>
                <View style={styles.statRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="people" size={24} color={Colors.primary} />
                        <Text style={styles.statVal}>{trainerStats.activeStudents}</Text>
                        <Text style={styles.statLab}>Aktif Öğrencim</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Ionicons name="card-outline" size={24} color={Colors.warning} />
                        <Text style={styles.statVal}>{pending.length}</Text>
                        <Text style={styles.statLab}>Bekleyen Ödeme</Text>
                    </View>
                </View>
            </Card>

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
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(52, 199, 89, 0.2)' }]}>
                                <Ionicons name="restaurant" size={16} color={Colors.success} />
                                <Text style={[styles.actionBtnText, { color: Colors.success }]}>Diyet</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                ))
            )}
        </ScrollView>
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
