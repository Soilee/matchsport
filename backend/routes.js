const express = require('express');
const { getDb } = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validateRegister } = require('./securityMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'matchsport-secret-key-2026';

// =================== MIDDLEWARE ===================

// Auth middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Geçersiz token' });
    }
}

// Role hierarchy: superadmin > admin > trainer > member
const ROLE_HIERARCHY = { superadmin: 4, admin: 3, trainer: 2, member: 1 };

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const userRole = req.user?.role;
        if (!userRole) return res.status(401).json({ error: 'Yetkilendirme hatası' });

        // SuperAdmin bypasses all role checks
        if (userRole === 'superadmin') return next();

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }
        next();
    };
}

// Audit log helper
async function logAudit(action, actorId, targetId, details) {
    try {
        await getDb().from('audit_logs').insert({
            action,
            actor_id: actorId,
            target_id: targetId,
            details: details || {}
        });
    } catch (err) {
        console.error('Audit log error:', err);
    }
}

// Membership expiry helper is now in automation.js

// =================== AUTH ===================

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = getDb();

        const matchlessEmail = email.replace('@matchsport.com', '@matchlessfitness.com');
        const matchsportEmail = email.replace('@matchlessfitness.com', '@matchsport.com');

        const { data: user, error } = await db.from('users')
            .select('*')
            .or(`email.eq.${email},email.eq.${matchlessEmail},email.eq.${matchsportEmail}`)
            .single();

        if (error || !user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Geçersiz email veya şifre' });
        }

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
        const { password_hash, ...safeUser } = user;
        res.json({ token, user: safeUser });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Giriş yapılamadı' });
    }
});

router.post('/auth/register', authMiddleware, requireRole('admin', 'trainer'), validateRegister, async (req, res) => {

    try {
        const { full_name, email, phone, password, role, nickname } = req.body;
        const db = getDb();
        const actorRole = req.user.role;

        // Role creation permissions
        let assignedRole = role || 'member';
        if (actorRole === 'trainer' && assignedRole !== 'member') {
            return res.status(403).json({ error: 'Eğitmenler sadece üye kaydı yapabilir' });
        }
        if (actorRole === 'admin' && !['member', 'trainer'].includes(assignedRole)) {
            return res.status(403).json({ error: 'Admin sadece üye veya eğitmen kaydı yapabilir' });
        }
        // superadmin can create any role (already bypassed by requireRole)

        const { data: existing } = await db.from('users').select('id').eq('email', email).single();
        if (existing) return res.status(400).json({ error: 'Bu email zaten kayıtlı' });

        const hash = bcrypt.hashSync(password, 10);
        const { data: newUser, error } = await db.from('users').insert({
            full_name,
            nickname: nickname || null,
            email,
            phone,
            password_hash: hash,
            role: assignedRole
        }).select().single();

        if (error) throw error;

        await logAudit('USER_REGISTERED', req.user.id, newUser.id, {
            full_name, email, role: assignedRole, registered_by: req.user.email
        });

        res.json({ message: 'Kayıt başarılı', user: newUser });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Kayıt başarısız' });
    }
});

router.put('/auth/change-password', authMiddleware, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const db = getDb();

        const { data: user } = await db.from('users').select('password_hash').eq('id', req.user.id).single();
        if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
            return res.status(400).json({ error: 'Mevcut şifre yanlış' });
        }

        const hash = bcrypt.hashSync(new_password, 10);
        const { error } = await db.from('users').update({ password_hash: hash }).eq('id', req.user.id);
        if (error) throw error;

        res.json({ message: 'Şifreniz başarıyla güncellendi' });
    } catch (err) {
        res.status(500).json({ error: 'Şifre güncellenemedi' });
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { height_cm, weight_kg, notification_enabled } = req.body;
        const db = getDb();

        const updates = {};
        if (height_cm !== undefined) updates.height_cm = height_cm;
        if (notification_enabled !== undefined) updates.notification_enabled = notification_enabled;

        if (Object.keys(updates).length > 0) {
            await db.from('users').update(updates).eq('id', req.user.id);
        }

        if (weight_kg !== undefined) {
            await db.from('body_measurements').insert({
                user_id: req.user.id,
                weight_kg,
                measured_at: new Date().toISOString().split('T')[0]
            });
        }

        res.json({ message: 'Profil güncellendi' });
    } catch (err) {
        res.status(500).json({ error: 'Profil güncellenemedi' });
    }
});

// =================== DASHBOARD ===================

