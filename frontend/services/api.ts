import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TYPES ---
export interface User {
    id: string;
    full_name: string;
    email: string;
    role: 'member' | 'trainer' | 'admin' | 'superadmin';
    current_streak: number;
    best_streak: number;
}

export interface Task {
    id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
}

export interface Membership {
    id: string;
    status: 'active' | 'expired' | 'frozen' | 'grace';
    end_date: string;
    remaining_days: number;
    package_type: string;
}

// --- CONFIG ---
const getBaseUrl = () => {
    // Priority: Env Var > Localhost (for Dev) > Render (Production Fallback)
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) return envUrl;

    if (__DEV__) {
        // In Expo, localhost might not work on physical devices, often better to use IP
        return Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
    }
    return 'https://matchsport.onrender.com';
};

const api = axios.create({
    baseURL: `${getBaseUrl()}/api`,
    timeout: 30000, // Reduced to 30s for better mobile UX
    headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

// --- INTERCEPTORS ---

// Response Interceptor: Handle global errors and auth
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401) {
            console.warn('Session expired. Clearing storage...');
            authToken = null;
            delete api.defaults.headers.common['Authorization'];
            await AsyncStorage.removeItem('authToken');
            // Potential: Emit event to trigger app-wide logout/redirect
        }

        // Log meaningful errors in dev
        if (__DEV__) {
            const status = error.response?.status;
            const data = error.response?.data;
            const message = error.message;

            console.error(`❌ API Error [${originalRequest.url}]:`, {
                status,
                data,
                message,
                hint: message === 'Network Error'
                    ? 'IP adresin yanlış olabilir veya backend çalışmıyor olabilir. Fiziksel cihazda localhost ÇALIŞMAZ.'
                    : 'Sunucu yanıtı hatası.'
            });
        }

        return Promise.reject(error);
    }
);

// --- AUTH HELPERS ---

export const setAuthToken = async (token: string | null, persist: boolean = true) => {
    authToken = token;
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (Platform.OS !== 'web' && persist) {
            await AsyncStorage.setItem('authToken', token);
        }
    } else {
        delete api.defaults.headers.common['Authorization'];
        if (Platform.OS !== 'web') {
            await AsyncStorage.removeItem('authToken');
        }
    }
};

export const loadStoredToken = async () => {
    try {
        if (Platform.OS === 'web') return null;
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
            authToken = token;
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
        }
    } catch (e) {
        console.error('Error loading stored token:', e);
    }
    return null;
};

// --- API METHODS ---

const safeGet = async <T>(url: string, config?: any): Promise<T> => {
    const res = await api.get(url, config);
    return res.data;
};

const safePost = async <T>(url: string, data?: any): Promise<T> => {
    const res = await api.post(url, data);
    return res.data;
};

export const login = async (email: string, password: string, rememberMe: boolean = true) => {
    const data = await safePost<{ token: string; user: User }>('/auth/login', { email, password });
    await setAuthToken(data.token, rememberMe);
    return data;
};

export const getDashboard = () => safeGet<any>('/dashboard');
export const checkIn = () => safePost<any>('/checkin');
export const checkOut = () => safePost<any>('/checkout');
export const getWorkoutProgram = () => safeGet<any>('/workouts/program');
export const getPRRecords = () => safeGet<any[]>('/pr-records');
export const addPRRecord = (data: any) => safePost<any>('/pr-records', data);
export const getMeasurements = (userId?: string) => safeGet<any[]>('/measurements', { params: { user_id: userId } });
export const addMeasurement = (data: any) => safePost<any>('/measurements', data);
export const getDietPlan = () => safeGet<any>('/diet');
export const getAnnouncements = () => safeGet<any[]>('/announcements');
export const getLeaderboard = () => safeGet<any[]>('/leaderboard');
export const getExercises = () => safeGet<any[]>('/exercises');
export const scanQR = (payload: string) => safePost<any>('/scan', { qr_payload: payload });

export const getTasks = async (): Promise<Task[]> => {
    try {
        return await safeGet<Task[]>('/tasks');
    } catch (e) {
        return [];
    }
};

export const completeTask = (taskId: string) => safePost<any>(`/tasks/${taskId}/complete`);
export const getFoods = () => safeGet<any[]>('/foods');
export const addNutritionLog = (data: any) => safePost<any>('/nutrition', data);
export const markNotificationsRead = () => safePost<any>('/notifications/read');
export const deleteNotification = (id: string) => api.delete(`/notifications/${id}`).then(r => r.data);
export const clearNotifications = () => api.delete('/notifications').then(r => r.data);
export const getDailyNutrition = () => safeGet<any>('/nutrition/daily');
export const changePassword = (data: any) => api.put('/auth/change-password', data).then(r => r.data);
export const updateProfile = (data: any) => api.put('/profile', data).then(r => r.data);
export const completeWorkoutDay = (workout_day_id: string) => safePost<any>('/workouts/complete-day', { workout_day_id });
export const logAiMeal = (text: string, mealType?: string) => safePost<any>('/nutrition/ai-log-meal', { text, mealType });
export const generateAiDiet = (prompt_text: string) => safePost<any>('/nutrition/ai-generate-diet', { prompt_text });

// Admin Methods
export const approvePayment = (payment_id: string) => api.put(`/admin/payments/${payment_id}/approve`).then(r => r.data);
export const saveDietPlan = (data: any) => safePost<any>('/diet', data);
export const saveManualWorkout = (data: any) => safePost<any>('/workouts/manual', data);
export const getInstallments = () => safeGet<any[]>('/user/installments');
export const adminGetUserInstallments = (userId: string) => safeGet<any[]>(`/admin/user-installments/${userId}`);
export const adminPayInstallment = (instId: string) => api.put(`/admin/installments/${instId}/pay`).then(r => r.data);
export const adminGetActiveOccupancy = () => safeGet<any[]>('/admin/occupancy/active');
export const adminForceCheckout = (sessionId: string) => safePost<any>(`/admin/occupancy/force-checkout/${sessionId}`);
export const adminGetUserLogs = (userId: string) => safeGet<any[]>(`/admin/user-logs/${userId}`);

export default api;
