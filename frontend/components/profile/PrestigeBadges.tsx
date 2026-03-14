import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { Badge } from '@/types';

interface Props {
    badges: Badge[];
}

export default function PrestigeBadges({ badges }: Props) {
    return (
        <Card title="Kazanılan Rozetler">
            <View style={styles.list}>
                {badges.length > 0 ? (
                    badges.map((badge) => (
                        <View key={badge.id} style={styles.badgeItem}>
                            <View style={styles.badgeHex}>
                                <Ionicons
                                    name={badge.icon_type as any}
                                    size={30}
                                    color={badge.type === 'strength' ? Colors.error : Colors.gold}
                                />
                            </View>
                            <Text style={styles.badgeName}>{badge.name}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>Henüz rozet kazanılmadı.</Text>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    list: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
        paddingVertical: 10,
    },
    badgeItem: {
        alignItems: 'center',
        width: 80,
    },
    badgeHex: {
        width: 60,
        height: 60,
        backgroundColor: '#1E1E2E',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        // Tilt effect like in the images
        transform: [{ rotate: '15deg' }],
    },
    badgeName: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.textSecondary,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    emptyText: {
        color: Colors.textMuted,
        textAlign: 'center',
        width: '100%',
    }
});
