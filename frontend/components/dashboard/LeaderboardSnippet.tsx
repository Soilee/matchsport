import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { LeaderboardEntry } from '@/types';

interface Props {
    entries: LeaderboardEntry[];
}

export default function LeaderboardSnippet({ entries }: Props) {
    if (!entries || entries.length === 0) return null;

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <Card>
            <View style={styles.header}>
                <Ionicons name="podium" size={22} color={Colors.warning} />
                <Text style={styles.title}>Bu Ay Liderlik Tablosu</Text>
            </View>

            <View style={styles.list}>
                {entries.slice(0, 5).map((entry, i) => (
                    <View key={entry.id} style={[styles.item, i < 3 && styles.topThree]}>
                        <View style={styles.rank}>
                            <Text style={styles.rankText}>
                                {i < 3 ? medals[i] : `${i + 1}.`}
                            </Text>
                        </View>

                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {entry.full_name.split(' ').map(n => n[0]).join('')}
                            </Text>
                        </View>

                        <View style={styles.info}>
                            <Text style={styles.name}>{entry.full_name}</Text>
                            <Text style={styles.streak}>🔥 {entry.current_streak} gün seri</Text>
                        </View>

                        <View style={styles.visits}>
                            <Text style={styles.visitCount}>{entry.monthly_visits}</Text>
                            <Text style={styles.visitLabel}>giriş</Text>
                        </View>
                    </View>
                ))}
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
    },
    list: {
        gap: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: Colors.surfaceLight,
        gap: 12,
    },
    topThree: {
        backgroundColor: 'rgba(255, 214, 0, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 214, 0, 0.1)',
    },
    rank: {
        width: 32,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    streak: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    visits: {
        alignItems: 'center',
    },
    visitCount: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.primary,
    },
    visitLabel: {
        fontSize: 11,
        color: Colors.textMuted,
    },
});
