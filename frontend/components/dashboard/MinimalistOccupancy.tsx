import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';

interface Props {
    currentCount: number;
    maxCapacity: number;
}

export default function MinimalistOccupancy({ currentCount, maxCapacity }: Props) {
    const percentage = (currentCount / maxCapacity) * 100;

    const getStatus = () => {
        if (percentage < 40) return { text: 'Sakin', color: Colors.success };
        if (percentage < 75) return { text: 'Orta', color: Colors.warning };
        return { text: 'Yoğun', color: Colors.error };
    };

    const status = getStatus();

    return (
        <Card title="Salon Yoğunluğu" style={styles.card}>
            <View style={styles.content}>
                <View style={[styles.dot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusText, { color: status.color }]}>
                    {status.text} ({currentCount} Kişi)
                </Text>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 22,
        fontWeight: '800',
    },
    subtext: {
        fontSize: 16,
        color: Colors.textMuted,
        fontWeight: '600',
    }
});