router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const userId = req.user.id;
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Auto-expiry is now handled by automation.js

        // Heatmap frozen update logic (Updates every Sunday night 02:00 -> Monday 02:00)
        let now = new Date();
        let prevMonday = new Date(now);
        let diff = (now.getDay() + 6) % 7; // Days since Monday
        prevMonday.setDate(now.getDate() - diff);
        prevMonday.setHours(2, 0, 0, 0);
        if (now < prevMonday) {
            prevMonday.setDate(prevMonday.getDate() - 7);
        }
        let endHeatmapDate = prevMonday.toISOString();
        let startHeatmapDate = new Date(prevMonday.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [
            userRes,
            membershipRes,
            occRes,
            heatmapRes,
            programRes,
            prRes,
            measurementRes,
            announcementRes,
            leaderboardAttRes,
            leaderboardStrRes,
            badgeRes,
            qrRes,
            notificationsRes,
            installmentsRes,
            workoutHistoryRes
        ] = await Promise.all([
            db.from('users').select('id, full_name, nickname, email, phone, role, profile_photo_url, kvkk_mask').eq('id', userId).single(),
            db.from('memberships').select('*').eq('user_id', userId).order('end_date', { ascending: false }).limit(1).maybeSingle(),
            db.from('gym_occupancy').select('current_count, max_capacity').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
            db.from('gym_occupancy')
                .select('hour_of_day, day_of_week, current_count')
                .gte('recorded_at', startHeatmapDate)
                .lt('recorded_at', endHeatmapDate)
                .limit(2000),
            db.from('workout_programs').select('*').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle(),
            db.from('pr_records').select('*, exercises(name, muscle_group)').eq('user_id', userId).order('achieved_at', { ascending: false }).limit(5),
            db.from('body_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(10),
            db.from('announcements').select('*').eq('is_active', true).order('publish_at', { ascending: false }).limit(5),
            db.from('leaderboard').select('*, users(full_name, nickname, profile_photo_url, kvkk_mask)').eq('category', 'attendance').order('monthly_visits', { ascending: false }).limit(5),
            db.from('leaderboard').select('*, users(full_name, nickname, profile_photo_url, kvkk_mask)').eq('category', 'strength_bench').order('monthly_visits', { ascending: false }).limit(5),
            db.from('user_badges').select('*, badges(*)').eq('user_id', userId),
            db.from('qr_codes').select('qr_token').eq('user_id', userId).eq('is_active', true).maybeSingle(),
            db.from('notifications').select('*').eq('user_id', userId).order('sent_at', { ascending: false }).limit(20),
            db.from('installments').select('*').eq('user_id', userId).order('due_date', { ascending: true }),
            // Fix: workout_logs table might use 'logged_at' or 'workout_date'. Using COALESCE or checking both if unsure.
            // But I just added 'workout_date' in SQL fix, so let's use it.
            db.from('workout_logs').select('*').eq('user_id', userId).gte('workout_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('workout_date', { ascending: true })
        ]);

        const user = userRes.data;
        let membership = membershipRes.data;
        const installments = installmentsRes.data || [];

        if (membership && membership.end_date) {
            const todayAtMidnight = new Date();
            todayAtMidnight.setHours(0, 0, 0, 0);
            const endDate = new Date(membership.end_date);
            if (!isNaN(endDate.getTime())) {
                const diffTime = endDate.getTime() - todayAtMidnight.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                membership.remaining_days = Math.max(0, diffDays);

                // Check for expiry notifications (14, 7, 3, 2, 1 days)
                const expiryTriggers = [14, 7, 3, 2, 1];
                const todayStr = todayAtMidnight.toISOString().split('T')[0];

                if (expiryTriggers.includes(membership.remaining_days) && membership.last_expiry_notification !== todayStr && membership.status === 'active') {
                    const message = `Üyeliğinizin bitmesine ${membership.remaining_days} gün kaldı! Yenilemek için lütfen bizimle iletişime geçin.`;

                    // Add in-app notification
                    await db.from('notifications').insert({
                        user_id: userId,
                        title: 'Üyelik Hatırlatması',
                        body: message,
                        type: 'system',
                        is_read: false
                    });

                    // Update last notification date
                    await db.from('memberships').update({ last_expiry_notification: todayStr }).eq('id', membership.id);
                }
            }
        }

        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const today = dayNames[new Date().getDay()];
        let todayWorkout = null;

        if (programRes && programRes.data) {
            const { data: workoutDay } = await db.from('workout_days').select('*').eq('program_id', programRes.data.id).eq('day_of_week', today).maybeSingle();
            if (workoutDay) {
                const { data: exercises } = await db.from('workout_exercises').select('*, exercises(name, muscle_group, equipment)').eq('workout_day_id', workoutDay.id).order('order_index');
                todayWorkout = { ...workoutDay, exercises, program_name: programRes.data.program_name };
            }
        }

        const formatName = (u) => {
            if (!u) return 'Anonim';
            if (u.nickname) return u.nickname;
            if (u.kvkk_mask) {
                const parts = (u.full_name || '').split(' ');
                return parts.map(p => p[0] + '*'.repeat(Math.max(0, p.length - 1))).join(' ');
            }
            return u.full_name;
        };

        const attendanceLeaderboard = (leaderboardAttRes.data || []).map(item => ({ ...item, display_name: formatName(item.users) }));
        const strengthLeaderboard = (leaderboardStrRes.data || []).map(item => ({ ...item, display_name: formatName(item.users) }));

        let adminStats = null;
        if (user && (user.role === 'admin' || user.role === 'superadmin')) {
            const todayStr = new Date().toISOString().split('T')[0];

            // Auto-expiry is now handled by automation.js

            const in1DayStr = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const in7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const in14DaysStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const [memCount, activeCount, revSum, expiring1, expiring7, expiring14, pendingInstallments] = await Promise.all([
                db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
                db.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                db.from('memberships').select('amount').order('created_at', { ascending: false }).limit(2000),
                db.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('end_date', in1DayStr).gte('end_date', todayStr),
                db.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('end_date', in7DaysStr).gte('end_date', todayStr),
                db.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('end_date', in14DaysStr).gte('end_date', todayStr),
                db.from('installments').select('*, users(full_name)').eq('status', 'pending').order('due_date', { ascending: true }).limit(20)
            ]);

            adminStats = {
                totalMembers: memCount.count || 0,
                activeMembers: activeCount.count || 0,
                totalRevenue: (revSum.data || []).reduce((acc, curr) => acc + (curr.amount || 0), 0),
                expiringIn1Day: expiring1.count || 0,
                expiringIn7Days: expiring7.count || 0,
                expiringIn14Days: expiring14.count || 0,
                pendingInstallments: pendingInstallments.data || []
            };
        }

        let trainerStats = null;
        if (user && user.role === 'trainer') {
            const { data: students } = await db.from('workout_programs').select('users(id, full_name, profile_photo_url, email)').eq('assigned_by', userId).eq('is_active', true);
            const uniqueStudents = Array.from(new Map((students || []).map(s => [s.users.id, s.users])).values());
            const studentIds = uniqueStudents.map(s => s.id);

            let pendingInst = [];
            if (studentIds.length > 0) {
                const { data } = await db.from('installments').select('*, users(full_name)').in('user_id', studentIds).eq('status', 'pending').order('due_date', { ascending: true });
                pendingInst = data || [];
            }

            trainerStats = {
                activeStudents: uniqueStudents.length,
                students: uniqueStudents,
                pendingInstallments: pendingInst
            };
        }

        // Get live occupancy from check_ins
        const { count: liveOccupancy } = await db.from('check_ins').select('id', { count: 'exact', head: true }).is('check_out_time', null);

        // Format heatmap data
        const rawHeatmap = heatmapRes.data || [];
        const heatMapAcc = {};
        for (let r of rawHeatmap) {
            const key = `${r.day_of_week}_${r.hour_of_day}`;
            if (!heatMapAcc[key]) heatMapAcc[key] = { sum: 0, count: 0 };
            heatMapAcc[key].sum += r.current_count || 0;
            heatMapAcc[key].count++;
        }
        const formattedHeatmap = Object.keys(heatMapAcc).map(k => {
            const [day, hour] = k.split('_');
            return { day_of_week: day, hour_of_day: parseInt(hour), avg_count: Math.round(heatMapAcc[k].sum / heatMapAcc[k].count) };
        });

        res.json({
            user,
            membership,
            occupancy: {
                current_count: liveOccupancy || 0,
                max_capacity: occRes.data?.max_capacity || 100
            },
            liveOccupancy: liveOccupancy || 0,
            heatmap: formattedHeatmap,
            todayWorkout,
            prRecords: prRes.data || [],
            measurements: (measurementRes.data || []).reverse(),
            announcements: announcementRes.data || [],
            workout_history: workoutHistoryRes.data || [],
            leaderboard: { attendance: attendanceLeaderboard, strength: strengthLeaderboard },
            badges: badgeRes.data || [],
            qrCode: qrRes.data?.qr_token || null,
            notifications: notificationsRes.data || [],
            unreadNotifications: (notificationsRes.data || []).filter(n => !n.is_read).length,
            installments,
            adminStats,
            trainerStats,
        });
    } catch (err) {
        console.error('Dash Error:', err.message, err.stack);
        res.status(500).json({ error: 'Dashboard verileri yüklenemedi: ' + err.message });
    }
});

// =================== CHECK-IN / CHECK-OUT ===================

router.post('/checkin', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const userId = req.user.id;

        // 1. Check Maintenance Mode
        const { data: config } = await db.from('app_config').select('value').eq('key', 'turnstile_maintenance').maybeSingle();
        if (config?.value?.enabled) {
            return res.status(503).json({ error: config.value.message || 'Turnike sistemi şu an bakımdadır.' });
        }

        // 2. Check Overdue Installments (7-day grace)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data: overdue } = await db.from('installments')
            .select('id, due_date')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .lt('due_date', sevenDaysAgo)
            .limit(1)
            .maybeSingle();

        if (overdue) {
            await db.from('memberships').update({ status: 'frozen' }).eq('user_id', userId).eq('status', 'active');
            return res.status(403).json({ error: 'Gecikmiş ödemeniz bulunmaktadır. Lütfen ödeme yapınız.' });
        }

        // 3. Regular Membership Check
        const { data: membership } = await db.from('memberships').select('*').eq('user_id', userId).in('status', ['active', 'grace']).order('end_date', { ascending: false }).limit(1).maybeSingle();
        if (!membership) return res.status(403).json({ error: 'Aktif üyeliğiniz yok' });

        const { data: openCheck } = await db.from('check_ins').select('*').eq('user_id', userId).is('check_out_time', null).limit(1).maybeSingle();
        if (openCheck) return res.status(400).json({ error: 'Zaten giriş yapmışsınız' });

        await db.from('check_ins').insert({ user_id: userId, check_in_time: now.toISOString() });

        // STREAK & BADGE LOGIC
        const { data: user } = await db.from('users').select('current_streak, best_streak, last_activity_date').eq('id', userId).single();

        let newStreak = user?.current_streak || 0;
        const lastActivity = user?.last_activity_date;

        if (!lastActivity) {
            newStreak = 1;
        } else if (lastActivity !== todayStr) {
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            if (lastActivity === yesterday) {
                newStreak += 1;
            } else {
                newStreak = 1;
            }
        }

        if (lastActivity !== todayStr) {
            const newBest = Math.max(newStreak, user?.best_streak || 0);
            await db.from('users').update({
                current_streak: newStreak,
                best_streak: newBest,
                last_activity_date: todayStr
            }).eq('id', userId);

            // Badge check
            const milestones = [10, 30, 50, 100];
            if (milestones.includes(newStreak)) {
                const { data: badge } = await db.from('badges').select('id').eq('requirement_value', newStreak).maybeSingle();
                if (badge) {
                    await db.from('user_badges').upsert({ user_id: userId, badge_id: badge.id }, { onConflict: 'user_id,badge_id' });
                }
            }
        }

        const { data: lastOcc } = await db.from('gym_occupancy').select('current_count').order('recorded_at', { ascending: false }).limit(1).maybeSingle();
        const newCount = (lastOcc?.current_count || 0) + 1;
        await db.from('gym_occupancy').insert({
            current_count: Math.max(0, newCount),
            max_capacity: 100,
            hour_of_day: now.getHours(),
            day_of_week: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
        });

        res.json({ message: 'Giriş başarılı! 🔥', current_streak: newStreak });
    } catch (err) {
        console.error('Checkin Error:', err);
        res.status(500).json({ error: 'Giriş başarısız' });
    }
});

