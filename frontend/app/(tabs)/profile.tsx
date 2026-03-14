import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, Image, TouchableOpacity, Modal, TextInput, Switch, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
                    keyboardDismissMode="on-drag"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                >
                    <Card style={styles.profileCard} glow>
                        <View style={styles.header}>
                            <View style={styles.avatarContainer}>
                                <View style={styles.avatar}>
                                    <Ionicons name="person" size={50} color={Colors.primary} />
                                </View>
                                <TouchableOpacity style={styles.settingsBtn} onPress={() => setProfileModalVisible(true)}>
                                    <Ionicons name="camera" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.name}>{data?.user?.full_name || 'Sporcu'}</Text>

                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statVal}>{data?.user?.height_cm || '-'}</Text>
                                    <Text style={styles.statLab}>Boy (cm)</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.stat}>
                                    <Text style={styles.statVal}>{data?.user?.weight_kg || '-'}</Text>
                                    <Text style={styles.statLab}>Kilo (kg)</Text>
                                </View>
                            </View>

                            <Text style={styles.totalVisits}>Toplam Ziyaret: {data?.user?.total_visits || 0}</Text>
                        </View>
                    </Card>

                    <PrestigeBadges badges={data?.badges || []} />

                    <View style={{ marginTop: 24 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>HESAP AYARLARI</Text>

                        <TouchableOpacity style={styles.menuItem} onPress={() => setProfileModalVisible(true)}>
                            <Ionicons name="person-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.menuText}>Profili Düzenle</Text>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => setPasswordModalVisible(true)}>
                            <Ionicons name="lock-closed-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.menuText}>Şifre Değiştir</Text>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>

                        <View style={styles.menuItem}>
                            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.menuText}>Bildirimler</Text>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={toggleNotifications}
                                trackColor={{ false: '#333', true: Colors.primary }}
                                thumbColor="#fff"
                            />
                        </View>

                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="language-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.menuText}>Dil / Language</Text>
                            <Text style={styles.menuVal}>Türkçe</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="color-palette-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.menuText}>Tema (Karanlık)</Text>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <Ionicons name="information-circle-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.menuText}>Hakkında</Text>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => Alert.alert('Hesap Silme', 'Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet, Sil', style: 'destructive' }])}>
                            <Ionicons name="trash-outline" size={22} color={Colors.error} />
                            <Text style={[styles.menuText, { color: Colors.error }]}>Hesabı Sil</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
                            <Text style={[styles.menuText, { color: Colors.error }]}>Çıkış Yap</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Password Modal */}
                <Modal visible={passwordModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Mevcut Şifre"
                                placeholderTextColor="#666"
                                secureTextEntry
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                            />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Yeni Şifre"
                                placeholderTextColor="#666"
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setPasswordModalVisible(false)}>
                                    <Text style={styles.cancelText}>İptal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handlePasswordChange}>
                                    <Text style={styles.saveText}>Güncelle</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Profile Edit Modal */}
                <Modal visible={profileModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Profili Düzenle</Text>
                            <Text style={styles.inputLabel}>Boy (cm)</Text>
                            <TextInput
                                style={styles.modalInput}
                                keyboardType="numeric"
                                value={editHeight}
                                onChangeText={setEditHeight}
                                placeholder={data?.user?.height_cm?.toString() || '180'}
                                placeholderTextColor="#666"
                            />
                            <Text style={styles.inputLabel}>Kilo (kg)</Text>
                            <TextInput
                                style={styles.modalInput}
                                keyboardType="numeric"
                                value={editWeight}
                                onChangeText={setEditWeight}
                                placeholder={data?.user?.weight_kg?.toString() || '80'}
                                placeholderTextColor="#666"
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setProfileModalVisible(false)}>
                                    <Text style={styles.cancelText}>İptal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleProfileUpdate}>
                                    <Text style={styles.saveText}>Kaydet</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </TouchableWithoutFeedback>
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
    menuVal: {
        fontSize: 14,
        color: Colors.textMuted,
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
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    saveBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    cancelText: {
        color: Colors.textMuted,
        fontWeight: '700',
    },
    saveText: {
        color: '#fff',
        fontWeight: '700',
    },
    inputLabel: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        marginTop: 12,
    },
    modalInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        marginBottom: 12,
    },
});
