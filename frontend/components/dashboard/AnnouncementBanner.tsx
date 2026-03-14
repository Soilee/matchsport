import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Announcement } from '@/types';

interface Props {
    announcements: Announcement[];
}

const TYPE_CONFIG = {
    campaign: { icon: 'megaphone' as const, color: Colors.accent, bg: 'rgba(255, 51, 102, 0.1)' },
    schedule: { icon: 'time' as const, color: Colors.info, bg: 'rgba(64, 196, 255, 0.1)' },
    general: { icon: 'information-circle' as const, color: Colors.success, bg: 'rgba(0, 230, 118, 0.1)' },
};

export default function AnnouncementBanner({ announcements }: Props) {
    if (!announcements || announcements.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="megaphone" size={20} color={Colors.primary} />
                <Text style={styles.headerTitle}>Duyurular</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled={false}>
                {announcements.map(ann => {
                    const config = TYPE_CONFIG[ann.type] || TYPE_CONFIG.general;
                    return (
                        <View key={ann.id} style={[styles.card, { backgroundColor: config.bg, borderColor: `${config.color}30` }]}>
                            <Ionicons name={config.icon} size={24} color={config.color} />
                            <View style={styles.textContainer}>
                                <Text style={styles.title} numberOfLines={1}>{ann.title}</Text>
                                <Text style={styles.body} numberOfLines={2}>{ann.body}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        width: 300,
        gap: 12,
        borderWidth: 1,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    body: {
        fontSize: 12,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
});