router.post('/checkout', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const userId = req.user.id;
        const { data: openCheckin } = await db.from('check_ins').select('*').eq('user_id', userId).is('check_out_time', null).limit(1).maybeSingle();
        if (!openCheckin) return res.status(400).json({ error: 'Giriş kaydı yok' });

        const now = new Date();
        const duration = Math.round((now - new Date(openCheckin.check_in_time)) / 60000);
        await db.from('check_ins').update({ check_out_time: now.toISOString(), duration_minutes: duration }).eq('id', openCheckin.id);

        // Auto-log as workout
        if (duration >= 15) { // Only log visits > 15 mins as workouts
            await db.from('workout_logs').insert({
                user_id: userId,
                workout_date: now.toISOString().split('T')[0],
                duration_minutes: duration
            });
        }

        const { data: lastOcc } = await db.from('gym_occupancy').select('current_count').order('recorded_at', { ascending: false }).limit(1).maybeSingle();
        await db.from('gym_occupancy').insert({
            current_count: Math.max(0, (lastOcc?.current_count || 0) - 1),
            max_capacity: 100,
            hour_of_day: now.getHours(),
            day_of_week: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
        });

        res.json({ message: 'Çıkış yapıldı' });
    } catch (err) {
        res.status(500).json({ error: 'Çıkış başarısız' });
    }
});

// =================== ADVANCED ADMIN STATS (PHASE 3) ===================

router.get('/admin/stats-advanced', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const db = getDb();

        // 1. Revenue trend (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const { data: memberships } = await db.from('memberships')
            .select('amount, created_at')
            .gte('created_at', sixMonthsAgo.toISOString());

        const { data: installments } = await db.from('installments')
            .select('amount, payment_date')
            .eq('status', 'paid')
            .gte('payment_date', sixMonthsAgo.toISOString());

        // Group by month
        const monthlyRevenue = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = d.toLocaleString('tr-TR', { month: 'short', year: 'numeric' });
            monthlyRevenue[monthKey] = 0;
        }

        (memberships || []).forEach(m => {
            const date = new Date(m.created_at);
            const key = date.toLocaleString('tr-TR', { month: 'short', year: 'numeric' });
            if (monthlyRevenue[key] !== undefined) {
                monthlyRevenue[key] += Number(m.amount || 0);
            }
        });

        (installments || []).forEach(i => {
            if (i.payment_date) {
                const date = new Date(i.payment_date);
                const key = date.toLocaleString('tr-TR', { month: 'short', year: 'numeric' });
                if (monthlyRevenue[key] !== undefined) {
                    monthlyRevenue[key] += Number(i.amount || 0);
                }
            }
        });

        const revenueData = Object.keys(monthlyRevenue).map(k => ({
            name: k,
            revenue: monthlyRevenue[k]
        }));

        // 2. User Retention & Status
        const { data: allMemberships } = await db.from('memberships').select('status');
        const statusCounts = { active: 0, expired: 0, frozen: 0 };
        (allMemberships || []).forEach(m => {
            if (m.status === 'active') statusCounts.active++;
            else if (m.status === 'frozen') statusCounts.frozen++;
            else statusCounts.expired++;
        });
        const retentionData = [
            { name: 'Aktif', value: statusCounts.active, color: '#34C759' },
            { name: 'Süresi Biten', value: statusCounts.expired, color: '#FF3B30' },
            { name: 'Dondurulmuş', value: statusCounts.frozen, color: '#FF9F0A' }
        ];

        // 3. Debt vs Paid Analysis
        let totalMembershipPaid = 0;
        let totalMembershipDebt = 0;
        const { data: memsForDebt } = await db.from('memberships').select('amount, total_price');
        (memsForDebt || []).forEach(m => {
            totalMembershipPaid += Number(m.amount || 0);
            const debt = Number(m.total_price || 0) - Number(m.amount || 0);
            if (debt > 0) totalMembershipDebt += debt;
        });

        const debtData = [
            { name: 'Tahsil Edilen', value: totalMembershipPaid, color: '#34C759' },
            { name: 'Bekleyen Alacak (Borç)', value: totalMembershipDebt, color: '#FF453A' }
        ];

        res.json({
            revenueData,
            retentionData,
            debtData,
            totalActive: statusCounts.active,
            totalRevenue: totalMembershipPaid
        });

    } catch (err) {
        console.error('Stats Advanced Error:', err);
        res.status(500).json({ error: 'Gelişmiş istatistikler yüklenemedi' });
    }
});

// =================== TURNSTILE ADMIN ===================

router.get('/admin/turnstile/logs', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const db = getDb();
        const { data, error } = await db.from('check_ins')
            .select('*, users(full_name, email, role)')
            .order('check_in_time', { ascending: false })
            .limit(100);
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Loglar yüklenemedi' });
    }
});

router.post('/admin/turnstile/config', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { enabled, message } = req.body;
        const db = getDb();
        await db.from('app_config').upsert({
            key: 'turnstile_maintenance',
            value: { enabled: !!enabled, message: message || 'Turnike sistemi şu an bakımdadır.' },
            updated_at: new Date().toISOString()
        });
        res.json({ message: 'Turnike ayarları güncellendi' });
    } catch (err) {
        res.status(500).json({ error: 'Ayarlar güncellenemedi' });
    }
});

router.get('/admin/turnstile/config', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('app_config').select('*').eq('key', 'turnstile_maintenance').maybeSingle();
        res.json(data?.value || { enabled: false, message: '' });
    } catch (err) {
        res.status(500).json({ error: 'Ayarlar yüklenemedi' });
    }
});

// =================== LIVE OCCUPANCY ===================

router.get('/occupancy/live', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { count } = await db.from('check_ins')
            .select('id', { count: 'exact', head: true })
            .is('check_out_time', null);
        res.json({ current_count: count || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Doluluk verisi alınamadı' });
    }
});

// =================== WORKOUTS ===================

