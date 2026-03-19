import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Membership, Installment } from '@/types';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    membership: Membership | null;
    installments?: Installment[];
}

export default function MembershipCard({ membership, installments = [] }: Props) {
    if (!membership) {
        return (
            <Card style={styles.emptyCard}>
                <View style={styles.header}>
                    <Ionicons name="card" size={22} color={Colors.warning} />
                    <Text style={styles.title}>Üyelik Durumu</Text>
                </View>
                <Text style={styles.noMembership}>Aktif üyelik bulunamadı</Text>
            </Card>
        );
    }

    const { remaining_days, total_days, status, package_type, end_date } = membership;

    // Calculate real debt from installments
    const pendingInstallments = installments.filter(i => i.status !== 'paid');
    const totalDebt = pendingInstallments.reduce((acc, i) => acc + i.amount, 0);
    const nextInstallment = pendingInstallments[0]; // Already sorted by date in backend

    // SVG Circular Progress Logic - DRAINS BACKWARDS
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min(1, Math.max(0, remaining_days / (total_days || 30)));
    const strokeDashoffset = circumference - (progress * circumference);

    const getStatusConfig = () => {
        switch (status) {
            case 'active':
                return { color: '#FF6B35', icon: 'checkmark-circle' as const, label: 'AKTİF ÜYE', glow: true };
            case 'grace':
                return { color: '#FF9F0A', icon: 'alert-circle' as const, label: 'ÖDEME BEKLENİYOR', glow: true };
            case 'expired':
                return { color: '#FF3B30', icon: 'close-circle' as const, label: 'SÜRESİ DOLDU', glow: false };
            case 'frozen':
                return { color: '#007AFF', icon: 'snow' as const, label: 'DONDURULDU', glow: false };
            default:
                return { color: '#8E8E93', icon: 'help-circle' as const, label: 'BİLİNMİYOR', glow: false };
        }
    };

    const config = getStatusConfig();

    const strokeColor = remaining_days <= 14 ? '#FF3B30' : config.color;

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/membershipDetail' as any)}>
            <View style={[styles.container, { borderColor: strokeColor }]}>
                <LinearGradient
                    colors={['rgba(255,107,53,0.1)', 'rgba(0,0,0,0.4)']}
                    style={styles.gradient}
                >
                    <View style={styles.header}>
                        <View style={styles.titleGroup}>
                            <Text style={styles.titleText}>MatchSport Üyelik</Text>
                            <Text style={styles.packageText}>{package_type || 'Standart Paket'}</Text>
                        </View>
                        <View style={[styles.statusTag, { backgroundColor: config.color }]}>
                            <Ionicons name={config.icon} size={12} color="white" />
                            <Text style={styles.statusTagText}>{config.label}</Text>
                        </View>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.gaugeContainer}>
                            <Svg width={size} height={size}>
                                {/* Background Circle */}
                                <Circle
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth={strokeWidth}
                                    fill="none"
                                />
                                {/* Progress Circle */}
                                <Circle
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    fill="none"
                                    strokeDasharray={`${circumference} ${circumference}`}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                                />
                            </Svg>
                            <View style={styles.gaugeCenter}>
                                <Text style={[styles.daysText, { color: strokeColor }]}>{remaining_days}</Text>
                                <Text style={styles.daysLabel}>KALAN GÜN</Text>
                            </View>
                        </View>

                        <View style={styles.infoContainer}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Bitiş Tarihi</Text>
                                <Text style={styles.infoValue}>{end_date}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Bakiye / Borç</Text>
                                <Text style={[styles.infoValue, { color: totalDebt > 0 ? '#FF3B30' : '#34C759' }]}>
                                    {totalDebt > 0 ? `₺${totalDebt} Borç` : 'Borcunuz Yoktur'}
                                </Text>
                            </View>
                            {nextInstallment && (
                                <View style={styles.infoRow}>
                                    <View>
                                        <Text style={styles.infoLabel}>Sonraki Ödeme</Text>
                                        <Text style={styles.subInfoLabel}>
                                            {new Date(nextInstallment.due_date).toLocaleDateString('tr-TR')}
                                        </Text>
                                    </View>
                                    <Text style={[styles.infoValue, { color: '#FF3B30' }]}>
                                        ₺{nextInstallment.amount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: strokeColor }]} />
                    </View>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        borderWidth: 1.5,
        backgroundColor: '#0A0A0A',
        overflow: 'hidden',
        marginVertical: 10,
    },
    gradient: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    titleGroup: {
        flex: 1,
    },
    titleText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    packageText: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 2,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 6,
    },
    statusTagText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 25,
    },
    gaugeContainer: {
        position: 'relative',
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gaugeCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    daysText: {
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '900',
    },
    daysLabel: {
        fontSize: 8,
        color: '#8E8E93',
        fontWeight: '700',
        marginTop: -2,
    },
    infoContainer: {
        flex: 1,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '600',
    },
    infoValue: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
    },
    progressTrack: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        marginTop: 5,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    emptyCard: {
        padding: 20,
    },
    noMembership: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        marginVertical: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    subInfoLabel: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    }
});
