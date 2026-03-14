import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, Image, TouchableOpacity, Modal, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';
import PrestigeBadges from '@/components/profile/PrestigeBadges';
import { getDashboard, setAuthToken, changePassword, updateProfile } from '@/services/api';
import { DashboardData } from '@/types';
import { router } from 'expo-router';

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<DashboardData | null>(null);

    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [profileModalVisible, setProfileModalVisible] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [editHeight, setEditHeight] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const dashboardData = await getDashboard();
            setData(dashboardData);
            if (dashboardData?.user) {
                setNotificationsEnabled(dashboardData.user.notification_enabled !== false);
            }

        } catch (error: any) {
            console.error('Profile load error:', error);
            if (error?.response?.status === 401 || error?.message?.includes('401')) {
                router.replace('/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleLogout = () => {
        setAuthToken('');
        router.replace('/login');
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    const handlePasswordChange = async () => {
        try {
            if (!currentPassword || !newPassword) return Alert.alert('Hata', 'Tüm alanları doldurun.');
            await changePassword({ current_password: currentPassword, new_password: newPassword });
            Alert.alert('Başarılı', 'Şifreniz güncellendi');
            setPasswordModalVisible(false);
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            Alert.alert('Hata', 'Mevcut şifre yanlış veya bir hata oluştu');
        }
    };

    const handleProfileUpdate = async () => {
        try {
            await updateProfile({
                height_cm: editHeight ? parseFloat(editHeight) : undefined,
                weight_kg: editWeight ? parseFloat(editWeight) : undefined
            });
            Alert.alert('Başarılı', 'Profiliniz güncellendi');
            setProfileModalVisible(false);
            loadData();
        } catch (err) {
            Alert.alert('Hata', 'Profil güncellenemedi');
        }
    };

    const toggleNotifications = async (val: boolean) => {
        setNotificationsEnabled(val);
        try {
            await updateProfile({ notification_enabled: val });
        } catch (err) {
            console.error(err);
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                <Card style={styles.profileCard}>
                    <View style={styles.header}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={40} color={Colors.primary} />
                            </View>
                            <View style={styles.settingsBtn}>
                                <Ionicons name="settings" size={20} color="#fff" />
                            </View>
                        </View>
                        <Text style={styles.name}>{data?.user.full_name}</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Text style={styles.statVal}>{data?.measurements && data?.measurements[0] ? `${data.measurements[0].weight_kg} kg` : '-- kg'}</Text>
                                <Text style={styles.statLab}>Kilo</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.stat}>
                                <Text style={styles.statVal}>{data?.user?.height_cm ? `${data.user.height_cm} cm` : '-- cm'}</Text>
                                <Text style={styles.statLab}>Boy</Text>
                            </View>
                        </View>
                        <Text style={styles.totalVisits}>Toplam Giriş: {data?.user?.total_checkins || 0}</Text>
                    </View>
                </Card>

                {data?.badges && data.badges.length > 0 && (
                    <PrestigeBadges badges={data.badges} />
                )}

                <Card title="Hesap Ayarları">
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setEditHeight(data?.user?.height_cm?.toString() || ''); setEditWeight(data?.measurements?.[0]?.weight_kg?.toString() || ''); setProfileModalVisible(true); }}>
                        <Ionicons name="person-outline" size={22} color={Colors.textSecondary} />
                        <Text style={styles.menuText}>Profili Düzenle</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => setPasswordModalVisible(true)}>
                        <Ionicons name="lock-closed-outline" size={22} color={Colors.textSecondary} />
                        <Text style={styles.menuText}>Şifre Değiştir</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <View style={styles.menuItem}>
                        <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
                        <Text style={styles.menuText}>Bildirim Ayarları</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={toggleNotifications}
                            trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                    <View style={styles.menuItem}>
                        <Ionicons name="shield-outline" size={22} color={Colors.textSecondary} />
                        <Text style={styles.menuText}>KVKK ve Gizlilik</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </View>
                </Card>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Çıkış Yap</Text>
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={passwordModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
                            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
                        </View>
                        <TextInput style={styles.input} placeholderTextColor={Colors.textMuted} secureTextEntry placeholder="Mevcut Şifre" value={currentPassword} onChangeText={setCurrentPassword} />
                        <TextInput style={styles.input} placeholderTextColor={Colors.textMuted} secureTextEntry placeholder="Yeni Şifre" value={newPassword} onChangeText={setNewPassword} />
                        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: Colors.primary }]} onPress={handlePasswordChange}>
                            <Text style={[styles.logoutText, { color: '#fff' }]}>Güncelle</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={profileModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Profili Düzenle</Text>
                            <TouchableOpacity onPress={() => setProfileModalVisible(false)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
                        </View>
                        <TextInput style={styles.input} placeholderTextColor={Colors.textMuted} placeholder="Boy (cm)" keyboardType="numeric" value={editHeight} onChangeText={setEditHeight} />
                        <TextInput style={[styles.input, { marginTop: 12 }]} placeholderTextColor={Colors.textMuted} placeholder="Kilo (kg)" keyboardType="numeric" value={editWeight} onChangeText={setEditWeight} />
                        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: Colors.primary }]} onPress={handleProfileUpdate}>
                            <Text style={[styles.logoutText, { color: '#fff' }]}>Kaydet</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 16,
    },
    profileCard: {
        padding: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        width: '100%',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    settingsBtn: {
        position: 'absolute',
        right: 0,
        top: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        marginBottom: 16,
    },
    stat: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    statLab: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    totalVisits: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        gap: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
        fontWeight: '600',
    },
    logoutBtn: {
        marginTop: 20,
        padding: 18,
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
    },
    logoutText: {
        color: Colors.error,
        fontWeight: '800',
        fontSize: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        marginBottom: 12,
    },
});
