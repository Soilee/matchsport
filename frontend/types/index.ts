export interface User {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: 'member' | 'trainer' | 'admin';
    profile_photo_url: string | null;
    birth_date: string;
    height_cm?: number;
    weight_kg?: number;
    current_streak?: number;
    best_streak?: number;
    total_checkins?: number;
    total_visits?: number;
    prestige_points?: number;
    notification_enabled?: boolean;
}

export interface Membership {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    remaining_days: number;
    status: 'active' | 'grace' | 'expired' | 'frozen';
    grace_days_remaining: number;
    amount: number;
    total_price?: number;
    next_payment_date?: string;
    package_type?: string;
    last_expiry_notification?: string;
    is_blocked?: boolean;
}

export interface HeatmapData {
    hour_of_day: number;
    day_of_week: string;
    avg_count: number;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon_type: string;
    type: 'strength' | 'consistency' | 'time' | 'milestone';
    earned_at?: string;
}

export interface Exercise {
    id: string;
    name: string;
    muscle_group: string;
    equipment: string;
    sets: number;
    reps: number;
    weight_kg: number;
    rest_seconds: number;
    video_url?: string;
    completed?: boolean;
}

export interface WorkoutProgram {
    id: string;
    user_id: string;
    trainer_id: string;
    program_name: string;
    start_date: string;
    end_date: string;
    is_active: number;
}

export interface DietPlan {
    id: string;
    user_id: string;
    plan_name: string;
    goal: string;
    daily_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meals: any;
    is_active: number;
}

export interface WorkoutDay {
    id: string;
    day_of_week: string;
    muscle_group: string;
    exercises: Exercise[];
    is_off_day?: boolean;
    program_name?: string;
}

export interface PRRecord {
    id: string;
    exercise_name: string;
    muscle_group: string;
    max_weight_kg: number;
    reps: number;
    achieved_at: string;
    notes: string;
}

export interface BodyMeasurement {
    id: string;
    user_id: string;
    weight_kg: number;
    body_fat_pct: number;
    height_cm?: number;
    shoulder_cm?: number;
    bicep_cm?: number;
    waist_cm?: number;
    chest_cm?: number;
    neck_cm?: number;
    thigh_cm?: number;
    hips_cm?: number;
    measured_at: string;
}

export interface Installment {
    id: string;
    user_id: string;
    membership_id: string | null;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'overdue';
    paid_at?: string;
    created_at: string;
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    type: 'campaign' | 'schedule' | 'general';
    publish_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: string;
    is_read: boolean;
    sent_at: string;
}

export interface WorkoutLog {
    id: string;
    user_id: string;
    workout_date: string;
    duration_minutes: number;
}

export interface LeaderboardEntry {
    id: string;
    user_id: string;
    full_name: string;
    display_name: string;
    nickname: string | null;
    monthly_visits: number;
    current_streak: number;
    best_streak: number;
    profile_photo_url: string | null;
    kvkk_mask: number;
}

export interface DashboardData {
    user: User;
    membership: Membership | null;
    occupancy: { current_count: number; max_capacity: number };
    heatmap: HeatmapData[];
    todayWorkout: WorkoutDay | null;
    prRecords: PRRecord[];
    measurements: BodyMeasurement[];
    announcements: Announcement[];
    leaderboard: {
        attendance: LeaderboardEntry[];
        strength: LeaderboardEntry[];
    };
    badges: Badge[];
    qrCode: string | null;
    workout_history: WorkoutLog[];
    notifications: Notification[];
    unreadNotifications: number;
    installments: Installment[];
    adminStats?: {
        totalMembers: number;
        activeMembers: number;
        totalRevenue: number;
        expiringIn1Day: number;
        expiringIn7Days: number;
        expiringIn14Days: number;
    };
    trainerStats?: {
        activeStudents: number;
        students: any[];
    };
}
