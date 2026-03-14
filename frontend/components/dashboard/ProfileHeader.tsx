import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { User } from '@/types';

interface Props {
    user: User;
    unreadNotifications: number;
}

export default function ProfileHeader({ user, unreadNotifications }: Props) {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Günaydın';
        if (hour < 18) return 'İyi günler';
        return 'İyi akşamlar';
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <View style={styles.avatar}>
                    {user.profile_photo_url ? (
                        <Image source={{ uri: user.profile_photo_url }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.initials}>{getInitials(user.full_name)}</Text>
                    )}
                    <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.greeting}>{getGreeting()} 👋</Text>
                    <Text style={styles.name}>{user.full_name}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {user.role === 'member' ? '💪 Üye' : user.role === 'trainer' ? '🏋️ Antrenör' : '⚡ Admin'}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.right}>
                <View style={styles.notifContainer}>
                    <Ionicons name="notifications-outline" size={26} color={Colors.text} />
                    {unreadNotifications > 0 && (
                        <View style={styles.notifBadge}>
                            <Text style={styles.notifCount}>{unreadNotifications}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 8,
        marginBottom: 20,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
        marginRight: 14,
    },
    avatarImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    initials: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.success,
        borderWidth: 2,
        borderColor: Colors.background,
    },
    textContainer: {
        flex: 1,
    },
    greeting: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    right: {
        alignItems: 'flex-end',
    },
    notifContainer: {
        position: 'relative',
        padding: 8,
    },
    notifBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: Colors.accent,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifCount: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
});
