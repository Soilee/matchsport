import React, { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, ScrollView, View, Text, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Card from '@/components/common/Card';

import { Colors } from '@/constants/Colors';
import ProfileHeader from '@/components/dashboard/ProfileHeader';
import MinimalistOccupancy from '@/components/dashboard/MinimalistOccupancy';
import ChecklistWorkout from '@/components/dashboard/ChecklistWorkout';
import DailyMission from '@/components/dashboard/DailyMission';
import HealthRingWidget from '@/components/dashboard/HealthRingWidget';
import MembershipCard from '@/components/dashboard/MembershipCard';
import HeatmapCard from '@/components/dashboard/HeatmapCard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import TrainerDashboard from '@/components/dashboard/TrainerDashboard';
import { getDashboard } from '@/services/api';
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
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ExtendedDashboardData | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const [dashboardData, tasksData] = await Promise.all([
        getDashboard(),
        import('@/services/api').then(api => api.getTasks())
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

    // =================== REAL-TIME SYNC ===================
    // This solves the "Web entry not reflected on App" issue
    const membershipSub = import('@/services/supabase').then(({ supabase }) => {
      return supabase
        .channel('memberships_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `user_id=eq.${data?.user?.id}`
        }, (payload) => {
          console.log('Real-time: Membership updated!', payload);
          loadData(); // Re-fetch to get consistent state
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
          loadData();
        })
        .subscribe();
    });

    return () => {
      membershipSub.then(sub => (sub as any).unsubscribe?.());
      occupancySub.then(sub => (sub as any).unsubscribe?.());
    };
  }, [loadData, data?.user?.id]);

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
        <TouchableOpacity onPress={loadData}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const calculateRemainingDays = () => {
    if (!data?.user?.memberships?.[0]?.end_date) return 0;
    const end = new Date(data.user.memberships[0].end_date);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const remainingDays = calculateRemainingDays();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {data && (
          <>
            {/* 1. Header & Quick Actions */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Merhaba, {data?.user?.full_name?.split(' ')[0] || 'Sporcu'} 👋</Text>
                <View style={styles.liveCounterContainer}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveCounterText}>Salonda Şu An: {data?.occupancy?.current_count || 0} Kişi Var</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/(tabs)/announcements' as any)}>
                <Ionicons name="notifications-outline" size={24} color={Colors.text} />
                {data?.unreadNotifications > 0 && <View style={styles.notifBadge} />}
              </TouchableOpacity>
            </View>

            {/* NEW: STREAK WIDGET */}
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

            {/* DEBT WIDGET */}
            {(() => {
              const membership = data?.user?.memberships?.[0];
              if (!membership) return null;
              const remainingDebt = (membership.total_price || 0) - (membership.amount || 0);
              if (remainingDebt > 0) {
                return (
                  <Card style={StyleSheet.flatten([styles.membershipCard, { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.3)', borderWidth: 1 }])} glow>
                    <View style={styles.membershipContent}>
                      <View>
                        <Text style={[styles.membershipLabel, { color: '#FF3B30' }]}>Kalan Borcunuz</Text>
                        <Text style={[styles.membershipDays, { color: '#FF3B30' }]}>₺{remainingDebt}</Text>
                        <Text style={[styles.membershipExpiry, { color: '#FF3B30' }]}>
                          Son Ödeme: {membership.next_payment_date ? new Date(membership.next_payment_date).toLocaleDateString('tr-TR') : 'Belirtilmedi'}
                        </Text>
                      </View>
                      <View style={[styles.membershipBadge, { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                        <Ionicons name="warning-outline" size={40} color="#FF3B30" />
                      </View>
                    </View>
                  </Card>
                );
              }
              return null;
            })()}

            {/* 2. Membership Countdown (PREMIUM) */}
            <Card style={styles.membershipCard} glow>
              <View style={styles.membershipContent}>
                <View>
                  <Text style={styles.membershipLabel}>Üyelik Durumu</Text>
                  <Text style={styles.membershipDays}>{remainingDays} Gün Kaldı</Text>
                  <Text style={styles.membershipExpiry}>
                    Bitiş: {data?.user?.memberships?.[0]?.end_date ? new Date(data.user.memberships[0].end_date).toLocaleDateString('tr-TR') : '-'}
                  </Text>
                </View>
                <View style={styles.membershipBadge}>
                  <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
                </View>
              </View>
            </Card>

            {/* 3. Occupancy Heatmap (MODERN) */}
            <Card title="Salon Yoğunluğu">
              <View style={styles.occupancyContainer}>
                <View style={styles.occupancyHeader}>
                  <Text style={styles.occupancyValue}>
                    %{data?.occupancy?.current_count && data.occupancy.max_capacity ? Math.round((data.occupancy.current_count / data.occupancy.max_capacity) * 100) : 0} Doluluk
                  </Text>
                  <Text style={styles.occupancyStatus}>
                    {(data?.occupancy?.current_count / (data?.occupancy?.max_capacity || 1)) > 0.7 ? 'Şu an çok yoğun' : 'Antrenman için ideal'}
                  </Text>
                </View>
                <View style={styles.heatBarContainer}>
                  <View style={[styles.heatBar, {
                    width: `${data?.occupancy?.current_count && data.occupancy.max_capacity ? (data.occupancy.current_count / data.occupancy.max_capacity) * 100 : 0}%`,
                    backgroundColor: (data?.occupancy?.current_count / (data?.occupancy?.max_capacity || 1)) > 0.7 ? '#FF3B30' : '#34C759'
                  }]} />
                </View>
                <View style={styles.heatLabels}>
                  <Text style={styles.heatLabel}>Sakin</Text>
                  <Text style={styles.heatLabel}>Orta</Text>
                  <Text style={styles.heatLabel}>Yoğun</Text>
                </View>
              </View>
            </Card>

            {/* NEW: Hourly Heatmap for Members */}
            {data?.heatmap && (
              <HeatmapCard data={data.heatmap} />
            )}

            {/* 4. Next Workout / Motivator */}
            <Card style={styles.nextWorkoutCard}>
              <View style={styles.nextWorkoutContent}>
                <View style={styles.nextWorkoutIcon}>
                  <Ionicons name="fitness" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextWorkoutTitle}>Sıradaki Antrenman</Text>
                  <Text style={styles.nextWorkoutName}>{data?.todayWorkout?.program_name || data?.todayWorkout?.muscle_group || 'Dinlenme Günü'}</Text>
                </View>
                <TouchableOpacity style={styles.startButton} onPress={() => router.push('/(tabs)/workouts' as any)}>
                  <Text style={styles.startButtonText}>BAŞLA</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Daily Missions */}
            <View style={{ marginTop: 20 }}>
              {tasks.map(task => (
                <View key={task.id} style={styles.section}>
                  <DailyMission
                    task={task.title}
                    completed={task.is_completed}
                    onToggle={async () => {
                      try {
                        const { completeTask } = await import('@/services/api');
                        await completeTask(task.id);
                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: true } : t));
                      } catch (e) {
                        console.error('Task toggle error', e);
                      }
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Matchless Fitness Premium v3.0</Text>
            </View>
          </>
        )}
      </ScrollView>
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
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#1E1E2E',
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
  occupancyContainer: {
    paddingVertical: 10,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  occupancyValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  occupancyStatus: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  heatBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  heatBar: {
    height: '100%',
    borderRadius: 6,
  },
  heatLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  heatLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  nextWorkoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  nextWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  nextWorkoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextWorkoutTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  nextWorkoutName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  section: {
    marginBottom: 12,
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
});
