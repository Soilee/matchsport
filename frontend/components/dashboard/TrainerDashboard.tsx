import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    trainerStats: {
        activeStudents: number;
        students: any[];
    };
}

export default function TrainerDashboard({ trainerStats }: Props) {
    return (
        <View style={styles.container}>
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
                        <Ionicons name="calendar" size={24} color={Colors.info} />
                        <Text style={styles.statVal}>3</Text>
                        <Text style={styles.statLab}>Bugünkü Dersler</Text>
                    </View>
                </View>
            </Card>

            <Text style={styles.sectionTitle}>Öğrencilerim</Text>

            {trainerStats.students.length === 0 ? (
                <Text style={styles.emptyText}>Henüz size atanmış bir öğrenci yok.</Text>
            ) : (
                trainerStats.students.map((student, idx) => (
                    <Card key={student.id} style={styles.studentCard} padding={16}>
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
