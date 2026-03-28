import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import { adminGetActiveOccupancy, adminForceCheckout } from '@/services/api';

interface ActiveUser {
    id: string;
    check_in_time: string;
    users: {
        id: string;
        full_name: string;
        profile_photo_url: string | null;
    };
}

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function GymManagementModal({ visible, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [actionId, setActionId] = useState<string | null>(null);

    const loadActiveUsers = async () => {
        setLoading(true);
        try {
            const data = await adminGetActiveOccupancy();
            setActiveUsers(data);
        } catch (err) {
            console.error('Error loading active users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            loadActiveUsers();
        }
    }, [visible]);

    const handleForceCheckout = (sessionId: string, userName: string) => {
        Alert.alert(
            'Zorla Çıkış',
            `${userName} isimli kullanıcıyı salondan çıkarmak istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Evet, Çıkar',
                    style: 'destructive',
                    onPress: async () => {
                        setActionId(sessionId);
                        try {
                            await adminForceCheckout(sessionId);
                            Alert.alert('Başarılı', 'Kullanıcı salondan çıkarıldı.');
                            loadActiveUsers();
                        } catch (err) {
                            Alert.alert('Hata', 'İşlem başarısız oldu.');
                        } finally {
                            setActionId(null);
                        }
                    }
                }
            ]
        );
    };

    const getDuration = (checkInTime: string) => {
        const start = new Date(checkInTime).getTime();
        const now = new Date().getTime();
        const diffMins = Math.floor((now - start) / 60000);

        if (diffMins < 60) return `${diffMins} dk`;
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hrs} sa ${mins} dk`;
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Salondakiler ({activeUsers.length})</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {activeUsers.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
                                <Text style={styles.emptyText}>Salonda şu an kimse yok.</Text>
                            </View>
                        ) : (
                            activeUsers.map((item) => (
                                <Card key={item.id} style={styles.userCard}>
                                    <View style={styles.userRow}>
                                        <View style={styles.avatarContainer}>
                                            {item.users.profile_photo_url ? (
                                                <Image
                                                    source={{ uri: item.users.profile_photo_url }}
                                                    style={styles.avatar}
                                                />
                                            ) : (
                                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                                    <Text style={styles.avatarLetter}>
                                                        {item.users.full_name.charAt(0)}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.statusDot} />
                                        </View>

                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{item.users.full_name}</Text>
                                            <Text style={styles.duration}>
                                                <Ionicons name="time-outline" size={12} /> {getDuration(item.check_in_time)}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.forceBtn}
                                            onPress={() => handleForceCheckout(item.id, item.users.full_name)}
                                            disabled={actionId === item.id}
                                        >
                                            {actionId === item.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.forceBtnText}>Çıkış Yap</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            ))
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.text,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
        opacity: 0.5,
    },
    emptyText: {
        color: Colors.textMuted,
        marginTop: 16,
        fontSize: 16,
    },
    userCard: {
        marginBottom: 12,
        padding: 12,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        backgroundColor: 'rgba(255, 107, 53, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 53, 0.3)',
    },
    avatarLetter: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: '800',
    },
    statusDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.success,
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    userInfo: {
        flex: 1,
        marginLeft: 16,
    },
    userName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    duration: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    forceBtn: {
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.2)',
    },
    forceBtnText: {
        color: Colors.error,
        fontSize: 12,
        fontWeight: '800',
    },
});
