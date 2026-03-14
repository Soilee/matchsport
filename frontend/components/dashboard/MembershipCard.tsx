import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Membership } from '@/types';

interface Props {
    membership: Membership | null;
}

export default function MembershipCard({ membership }: Props) {
    if (!membership) {
        return (
            <Card>
                <View style={styles.header}>
                    <Ionicons name="card" size={22} color={Colors.warning} />
                    <Text style={styles.title}>Üyelik Durumu</Text>
                </View>
                <Text style={styles.noMembership}>Aktif üyelik bulunamadı</Text>
            </Card>
        );
    }

    const { remaining_days, total_days, status } = membership;
    const progress = remaining_days / total_days;
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference * (1 - progress);

    const getStatusConfig = () => {
        switch (status) {
            case 'active':
                return { color: Colors.success, icon: 'checkmark-circle' as const, text: 'Aktif ✅' };
            case 'grace':
                return { color: Colors.warning, icon: 'warning' as const, text: 'Tolerans ⚠️' };
            case 'expired':
                return { color: Colors.error, icon: 'close-circle' as const, text: 'Süresi Dolmuş ❌' };
            case 'frozen':
                return { color: Colors.info, icon: 'snow' as const, text: 'Dondurulmuş ❄️' };
            default:
                return { color: Colors.textMuted, icon: 'help-circle' as const, text: 'Bilinmiyor' };
        }
    };

    const config = getStatusConfig();

    return (
        <Card glow={status === 'grace'}>
            <View style={styles.header}>
                <Ionicons name="card" size={22} color={config.color} />
                <Text style={styles.title}>Üyelik Durumu</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
                    <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
                </View>
            </View>

            <View style={styles.body}>
                {/* Circular progress */}
                <View style={styles.circleContainer}>
                    <View style={styles.circleOuter}>
                        <View style={styles.circleInner}>
                            <Text style={[styles.daysNumber, { color: config.color }]}>{remaining_days}</Text>
                            <Text style={styles.daysLabel}>gün kaldı</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.details}>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>Bitiş: {membership.end_date}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>Toplam: {total_days} gün</Text>
                    </View>
                    {status === 'grace' && (
                        <View style={[styles.warningBox]}>
                            <Text style={styles.warningText}>
                                ⚠️ Ödeme gerekli! {membership.grace_days_remaining} gün tolerans kaldı.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    body: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    circleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 53, 0.08)',
    },
    circleInner: {
        alignItems: 'center',
    },
    daysNumber: {
        fontSize: 32,
        fontWeight: '800',
    },
    daysLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: -2,
    },
    details: {
        flex: 1,
        gap: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    warningBox: {
        backgroundColor: 'rgba(255, 214, 0, 0.1)',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 214, 0, 0.2)',
        marginTop: 4,
    },
    warningText: {
        fontSize: 12,
        color: Colors.warning,
        fontWeight: '600',
    },
    noMembership: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
        paddingVertical: 20,
    },
});
