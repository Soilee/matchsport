import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, ScrollView, View, Text, RefreshControl, ActivityIndicator, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Card from '@/components/common/Card';

import { Colors } from '@/constants/Colors';
import ProfileHeader from '@/components/dashboard/ProfileHeader';
import MinimalistOccupancy from '@/components/dashboard/MinimalistOccupancy';
import ChecklistWorkout from '@/components/dashboard/ChecklistWorkout';
import ActivityLog from '@/components/dashboard/ActivityLog';
import DailyMission from '@/components/dashboard/DailyMission';
import HealthRingWidget from '@/components/dashboard/HealthRingWidget';
import MembershipCard from '@/components/dashboard/MembershipCard';
import HeatmapCard from '@/components/dashboard/HeatmapCard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import TrainerDashboard from '@/components/dashboard/TrainerDashboard';
import { getDashboard, getTasks, completeTask } from '@/services/api';
import { DashboardData, User } from '@/types';
import { router } from 'expo-router';

// Extended User type for local usage if global type is missing memberships
interface ExtendedUser extends User {
  memberships?: Array<{
    id: string;
    status: string;
    end_date: string;
    package_type: string;
    total_price?: number;
    amount?: number;
    next_payment_date?: string;
  }>;
}

interface ExtendedDashboardData extends Omit<DashboardData, 'user'> {
  user: ExtendedUser;
  unreadNotifications: number;
  installments: any[];
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ExtendedDashboardData | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnnouncementsVisible, setIsAnnouncementsVisible] = useState(false);
  const lastFetch = useRef(0);
  const reloadTimer = useRef<any>(null);

  const loadData = useCallback(async (isAuto = false) => {
    const now = Date.now();

    // If this is an auto-refresh and we fetched recently, schedule it instead of skipping
    if (isAuto && now - lastFetch.current < 3000) {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => loadData(true), 3000);
      return;
    }

    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    lastFetch.current = now;

    try {
      setError(null);

      const [dashboardData, tasksData] = await Promise.all([
        getDashboard(),
        getTasks()
      ]);

      setData(dashboardData);
      setTasks(tasksData);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.message?.includes('401')) {
        router.replace('/login');
        return;
      }
      console.error('Data load error:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const userId = data?.user?.id;
    if (!userId) return;

    const membershipSub = import('@/services/supabase').then(({ supabase }) => {
      return supabase
        .channel(`memberships_${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('Real-time: Membership updated!', payload);
          loadData(true);
        })
        .subscribe();
    });

    const occupancySub = import('@/services/supabase').then(({ supabase }) => {
      return supabase
        .channel('occupancy_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'gym_occupancy'
        }, (payload) => {
          console.log('Real-time: Occupancy changed!');
          loadData(true);
        })
        .subscribe();
    });

    return () => {
      membershipSub.then(sub => (sub as any).unsubscribe?.());
      occupancySub.then(sub => (sub as any).unsubscribe?.());
    };
  }, [data?.user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Veriler Hazırlanıyor...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => loadData()}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentUserRole = data?.user?.role;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {data && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Merhaba, {data?.user?.full_name?.split(' ')[0] || 'Sporcu'} 👋</Text>
                <View style={styles.liveCounterContainer}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveCounterText}>Salonda Şu An: {data?.occupancy?.current_count || 0} Kişi Var</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.notificationBtn} onPress={async () => {
                setIsAnnouncementsVisible(true);
                if (data?.unreadNotifications > 0) {
                  try {
                    const { markNotificationsRead } = require('@/services/api');
                    await markNotificationsRead();
                    setData(prev => prev ? { ...prev, unreadNotifications: 0 } : null);
                  } catch (e) { console.error(e); }
                }
              }}>
                <Ionicons name="notifications-outline" size={24} color={Colors.text} />
                {(data?.unreadNotifications || 0) > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                      {data.unreadNotifications > 9 ? '9+' : data.unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ADMIN/TRAINER DASHBOARDS */}
            {currentUserRole === 'admin' && data.adminStats && (
              <AdminDashboard
                adminStats={data.adminStats}
                occupancy={data.occupancy || { current_count: 0, max_capacity: 50 }}
                onRefresh={loadData}
              />
            )}
            {currentUserRole === 'trainer' && data.trainerStats && (
              <TrainerDashboard
                trainerStats={data.trainerStats}
                onRefresh={loadData}
              />
            )}

            {/* STREAK WIDGET */}
            {(data?.user?.current_streak ?? 0) > 0 && (
              <Card style={styles.streakCard} glow>
                <View style={styles.streakContent}>
                  <Text style={styles.streakIcon}>🔥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.streakTitle}>Harika İlerliyorsun!</Text>
                    <Text style={styles.streakDays}>{data.user.current_streak} Gündür Seridesin</Text>
                  </View>
                </View>
              </Card>
            )}

            {/* KALAN ÖDEME WIDGET - only visible if pending installments exist */}
            {(() => {
              const pendingInst = (data?.installments || []).filter((i: any) => i.status !== 'paid');
              const totalPending = pendingInst.reduce((s: number, i: any) => s + (i.amount || 0), 0);
              if (totalPending <= 0) return null;
              const nextDue = pendingInst[0];
              return (
                <Card style={StyleSheet.flatten([styles.membershipCard, { backgroundColor: 'rgba(255, 159, 10, 0.08)', borderColor: 'rgba(255, 159, 10, 0.25)', borderWidth: 1 }])}>
                  <View style={styles.membershipContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.membershipLabel, { color: '#FF9F0A' }]}>Kalan Ödeme</Text>
                      <Text style={[styles.membershipDays, { color: '#FF9F0A', fontSize: 24 }]}>₺{totalPending}</Text>
                      {nextDue && (
                        <Text style={[styles.membershipExpiry, { color: '#FF9F0A' }]}>
                          Sonraki Taksit: {new Date(nextDue.due_date).toLocaleDateString('tr-TR')}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })()}

            <MembershipCard
              membership={data?.membership || null}
              installments={data?.installments || []}
            />

            <MinimalistOccupancy
              currentCount={data?.occupancy?.current_count || 0}
              maxCapacity={data?.occupancy?.max_capacity || 50}
            />

            {data?.heatmap && <HeatmapCard data={data.heatmap} />}

            {tasks.length > 0 && (
              <DailyMission
                task={tasks[0].title}
                completed={tasks[0].is_completed}
                onToggle={async () => {
                  try {
                    await completeTask(tasks[0].id);
                    setTasks(prev => prev.map(t => t.id === tasks[0].id ? { ...t, is_completed: true } : t));
                  } catch (e) {
                    console.error('Task toggle error', e);
                  }
                }}
              />
            )}

            <ActivityLog history={data?.workout_history || []} />

            <ChecklistWorkout workout={data?.todayWorkout || null} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Matchless Fitness v3.0</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Announcements Modal */}
      <Modal
        visible={isAnnouncementsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAnnouncementsVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
          <View style={[styles.modalContent, { flex: 1, borderRadius: 0, padding: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Duyurular & Bildirimler</Text>
              <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                {(data?.notifications?.length ?? 0) > 0 && (
                  <TouchableOpacity onPress={async () => {
                    Alert.alert('Emin misiniz?', 'Tüm bildirimleri silmek istiyor musunuz?', [
                      { text: 'İptal', style: 'cancel' },
                      {
                        text: 'Temizle',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const { clearNotifications } = require('@/services/api');
                            await clearNotifications();
                            setData(prev => prev ? { ...prev, notifications: [], unreadNotifications: 0 } : null);
                          } catch (e) { console.error(e); }
                        }
                      }
                    ]);
                  }}>
                    <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>Tümünü Sil</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsAnnouncementsVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Combine Announcements and Notifications */}
              {(() => {
                const combined = [
                  ...(data?.announcements || []).map(a => ({ ...a, is_announcement: true })),
                  ...(data?.notifications || []).map(n => ({ ...n, is_announcement: false }))
                ].sort((a: any, b: any) => new Date(b.publish_at || b.sent_at).getTime() - new Date(a.publish_at || a.sent_at).getTime());

                if (combined.length === 0) {
                  return (
                    <View style={styles.emptyAnn}>
                      <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
                      <Text style={styles.emptyAnnText}>Henüz bir duyuru veya bildirim bulunmuyor.</Text>
                    </View>
                  );
                }

                return combined.map((item: any) => (
                  <Card key={item.id} style={[styles.announcementCard, (!item.is_announcement && !item.is_read) ? { borderColor: Colors.primary, borderWidth: 1 } : {}] as any}>
                    <View style={styles.annHeader}>
                      <View style={[styles.annTypeBadge, { backgroundColor: item.is_announcement ? (item.type === 'campaign' ? 'rgba(255, 107, 53, 0.1)' : 'rgba(52, 199, 89, 0.1)') : 'rgba(0, 122, 255, 0.1)' }]}>
                        <Text style={[styles.annTypeText, { color: item.is_announcement ? (item.type === 'campaign' ? Colors.primary : '#34C759') : '#007AFF' }]}>
                          {item.is_announcement ? (item.type === 'campaign' ? 'Kampanya' : 'Bilgilendirme') : 'Sana Özel'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.annDate}>{new Date(item.publish_at || item.sent_at).toLocaleDateString('tr-TR')}</Text>
                        {!item.is_announcement && (
                          <TouchableOpacity onPress={async () => {
                            try {
                              const { deleteNotification } = require('@/services/api');
                              await deleteNotification(item.id);
                              setData(prev => prev ? {
                                ...prev,
                                notifications: prev.notifications.filter(n => n.id !== item.id)
                              } : null);
                            } catch (e) { console.error(e); }
                          }}>
                            <Ionicons name="trash-outline" size={18} color={Colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={styles.annTitle}>{item.title}</Text>
                    <Text style={styles.annBody}>{item.body}</Text>
                  </Card>
                ));
              })()}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsAnnouncementsVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  liveCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  liveCounterText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: '#1E1E2E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  streakCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  streakIcon: {
    fontSize: 36,
  },
  streakTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  streakDays: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  membershipCard: {
    backgroundColor: '#1E1E2E',
    marginBottom: 20,
  },
  membershipContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  membershipDays: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginVertical: 4,
  },
  membershipExpiry: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  membershipBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 12,
    opacity: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
  },
  announcementCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  annHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  annTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  annTypeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  annDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  annTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  annBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  emptyAnn: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyAnnText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