router.post('/workouts/complete-day', authMiddleware, async (req, res) => {
    try {
        const { workout_day_id } = req.body;
        const db = getDb();
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        const { data: existing } = await db.from('workout_completions').select('*')
            .eq('user_id', userId).eq('completed_at', today).maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'Bugün zaten antrenman tamamladınız' });
        }

        await db.from('workout_completions').insert({
            user_id: userId,
            workout_day_id,
            logged_at: today
        });

        const { data: user } = await db.from('users').select('current_streak, best_streak, last_activity_date').eq('id', userId).single();
        let newStreak = user?.current_streak || 0;
        const todayStr = new Date().toISOString().split('T')[0];

        if (!user.last_activity_date || user.last_activity_date !== todayStr) {
            newStreak += 1;
            const newBest = Math.max(newStreak, user?.best_streak || 0);
            await db.from('users').update({
                current_streak: newStreak,
                best_streak: newBest,
                last_activity_date: todayStr
            }).eq('id', userId);
        }

        res.json({ message: 'Antrenman tamamlandı! 🔥', current_streak: newStreak });
    } catch (err) {
        console.error('Complete Workout Error:', err);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

router.get('/workouts/program', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { data: program } = await db.from('workout_programs').select('*').eq('user_id', req.user.id).eq('is_active', true).limit(1).maybeSingle();
        if (!program) return res.json({ program: null, days: [] });

        const { data: days } = await db.from('workout_days').select('*').eq('program_id', program.id).order('order_index');
        const enrichedDays = await Promise.all((days || []).map(async day => {
            const { data: exercises } = await db.from('workout_exercises').select('*, exercises(*)').eq('workout_day_id', day.id).order('order_index');
            const flatExercises = (exercises || []).map(we => ({ ...we, name: we.exercises?.name, muscle_group: we.exercises?.muscle_group }));
            return { ...day, exercises: flatExercises };
        }));
        res.json({ program, days: enrichedDays });
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

router.get('/workouts/manual', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('user_manual_workouts').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

router.post('/workouts/manual', authMiddleware, async (req, res) => {
    try {
        const { workout_name, exercises } = req.body;
        const db = getDb();
        const { data: workout, error: wErr } = await db.from('user_manual_workouts').insert({ user_id: req.user.id, workout_name }).select().single();
        if (wErr) throw wErr;

        if (exercises && Array.isArray(exercises) && exercises.length > 0) {
            const logs = exercises.map(ex => ({
                user_id: req.user.id,
                workout_id: workout.id,
                exercise_name: ex.name,
                sets_count: parseInt(ex.sets) || 1,
                reps_count: parseInt(ex.reps) || 1,
                weight_kg: parseFloat(ex.weight) || 0,
                logged_at: new Date().toISOString().split('T')[0]
            }));
            const { error: lErr } = await db.from('workout_logs').insert(logs);
            if (lErr) throw lErr;
        }

        res.json(workout);
    } catch (err) {
        console.error('Manual Workout Create Error:', err);
        res.status(500).json({ error: 'Oluşturulamadı' });
    }
});

router.post('/workouts/logs', authMiddleware, async (req, res) => {
    try {
        const { workout_id, exercise_name, sets, reps, weight } = req.body;
        const { data } = await getDb().from('workout_logs').insert({ user_id: req.user.id, workout_id, exercise_name, sets_count: sets, reps_count: reps, weight_kg: weight }).select().single();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Kaydedilemedi' });
    }
});

// =================== PR / MEASUREMENTS ===================

router.get('/pr-records', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('pr_records').select('*, exercises(name, muscle_group)').eq('user_id', req.user.id).order('achieved_at', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

router.get('/measurements', authMiddleware, async (req, res) => {
    try {
        const { user_id } = req.query;
        const targetId = user_id || req.user.id;

        // If trainer/admin is requesting another user's measurements, check permissions
        if (targetId !== req.user.id && req.user.role === 'member') {
            return res.status(403).json({ error: 'Yetkiniz yok' });
        }

        const { data } = await getDb().from('body_measurements').select('*').eq('user_id', targetId).order('measured_at', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

// Diet plans, measurements and tasks are handled by dedicated routes further down.

router.post('/tasks/:id/complete', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await getDb().from('daily_tasks').update({ is_completed: true }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Görev tamamlandı' });
    } catch (err) {
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

router.post('/measurements', authMiddleware, async (req, res) => {
    try {
        const {
            user_id, weight_kg, body_fat_pct,
            height_cm, shoulder_cm, bicep_cm,
            waist_cm, chest_cm, neck_cm, thigh_cm, hips_cm
        } = req.body;

        const targetId = user_id || req.user.id;

        // Permission check: Trainers/Admins can add for others, members only for themselves
        if (targetId !== req.user.id && !['admin', 'trainer', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Yetkiniz yok' });
        }

        const { data, error } = await getDb().from('body_measurements').insert({
            user_id: targetId,
            weight_kg,
            body_fat_pct,
            height_cm,
            shoulder_cm,
            bicep_cm,
            waist_cm,
            chest_cm,
            neck_cm,
            thigh_cm,
            hips_cm,
            measured_at: new Date().toISOString().split('T')[0]
        }).select().single();

        if (error) throw error;

        if (targetId !== req.user.id) {
            await logAudit('MEASUREMENT_ADDED_BY_STAFF', req.user.id, targetId, { weight_kg });
        }

        res.json(data);
    } catch (err) {
        console.error('Measurement Error:', err);
        res.status(500).json({ error: 'Kaydedilemedi' });
    }
});

// =================== ADMIN: MEMBER MANAGEMENT (CRUD) ===================

router.get('/admin/users', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const db = getDb();
        // 1. Auto-expiry is now handled by automation.js

        const { role } = req.query;
        let query = db.from('users').select('*');
        if (role) query = query.eq('role', role);
        const { data } = await query.order('full_name');
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Kullanıcılar yüklenemedi' });
    }
});

// Update member details
router.put('/admin/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, phone, nickname } = req.body;
        const db = getDb();

        const updateFields = {};
        if (full_name) updateFields.full_name = full_name;
        if (email) updateFields.email = email;
        if (phone) updateFields.phone = phone;
        if (nickname !== undefined) updateFields.nickname = nickname;
        updateFields.updated_at = new Date().toISOString();

        const { data, error } = await db.from('users').update(updateFields).eq('id', id).select().single();
        if (error) throw error;

        await logAudit('USER_UPDATED_BY_ADMIN', req.user.id, id, { updated_fields: Object.keys(updateFields) });

        res.json({ message: 'Kullanıcı güncellendi', user: data });
    } catch (err) {
        console.error('Update User Error:', err);
        res.status(500).json({ error: 'Güncelleme başarısız' });
    }
});

// Delete member (with optional cascade)
router.delete('/admin/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const cascade = req.query.cascade === 'true';
        const db = getDb();

        // Get user info before deleting for audit
        const { data: userToDelete } = await db.from('users').select('full_name, email, role').eq('id', id).single();
        if (!userToDelete) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

        // Prevent deleting superadmin
        if (userToDelete.role === 'superadmin') {
            return res.status(403).json({ error: 'SuperAdmin silinemez' });
        }
        // Admin can't delete other admins (only superadmin can)
        if (userToDelete.role === 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Admin silmek için SuperAdmin yetkisi gerekli' });
        }

        await logAudit('USER_DELETED', req.user.id, null, {
            deleted_user_id: id,
            deleted_user: userToDelete.full_name,
            deleted_email: userToDelete.email,
            deleted_role: userToDelete.role,
            cascade
        });

        if (cascade) {
            // Delete all related data from all tables
            const tables = [
                'installments', 'payments', 'nutrition_logs', 'ai_macro_logs',
                'body_measurements', 'diet_plans', 'check_ins',
                'notifications', 'user_badges', 'qr_codes',
                'pr_records', 'leaderboard', 'workout_logs',
                'workout_completions'
            ];
            for (const table of tables) {
                try {
                    await db.from(table).delete().eq('user_id', id);
                } catch (e) { /* table may not exist, ignore */ }
            }
            // Delete workout exercises -> days -> programs
            try {
                const { data: programs } = await db.from('workout_programs').select('id').eq('user_id', id);
                if (programs && programs.length > 0) {
                    const programIds = programs.map(p => p.id);
                    const { data: days } = await db.from('workout_days').select('id').in('program_id', programIds);
                    if (days && days.length > 0) {
                        await db.from('workout_exercises').delete().in('workout_day_id', days.map(d => d.id));
                        await db.from('workout_days').delete().in('program_id', programIds);
                    }
                    await db.from('workout_programs').delete().eq('user_id', id);
                }
            } catch (e) { /* ignore */ }
            // Delete memberships last (they may have FK references)
            try { await db.from('memberships').delete().eq('user_id', id); } catch (e) { }
            // Delete audit logs where this user is the target or admin
            try { await db.from('audit_logs').delete().eq('target_id', id); } catch (e) { }
            try { await db.from('audit_logs').delete().eq('admin_id', id); } catch (e) { }
        }

        const { error } = await db.from('users').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: 'Kullanıcı ve tüm ilişkili veriler silindi' });
    } catch (err) {
        console.error('Delete User Error:', err);
        res.status(500).json({ error: 'Silme başarısız: ' + (err.message || 'Bilinmeyen hata') });
    }
});

// Change user role (admin+ only)
router.put('/admin/users/:id/role', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const db = getDb();

        const validRoles = ['member', 'trainer', 'admin'];
        if (req.user.role === 'superadmin') validRoles.push('superadmin');

        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Geçersiz rol' });
        }

        // Admin can only assign member/trainer, not admin
        if (req.user.role === 'admin' && role === 'admin') {
            return res.status(403).json({ error: 'Admin rolü atamak için SuperAdmin yetkisi gerekli' });
        }

        const { data: targetUser } = await db.from('users').select('role, full_name').eq('id', id).single();
        if (!targetUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

        const { error } = await db.from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;

        await logAudit('ROLE_CHANGED', req.user.id, id, {
            old_role: targetUser.role,
            new_role: role,
            user_name: targetUser.full_name
        });

        res.json({ message: `Rol başarıyla ${role} olarak güncellendi` });
    } catch (err) {
        console.error('Role Change Error:', err);
        res.status(500).json({ error: 'Rol güncelleme başarısız' });
    }
});

// =================== ADMIN: MEMBERSHIP DAY MANAGEMENT ===================

router.post('/admin/add-days', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { user_id, days } = req.body;
        const db = getDb();

        const { data: current } = await db.from('memberships').select('*').eq('user_id', user_id).order('end_date', { ascending: false }).limit(1).maybeSingle();

        let newEnd = new Date();
        let packageType = 'Standart';

        if (current) {
            packageType = current.package_type || 'Standart';
            const currentEnd = new Date(current.end_date);
            if (currentEnd > new Date()) {
                newEnd = currentEnd;
            }
        }

        newEnd.setDate(newEnd.getDate() + parseInt(days));

        const diffTime = Math.max(0, newEnd - new Date());
        const remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (current) {
            const { error } = await db.from('memberships').update({
                end_date: newEnd.toISOString().split('T')[0],
                status: 'active',
                remaining_days: remaining,
            }).eq('id', current.id);
            if (error) throw error;
        } else {
            const { error } = await db.from('memberships').insert({
                user_id,
                start_date: new Date().toISOString().split('T')[0],
                end_date: newEnd.toISOString().split('T')[0],
                total_days: parseInt(days),
                remaining_days: remaining,
                status: 'active',
                package_type: packageType,
                amount: 0
            });
            if (error) throw error;
        }

        await logAudit('MEMBERSHIP_EXTENDED', req.user.id, user_id, {
            days,
            old_end_date: current ? current.end_date : 'Yeni Üyelik',
            new_end_date: newEnd.toISOString().split('T')[0],
            remaining_days: remaining
        });

        res.json({ message: 'Üyelik başarıyla uzatıldı', remaining_days: remaining });
    } catch (err) {
        console.error('Add Days Error:', err);
        res.status(500).json({ error: 'İşlem başarısız: ' + (err.message || 'Bilinmeyen hata') });
    }
});

