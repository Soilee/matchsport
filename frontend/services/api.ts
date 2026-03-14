import axios from 'axios';
import { Platform } from 'react-native';

// Use localhost for web, 10.0.2.2 for Android emulator, localhost for iOS simulator
const getBaseUrl = () => {
    return 'https://matchsport.onrender.com';
};

const api = axios.create({
    baseURL: `${getBaseUrl()}/api`,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor for 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // If we're on web, we might want to window.location.href
            // But since we're using expo-router, we'll let the screens handle it or use a global navigation ref if available.
            // For now, let's just make sure the error is passed through clearly.
            console.warn('Session expired or invalid. Redirecting to login...');
        }
        return Promise.reject(error);
    }
);

let authToken: string | null = null;

export const setAuthToken = (token: string) => {
    authToken = token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAuthToken(res.data.token);
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

export const getTasks = async () => {
    const res = await api.get('/tasks');
    return res.data;
};

export const completeTask = async (taskId: string) => {
    const res = await api.put(`/tasks/${taskId}/complete`);
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
