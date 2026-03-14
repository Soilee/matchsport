import axios from 'axios';
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Use localhost for web, 10.0.2.2 for Android emulator, localhost for iOS simulator
const getBaseUrl = () => {
    return 'https://matchsport.onrender.com';
};

const api = axios.create({
    baseURL: `${getBaseUrl()}/api`,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

export interface Task {
    id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
}

// Interceptor for 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.warn('Session expired or invalid. Clearing token...');
            authToken = null;
            delete api.defaults.headers.common['Authorization'];
            await AsyncStorage.removeItem('authToken');
        }
        return Promise.reject(error);
    }
);

let authToken: string | null = null;

export const setAuthToken = async (token: string | null) => {
    authToken = token;
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (Platform.OS !== 'web') {
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

export const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    await setAuthToken(res.data.token);
    return res.data;
};

export const getDashboard = async () => {
    const res = await api.get('/dashboard');
    return res.data;
};

export const checkIn = async () => {
    const res = await api.post('/checkin');
    return res.data;
};

export const checkOut = async () => {
    const res = await api.post('/checkout');
    return res.data;
};

export const getWorkoutProgram = async () => {
    const res = await api.get('/workouts/program');
    return res.data;
};

export const getPRRecords = async () => {
    const res = await api.get('/pr-records');
    return res.data;
};

export const addPRRecord = async (data: { exercise_id: string; max_weight_kg: number; reps: number; notes: string }) => {
    const res = await api.post('/pr-records', data);
    return res.data;
};

export const getMeasurements = async () => {
    const res = await api.get('/measurements');
    return res.data;
};

export const addMeasurement = async (data: any) => {
    const res = await api.post('/measurements', data);
    return res.data;
};

export const getDietPlan = async () => {
    const res = await api.get('/diet');
    return res.data;
};

export const getAnnouncements = async () => {
    const res = await api.get('/announcements');
    return res.data;
};

export const getLeaderboard = async () => {
    const res = await api.get('/leaderboard');
    return res.data;
};

export const getExercises = async () => {
    const res = await api.get('/exercises');
    return res.data;
};

export const scanQR = async (payload: string) => {
    const res = await api.post('/scan', { qr_payload: payload });
    return res.data;
};

export const getTasks = async (): Promise<Task[]> => {
    try {
        const res = await api.get('/tasks');
        return res.data || [];
    } catch (e) {
        console.error('getTasks error', e);
        return [];
    }
};

export const completeTask = async (taskId: string) => {
    const res = await api.post(`/tasks/${taskId}/complete`);
    return res.data;
};

export const getFoods = async () => {
    const res = await api.get('/foods');
    return res.data;
};

export const addNutritionLog = async (data: { food_item_id: string; quantity_g: number; meal_type?: string }) => {
    const res = await api.post('/nutrition', data);
    return res.data;
};

export const getDailyNutrition = async () => {
    const res = await api.get('/nutrition/daily');
    return res.data;
};

export const changePassword = async (data: any) => {
    const res = await api.put('/auth/change-password', data);
    return res.data;
};

export const updateProfile = async (data: any) => {
    const res = await api.put('/profile', data);
    return res.data;
};

export const updateUserMeasurements = async (userId: string, data: any) => {
    const res = await api.put(`/admin/users/${userId}/measurements`, data);
    return res.data;
};

export const completeWorkoutDay = async (workout_day_id: string) => {
    const res = await api.post('/workouts/complete-day', { workout_day_id });
    return res.data;
};

export const logAiMeal = async (text: string) => {
    const res = await api.post('/nutrition/ai-log-meal', { text });
    return res.data;
};

export const generateAiDiet = async (prompt_text: string) => {
    const res = await api.post('/nutrition/ai-generate-diet', { prompt_text });
    return res.data;
};

export const approvePayment = async (payment_id: string) => {
    const res = await api.put(`/admin/payments/${payment_id}/approve`);
    return res.data;
};

export const saveDietPlan = async (data: any) => {
    const res = await api.post('/diet', data);
    return res.data;
};

export const getInstallments = async () => (await api.get('/user/installments')).data;
export const adminGetUserInstallments = async (userId: string) => (await api.get(`/admin/user-installments/${userId}`)).data;
export const adminPayInstallment = async (instId: string) => (await api.post(`/admin/pay-installment/${instId}`)).data;


export default api;