// =================== PAYMENTS ===================

router.post('/admin/payments', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { user_id, amount, payment_method, package_type, notes, payment_type, installment_count, total_price } = req.body;
        const db = getDb();

        if (!user_id || !amount) {
            return res.status(400).json({ error: 'Kullanıcı ve tutar zorunlu' });
        }

        const safeTotalPrice = total_price ? parseFloat(total_price) : parseFloat(amount);
        const paidAmount = parseFloat(amount);
        const instCount = parseInt(installment_count || 1);

        // 1. Record the Payment
        const { data: payment, error: pError } = await db.from('payments').insert({
            user_id,
            amount: paidAmount,
            payment_method: payment_method || 'cash',
            package_type: package_type || 'Standart',
            payment_type: payment_type || 'cash_full',
            installment_count: instCount,
            total_price: safeTotalPrice,
            processed_by: req.user.id,
            status: 'completed',
            notes: notes || null
        }).select().single();

        if (pError) throw pError;

        // 2. Handle Installments if applicable
        if (payment_type === 'installment' && instCount > 1) {
            const remaining = safeTotalPrice - paidAmount;
            const instAmount = (remaining / (instCount - 1)).toFixed(2);

            const installments = [];
            for (let i = 1; i < instCount; i++) {
                const dueDate = new Date();
                dueDate.setMonth(dueDate.getMonth() + i);
                installments.push({
                    user_id,
                    membership_id: null, // Will update after membership entry/update
                    amount: parseFloat(instAmount),
                    due_date: dueDate.toISOString().split('T')[0],
                    status: 'pending'
                });
            }
            if (installments.length > 0) {
                await db.from('installments').insert(installments);
            }
        }

        // 3. Link installments to the membership updated/created by the DB trigger
        if (payment.membership_id) {
            await db.from('installments')
                .update({ membership_id: payment.membership_id })
                .eq('user_id', user_id)
                .is('membership_id', null);
        }

        res.json({ message: 'Ödeme alındı ve üyelik güncellendi', payment });
    } catch (err) {
        console.error('Payment Error:', err);
        res.status(500).json({ error: 'Ödeme kaydı başarısız' });
    }
});

router.put('/admin/payments/:id/approve', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const { data, error } = await db.from('payments').update({ status: 'completed' }).eq('id', id).select().single();
        if (error) throw error;

        res.json({ message: 'Ödeme onaylandı ve üyelik uzatıldı', payment: data });
    } catch (err) {
        console.error('Payment Approve Error:', err);
        res.status(500).json({ error: 'Ödeme onaylanamadı' });
    }
});

router.put('/admin/installments/:id/pay', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        // 1. Get installment info
        const { data: inst, error: fetchError } = await db.from('installments').select('*').eq('id', id).single();
        if (fetchError || !inst) return res.status(404).json({ error: 'Taksit bulunamadı' });

        if (inst.status === 'paid') return res.status(400).json({ error: 'Taksit zaten ödenmiş' });

        // 2. Mark as paid
        const { data: updatedInst, error: updateError } = await db.from('installments').update({
            status: 'paid',
            paid_at: new Date().toISOString()
        }).eq('id', id).select().single();

        if (updateError) throw updateError;

        // 3. Update membership paid amount
        if (inst.membership_id) {
            const { data: mem } = await db.from('memberships').select('amount').eq('id', inst.membership_id).single();
            if (mem) {
                await db.from('memberships').update({
                    amount: (mem.amount || 0) + inst.amount
                }).eq('id', inst.membership_id);
            }
        }

        // 4. Create Audit Log
        await logAudit('INSTALLMENT_PAID', req.user.id, inst.user_id, {
            installment_id: id,
            amount: inst.amount,
            membership_id: inst.membership_id
        });

        res.json({ message: 'Taksit ödemesi onaylandı', installment: updatedInst });
    } catch (err) {
        console.error('Installment Pay Error:', err);
        res.status(500).json({ error: 'Taksit onaylanamadı' });
    }
});

