import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
    adminStats: {
        totalMembers: number;
        activeMembers: number;
        totalRevenue: number;
    };
    occupancy: {
        current_count: number;
        max_capacity: number;
    };
}

export default function AdminDashboard({ adminStats, occupancy }: Props) {
    // SVG Graphic definition for a dummy revenue chart
    const screenWidth = Dimensions.get('window').width - 72; // Padding offsets
    const chartHeight = 80;
    // A dummy path to look like an upward trending revenue chart
    const pathData = `M0,${chartHeight} L0,40 C${screenWidth * 0.2},40 ${screenWidth * 0.4},60 ${screenWidth * 0.6},20 C${screenWidth * 0.8},0 ${screenWidth},10 ${screenWidth},10 L${screenWidth},${chartHeight} Z`;

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Yönetim Özeti</Text>

            <View style={styles.gridRow}>
                <Card style={[styles.gridCard, { backgroundColor: 'rgba(52, 199, 89, 0.05)' }]} padding={16}>
                    <Ionicons name="cash-outline" size={24} color={Colors.success} style={styles.icon} />
                    <Text style={styles.statVal}>₺{adminStats.totalRevenue.toLocaleString()}</Text>
                    <Text style={styles.statLab}>Toplam Gelir (Aylık)</Text>
                </Card>

                <Card style={[styles.gridCard, { backgroundColor: 'rgba(255, 107, 53, 0.05)' }]} padding={16}>
                    <Ionicons name="people-outline" size={24} color={Colors.primary} style={styles.icon} />
                    <Text style={styles.statVal}>{adminStats.activeMembers}</Text>
                    <Text style={styles.statLab}>Aktif Üyeler</Text>
                </Card>
            </View>

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
        marginBottom: 0,
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