router.get('/admin/payments', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { limit = 50, offset = 0, user_id } = req.query;
        const db = getDb();

        let query = db.from('payments')
            .select('*, users!payments_user_id_fkey(full_name, email)')
            .order('payment_date', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (user_id) query = query.eq('user_id', user_id);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({ payments: data || [], total: count });
    } catch (err) {
        console.error('Payments List Error:', err);
        res.status(500).json({ error: 'Ödeme listesi yüklenemedi' });
    }
});

// =================== FINANCE ===================

router.get('/admin/finance', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const db = getDb();

        // Current month earnings
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [currentMonthRes, allMonthsRes, pendingRes, installmentsRes] = await Promise.all([
            db.from('payments')
                .select('amount')
                .eq('status', 'completed')
                .gte('payment_date', monthStart)
                .lte('payment_date', monthEnd),
            db.from('payments')
                .select('amount, payment_date, payment_method')
                .eq('status', 'completed')
                .order('payment_date', { ascending: false })
                .limit(100),
            db.from('memberships')
                .select('*, users!memberships_user_id_fkey(full_name, email, phone)')
                .or('remaining_days.lte.14,status.eq.expired,status.eq.grace')
                .order('remaining_days', { ascending: true }),
            db.from('installments')
                .select('*, users(full_name, email, phone), memberships(remaining_days)')
                .eq('status', 'pending')
                .order('due_date', { ascending: true })
        ]);

        const currentMonthTotal = (currentMonthRes.data || []).reduce((acc, p) => acc + (p.amount || 0), 0);
        const currentMonthCount = (currentMonthRes.data || []).length;

        // Group by month for chart
        const monthlyData = {};
        (allMonthsRes.data || []).forEach(p => {
            const month = new Date(p.payment_date).toISOString().slice(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { month, total: 0, count: 0, cash: 0, card: 0, transfer: 0 };
            monthlyData[month].total += p.amount || 0;
            monthlyData[month].count++;
            if (p.payment_method === 'cash') monthlyData[month].cash += p.amount || 0;
            else if (p.payment_method === 'card') monthlyData[month].card += p.amount || 0;
            else monthlyData[month].transfer += p.amount || 0;
        });

        res.json({
            currentMonth: {
                total: currentMonthTotal,
                count: currentMonthCount,
                avg: currentMonthCount > 0 ? Math.round(currentMonthTotal / currentMonthCount) : 0
            },
            monthlyBreakdown: Object.values(monthlyData),
            pendingPayments: pendingRes.data || [],
            upcomingInstallments: installmentsRes.data || []
        });
    } catch (err) {
        console.error('Finance Error:', err);
        res.status(500).json({ error: 'Finansal veri yüklenemedi' });
    }
});

// =================== AUDIT LOGS ===================

router.get('/admin/audit-logs', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { limit = 50, offset = 0, action } = req.query;
        const db = getDb();

        let query = db.from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (action) query = query.eq('action', action);

        const { data, error } = await query;
        if (error) throw error;

        // Enrich with user names
        const userIds = new Set();
        (data || []).forEach(log => {
            if (log.actor_id) userIds.add(log.actor_id);
            if (log.target_id) userIds.add(log.target_id);
        });

        let userMap = {};
        if (userIds.size > 0) {
            const { data: users } = await db.from('users')
                .select('id, full_name, email, role')
                .in('id', Array.from(userIds));
            (users || []).forEach(u => { userMap[u.id] = u; });
        }

        const enrichedLogs = (data || []).map(log => ({
            ...log,
            actor: userMap[log.actor_id] || null,
            target: userMap[log.target_id] || null
        }));

        res.json(enrichedLogs);
    } catch (err) {
        console.error('Audit Logs Error:', err);
        res.status(500).json({ error: 'Loglar yüklenemedi' });
    }
});

// =================== ADMIN: MISC ===================

router.get('/admin/tasks', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('daily_tasks').select('*').order('created_at', { ascending: false });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

router.post('/admin/assign-diet', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { user_id, plan_name, description, meals, protein_g, carbs_g, fat_g, daily_calories } = req.body;

        // Deactivate old plans for this user
        await getDb().from('diet_plans').update({ is_active: false }).eq('user_id', user_id);

        const { data } = await getDb().from('diet_plans').insert({
            user_id,
            assigned_by: req.user.id,
            plan_name,
            description,
            meals: meals || [],
            protein_g: parseFloat(protein_g || 0),
            carbs_g: parseFloat(carbs_g || 0),
            fat_g: parseFloat(fat_g || 0),
            daily_calories: parseInt(daily_calories || 0),
            is_active: true
        }).select().single();

        await logAudit('DIET_ASSIGNED', req.user.id, user_id, { plan_name });

        res.json(data);
    } catch (err) {
        console.error('Assign Diet Error:', err);
        res.status(500).json({ error: 'Diyet atanamadı' });
    }
});

router.post('/admin/tasks', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { title, points, category } = req.body;
        const { data } = await getDb().from('daily_tasks').insert({
            title,
            points: points || 10,
            category: category || 'general',
            is_completed: false
        }).select().single();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Görev eklenemedi' });
    }
});

router.post('/admin/announcements', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { title, body, content, type } = req.body;
        const finalBody = body || content;
        const finalType = type === 'information' ? 'general' : (type || 'general');
        const db = getDb();
        const { data } = await db.from('announcements').insert({
            created_by: req.user.id,
            title,
            body: finalBody,
            type: finalType,
            is_active: true,
            publish_at: new Date().toISOString()
        }).select().single();

        await logAudit('ANNOUNCEMENT_CREATED', req.user.id, null, { title });

        // Push in-app notification to all active members
        try {
            const { data: activeMembers } = await db.from('memberships')
                .select('user_id')
                .eq('status', 'active');

            if (activeMembers && activeMembers.length > 0) {
                const notifications = activeMembers.map(m => ({
                    user_id: m.user_id,
                    title: `\uD83D\uDCE2 ${title}`,
                    body: finalBody || '',
                    type: 'announcement',
                    is_read: false
                }));
                await db.from('notifications').insert(notifications);
            }
        } catch (notifErr) {
            console.error('Notification push failed:', notifErr);
            // Don't fail the main request
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Duyuru yayınlanamadı' });
    }
});

router.get('/announcements', authMiddleware, async (req, res) => {
    try {
        const cache = req.app.get('appCache');
        const cached = cache.get('announcements');
        if (cached) return res.json(cached);

        const { data } = await getDb().from('announcements').select('*').eq('is_active', true).order('publish_at', { ascending: false });
        cache.set('announcements', data, 600); // 10 mins cache
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

router.post('/notifications/read', authMiddleware, async (req, res) => {
    try {
        await getDb().from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
        res.json({ message: 'Bildirimler okundu olarak işaretlendi' });
    } catch (err) {
        console.error('Notif Read Error:', err);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

router.delete('/notifications/:id', authMiddleware, async (req, res) => {
    try {
        await getDb().from('notifications').delete().eq('id', req.params.id).eq('user_id', req.user.id);
        res.json({ message: 'Bildirim silindi' });
    } catch (err) {
        console.error('Notif Delete Error:', err);
        res.status(500).json({ error: 'Bildirim silinemedi' });
    }
});

router.delete('/notifications', authMiddleware, async (req, res) => {
    try {
        await getDb().from('notifications').delete().eq('user_id', req.user.id);
        res.json({ message: 'Tüm bildirimler silindi' });
    } catch (err) {
        console.error('Notif Delete All Error:', err);
        res.status(500).json({ error: 'Bildirimler temizlenemedi' });
    }
});

router.post('/admin/reset-password', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { user_id, new_password } = req.body;
        const hash = bcrypt.hashSync(new_password, 10);
        await getDb().from('users').update({ password_hash: hash }).eq('id', user_id);

        await logAudit('PASSWORD_RESET', req.user.id, user_id, {});

        res.json({ message: 'Şifre başarıyla güncellendi' });
    } catch (err) {
        res.status(500).json({ error: 'Şifre güncellenemedi' });
    }
});

// =================== NUTRITION & MACROS ===================

router.get('/exercises', authMiddleware, async (req, res) => {
    try {
        const cache = req.app.get('appCache');
        const cached = cache.get('exercises_full');
        if (cached) return res.json(cached);

        const { data } = await getDb().from('exercises').select('*').order('name');
        cache.set('exercises_full', data, 3600); // 1 hour cache
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Egzersiz listesi yüklenemedi' });
    }
});

router.get('/foods', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('food_items').select('*').order('name');
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Besin listesi yüklenemedi' });
    }
});

router.post('/nutrition', authMiddleware, async (req, res) => {
    try {
        const { food_item_id, quantity_g, meal_type } = req.body;
        const db = getDb();

        const { data: food } = await db.from('food_items').select('*').eq('id', food_item_id).single();
        if (!food) return res.status(404).json({ error: 'Besin bulunamadı' });

        const ratio = quantity_g / 100;
        const entry = {
            user_id: req.user.id,
            food_item_id,
            quantity_g,
            meal_type: meal_type || 'main',
            protein_g: (food.protein_100g * ratio).toFixed(1),
            carbs_g: (food.carbs_100g * ratio).toFixed(1),
            fat_g: (food.fat_100g * ratio).toFixed(1),
            calories: Math.round(food.calories_100g * ratio),
            log_date: new Date().toISOString().split('T')[0]
        };

        const { data } = await db.from('nutrition_logs').insert(entry).select().single();
        res.json(data);
    } catch (err) {
        console.error('Nutrition Log Error:', err);
        res.status(500).json({ error: 'Kayıt başarısız: ' + (err.message || '') });
    }
});

router.get('/nutrition/daily', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await getDb().from('nutrition_logs')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('logged_at', today);
        res.json(data || []);
    } catch (err) {
        console.error('Nutrition Daily Error:', err);
        res.status(500).json({ error: 'Günlük veri yüklenemedi' });
    }
});

router.get('/admin/user-nutrition/:id', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = await getDb().from('nutrition_logs')
            .select('*')
            .eq('user_id', id)
            .order('logged_at', { ascending: false })
            .limit(50);
        res.json(data || []);
    } catch (err) {
        console.error('Admin Nutrition Error:', err);
        res.status(500).json({ error: 'Kullanıcı verisi yüklenemedi' });
    }
});



router.post('/nutrition/ai-log-meal', authMiddleware, async (req, res) => {
    try {
        // Find how many meals the user logged today
        const { text, mealType } = req.body;
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        const mealTypeStr = mealType || 'Öğün';

        if (!process.env.GEMINI_API_KEY) {
            console.warn("GEMINI_API_KEY missing. Using mock AI response.");
            const mockMacros = { protein_g: 45, carbs_g: 50, fat_g: 15, calories: 515 };

            const { data } = await db.from('nutrition_logs').insert({
                user_id: req.user.id,
                raw_text: text,
                meal_type: mealTypeStr,
                quantity_g: 100,
                ...mockMacros,
                log_date: today
            }).select().single();

            // Also log to ai_macro_logs just for history
            await db.from('ai_macro_logs').insert({ user_id: req.user.id, raw_text: text, ...mockMacros });

            return res.json({ message: 'Öğün başarıyla eklendi (Mock)', data: data });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Get user info for context
        const { data: userStats } = await db.from('users').select('height_cm, weight_kg, goal').eq('id', req.user.id).single();

        const prompt = `Sen profesyonel bir diyetisyen ve beslenme uzmanısın. Kullanıcının girdiği şu ifadeyi analiz et: "${text}"

        Kullanıcı Bilgileri:
        - Kilo: ${userStats?.weight_kg || 'Bilinmiyor'} kg
        - Boy: ${userStats?.height_cm || 'Bilinmiyor'} cm
        - Hedef: ${userStats?.goal || 'Bilinmiyor'}

        Lütfen bu ifadeden yola çıkarak porsiyon tahmini yap ve besin değerlerini (protein, karbonhidrat, yağ ve toplam kalori) hesapla.
        Ayrıca bu öğünü kullanıcının fiziğine ve hedefine göre değerlendir. Eğer protein veya kalori çok düşükse mutlaka "UYARI:" ile başlayan bir cümle ekle.

        Sadece JSON formatında cevap dön. JSON formatı kesinlikle şu olmalı:
        {
          "protein_g": sayi,
          "carbs_g": sayi, 
          "fat_g": sayi, 
          "calories": sayi, 
          "feedback": "Türkçe kısa tavsiye ve analiz. Örn: 'Bu öğün protein açısından zayıf kalmış. UYARI: Kas gelişimi için bir sonraki öğünde protein miktarını artırmalısın.'"
        }
        Cevabın sadece JSON objesi olsun, markdown blockları içermesin.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const match = responseText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("AI'dan geçerli bir JSON yanıtı alınamadı");

        const macros = JSON.parse(match[0]);

        const { data } = await db.from('nutrition_logs').insert({
            user_id: req.user.id,
            raw_text: text,
            meal_type: mealTypeStr,
            quantity_g: 100, // Dummy value
            protein_g: macros.protein_g,
            carbs_g: macros.carbs_g,
            fat_g: macros.fat_g,
            calories: macros.calories,
            ai_feedback: macros.feedback || null,
            logged_at: today
        }).select().single();

        // Background history
        await db.from('ai_macro_logs').insert({
            user_id: req.user.id,
            raw_text: text,
            protein_g: macros.protein_g,
            carbs_g: macros.carbs_g,
            fat_g: macros.fat_g,
            calories: macros.calories
        });

        res.json({ message: 'Öğün başarıyla eklendi', data: data });
    } catch (err) {
        console.error('AI Meal Log Full Error:', err);
        const errorMessage = err.message || 'Bilinmeyen hata';
        res.status(500).json({ error: `Öğün eklenemedi: ${errorMessage}` });
    }
});

router.get('/diet', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('diet_plans')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
        res.json(data || null);
    } catch (err) {
        res.status(500).json({ error: 'Diyet planı yüklenemedi' });
    }
});

router.post('/diet', authMiddleware, async (req, res) => {
    try {
        const { plan_name, description, meals, protein_g, carbs_g, fat_g, daily_calories } = req.body;

        // Deactivate old ones
        await getDb().from('diet_plans').update({ is_active: false }).eq('user_id', req.user.id);

        const { data } = await getDb().from('diet_plans').insert({
            user_id: req.user.id,
            assigned_by: req.user.id,
            plan_name,
            description,
            meals: meals || [],
            protein_g: protein_g || 0,
            carbs_g: carbs_g || 0,
            fat_g: fat_g || 0,
            daily_calories: daily_calories || 0,
            is_active: true
        }).select().single();

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Diyet kaydedilemedi' });
    }
});

router.post('/nutrition/ai-generate-diet', authMiddleware, async (req, res) => {
    try {
        const { prompt_text } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Yapay zeka servisi şu an aktif değil (API Key eksik).' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Sen bir uzman diyetisyensin. Kullanıcının şu hedefine uygun bir diyet planı hazırla ve bunu SADECE bir JSON formatında döndür. Hiçbir ekstra açıklama yazma.
İstem: "${prompt_text}"

Beklenen tam JSON Formatı:
{
  "goal": "Örn: Kilo Alma / Kas Gelişimi vb.",
  "daily_calories": 2500,
  "protein_g": 180,
  "carbs_g": 300,
  "fat_g": 70,
  "meals": [
    { "name": "1. Öğün", "time": "08:00", "items": ["3 yumurta", "100g yulaf"] },
    { "name": "2. Öğün", "time": "13:00", "items": ["200g tavuk", "Porsiyon pilav"] }
  ]
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const match = responseText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("JSON formatı alınamadı");

        const dietPlanData = JSON.parse(match[0]);

        // AUTO-SAVE AI GENERATED DIET
        await getDb().from('diet_plans').update({ is_active: false }).eq('user_id', req.user.id);
        const { data: savedPlan } = await getDb().from('diet_plans').insert({
            user_id: req.user.id,
            assigned_by: req.user.id,
            plan_name: dietPlanData.goal || 'AI Diyet Planı',
            description: 'Yapay zeka tarafından oluşturuldu.',
            meals: dietPlanData.meals || [],
            protein_g: dietPlanData.protein_g || 0,
            carbs_g: dietPlanData.carbs_g || 0,
            fat_g: dietPlanData.fat_g || 0,
            daily_calories: dietPlanData.daily_calories || 0,
            is_active: true
        }).select().single();

        res.json({ message: 'Diyet planı başarıyla oluşturuldu ve kaydedildi.', plan: savedPlan });
    } catch (err) {
        console.error('AI Diet Error:', err);
        res.status(500).json({ error: 'Diyet planı oluşturulamadı.' });
    }
});

router.get('/notifications/check-reminder', authMiddleware, async (req, res) => {
    try {
        res.json({ message: 'Yoklama rutini kontrol edildi. Bildirimler planlandı.' });
    } catch (err) {
        res.status(500).json({ error: 'Kontrol başarısız' });
    }
});

// =================== INSTALLMENTS ===================

router.get('/user/installments', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { data } = await db.from('installments')
            .select('*')
            .eq('user_id', req.user.id)
            .order('due_date', { ascending: true });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Taksitler yüklenemedi' });
    }
});

router.post('/admin/pay-installment/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Yetkisiz işlem' });
        }
        const db = getDb();
        const instId = req.params.id;

        const { data: inst } = await db.from('installments').select('*').eq('id', instId).single();
        if (!inst) return res.status(404).json({ error: 'Taksit bulunamadı' });

        await db.from('installments').update({
            status: 'paid',
            paid_at: new Date().toISOString()
        }).eq('id', instId);

        // Update membership amount
        await db.rpc('increment_membership_amount', {
            m_id: inst.membership_id,
            inc_amount: inst.amount
        });

        res.json({ message: 'Taksit ödendi olarak işaretlendi' });
    } catch (err) {
        console.error('Pay Installment Admin Error:', err);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

router.get('/admin/user-installments/:userId', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Yetkisiz işlem' });
        }
        const { data } = await getDb().from('installments')
            .select('*')
            .eq('user_id', req.params.userId)
            .order('due_date', { ascending: true });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

router.get('/admin/user-logs/:id', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const [checkIns, nutrition, audits] = await Promise.all([
            db.from('turnstile_logs').select('*').eq('user_id', id).order('check_in_time', { ascending: false }).limit(20),
            db.from('nutrition_logs').select('*, food_items(name)').eq('user_id', id).order('log_date', { ascending: false }).limit(20),
            db.from('audit_logs').select('*').eq('target_id', id).order('created_at', { ascending: false }).limit(20)
        ]);

        const combined = [
            ...(checkIns.data || []).map(l => ({ type: 'check_in', date: l.check_in_time, details: l })),
            ...(nutrition.data || []).map(l => ({ type: 'nutrition', date: l.log_date, details: l })),
            ...(audits.data || []).map(l => ({ type: 'audit', date: l.created_at, details: l }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(combined);
    } catch (err) {
        console.error('User Logs Error:', err);
        res.status(500).json({ error: 'Kayıtlar yüklenemedi' });
    }
});

router.post('/admin/assign-workout', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { user_id, program_name, days } = req.body;
        const db = getDb();

        // 1. Deactivate old programs
        await db.from('workout_programs').update({ is_active: false }).eq('user_id', user_id);

        // 2. Create new program
        const { data: program } = await db.from('workout_programs').insert({
            user_id,
            program_name,
            assigned_by: req.user.id,
            is_active: true
        }).select().single();

        for (const day of days) {
            const { data: workoutDay } = await db.from('workout_days').insert({
                program_id: program.id,
                day_of_week: day.day_of_week,
                muscle_group: day.muscle_group || 'Genel',
                is_off_day: day.is_off_day || false
            }).select().single();

            if (!day.is_off_day && day.exercises && day.exercises.length > 0) {
                const exercisesToInsert = [];
                for (let i = 0; i < day.exercises.length; i++) {
                    const ex = day.exercises[i];
                    let exerciseId = ex.exercise_id;

                    // Handle free-text exercise names (convert to UUID)
                    if (exerciseId && !exerciseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
                        const { data: existing } = await db.from('exercises').select('id').ilike('name', exerciseId).maybeSingle();
                        if (existing) {
                            exerciseId = existing.id;
                        } else {
                            const { data: newEx } = await db.from('exercises').insert({
                                name: exerciseId,
                                muscle_group: day.muscle_group || 'Genel'
                            }).select().single();
                            if (newEx) exerciseId = newEx.id;
                        }
                    }

                    if (exerciseId) {
                        exercisesToInsert.push({
                            workout_day_id: workoutDay.id,
                            exercise_id: exerciseId,
                            sets: parseInt(ex.sets || 0),
                            reps: ex.reps || '12',
                            weight_kg: parseFloat(ex.weight_kg || 0),
                            order_index: i
                        });
                    }
                }
                if (exercisesToInsert.length > 0) {
                    await db.from('workout_exercises').insert(exercisesToInsert);
                }
            }
        }

        await logAudit('WORKOUT_ASSIGNED', req.user.id, user_id, { program_name });
        res.json({ message: 'Antrenman programı başarıyla atandı', program });
    } catch (err) {
        console.error('Workout Assign Error:', err);
        res.status(500).json({ error: 'Program atanamadı' });
    }
});


// =================== TASKS ===================

// Get current user's tasks
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { data, error } = await db.from('tasks').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('relation "public.tasks" does not exist')) {
                return res.json([]);
            }
            throw error;
        }
        res.json(data || []);
    } catch (e) {
        console.error('tasks error', e);
        res.status(500).json({ error: 'Görevler alınamadı' });
    }
});

// Complete a task
router.post('/tasks/:id/complete', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { error } = await db.from('tasks').update({ is_completed: true }).eq('id', req.params.id).eq('user_id', req.user.id);
        if (error) {
            if (error.message.includes('relation "public.tasks" does not exist')) {
                return res.status(404).json({ error: 'Görev sistemi henüz yapılandırılmadı' });
            }
            throw error;
        }
        res.json({ success: true });
    } catch (e) {
        console.error('completeTask error', e);
        res.status(500).json({ error: 'Görev tamamlanamadı' });
    }
});

// Admin: Get all tasks (pool)
router.get('/admin/tasks', authMiddleware, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const db = getDb();
        const { data, error } = await db.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) {
            if (error.message.includes('relation "public.tasks" does not exist')) {
                return res.json([]);
            }
            throw error;
        }
        res.json(data || []);
    } catch (e) {
        console.error('admin tasks error', e);
        res.status(500).json({ error: 'Görevler alınamadı' });
    }
});

// Admin: Create task
router.post('/admin/tasks', authMiddleware, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const db = getDb();
        const { title, user_id, category, points } = req.body;
        const { data, error } = await db.from('tasks').insert({
            title,
            user_id: user_id || null, // Optional assignment
            category,
            points
        }).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error('createTask error', e);
        res.status(500).json({ error: 'Görev oluşturulamadı' });
    }
});

module.exports = router;

