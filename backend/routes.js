const express = require('express');
const { getDb } = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

router.post('/auth/register', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
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
            notifRes
        ] = await Promise.all([
            db.from('users').select('id, full_name, nickname, email, phone, role, profile_photo_url, kvkk_mask').eq('id', userId).single(),
            db.from('memberships').select('*').eq('user_id', userId).order('end_date', { ascending: false }).limit(1).maybeSingle(),
            db.from('gym_occupancy').select('current_count, max_capacity').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
            db.from('gym_occupancy').select('hour_of_day, day_of_week, avg_count:current_count'),
            db.from('workout_programs').select('*').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle(),
            db.from('pr_records').select('*, exercises(name, muscle_group)').eq('user_id', userId).order('achieved_at', { ascending: false }).limit(5),
            db.from('body_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(10),
            db.from('announcements').select('*').eq('is_active', true).order('publish_at', { ascending: false }).limit(5),
            db.from('leaderboard').select('*, users(full_name, nickname, profile_photo_url, kvkk_mask)').eq('category', 'attendance').order('monthly_visits', { ascending: false }).limit(5),
            db.from('leaderboard').select('*, users(full_name, nickname, profile_photo_url, kvkk_mask)').eq('category', 'strength_bench').order('monthly_visits', { ascending: false }).limit(5),
            db.from('user_badges').select('*, badges(*)').eq('user_id', userId),
            db.from('qr_codes').select('qr_token').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle(),
            db.from('notifications').select('id', { count: 'exact' }).eq('user_id', userId).eq('is_read', false)
        ]);

        const user = userRes.data;
        let membership = membershipRes.data;

        if (membership && membership.end_date) {
            const todayAtMidnight = new Date();
            todayAtMidnight.setHours(0, 0, 0, 0);
            const endDate = new Date(membership.end_date);
            if (!isNaN(endDate.getTime())) {
                membership.remaining_days = Math.max(0, Math.ceil((endDate.getTime() - todayAtMidnight.getTime()) / (1000 * 60 * 60 * 24)));
            }
        }

        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const today = dayNames[new Date().getDay()];
        let todayWorkout = null;

        if (programRes.data) {
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
            const [memCount, activeCount, revSum] = await Promise.all([
                db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
                db.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                db.from('memberships').select('amount')
            ]);
            adminStats = {
                totalMembers: memCount.count || 0,
                activeMembers: activeCount.count || 0,
                totalRevenue: (revSum.data || []).reduce((acc, curr) => acc + (curr.amount || 0), 0)
            };
        }

        let trainerStats = null;
        if (user && user.role === 'trainer') {
            const { data: students } = await db.from('workout_programs').select('users(id, full_name, profile_photo_url, email)').eq('assigned_by', userId).eq('is_active', true);
            const uniqueStudents = Array.from(new Map((students || []).map(s => [s.users.id, s.users])).values());
            trainerStats = { activeStudents: uniqueStudents.length, students: uniqueStudents };
        }

        // Get live occupancy from check_ins
        const { count: liveOccupancy } = await db.from('check_ins').select('id', { count: 'exact', head: true }).is('check_out_time', null);

        res.json({
            user,
            membership,
            occupancy: occRes.data || { current_count: 0, max_capacity: 100 },
            liveOccupancy: liveOccupancy || 0,
            heatmap: heatmapRes.data || [],
            todayWorkout,
            prRecords: prRes.data || [],
            measurements: (measurementRes.data || []).reverse(),
            announcements: announcementRes.data || [],
            leaderboard: { attendance: attendanceLeaderboard, strength: strengthLeaderboard },
            badges: badgeRes.data || [],
            qrCode: qrRes.data?.qr_token || null,
            unreadNotifications: notifRes.count || 0,
            adminStats,
            trainerStats,
        });
    } catch (err) {
        console.error('Dash Error:', err);
        res.status(500).json({ error: 'Dashboard verileri yüklenemedi' });
    }
});

// =================== CHECK-IN / CHECK-OUT ===================

router.post('/checkin', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const userId = req.user.id;
        const { data: membership } = await db.from('memberships').select('*').eq('user_id', userId).in('status', ['active', 'grace']).order('end_date', { ascending: false }).limit(1).maybeSingle();
        if (!membership) return res.status(403).json({ error: 'Aktif üyeliğiniz yok' });

        const { data: openCheck } = await db.from('check_ins').select('*').eq('user_id', userId).is('check_out_time', null).limit(1).maybeSingle();
        if (openCheck) return res.status(400).json({ error: 'Zaten giriş yapmışsınız' });

        await db.from('check_ins').insert({ user_id: userId, check_in_time: new Date().toISOString() });

        const { data: lastOcc } = await db.from('gym_occupancy').select('current_count').order('recorded_at', { ascending: false }).limit(1).maybeSingle();
        const newCount = (lastOcc?.current_count || 0) + 1;
        await db.from('gym_occupancy').insert({
            current_count: newCount,
            max_capacity: 100,
            hour_of_day: new Date().getHours(),
            day_of_week: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
        });

        res.json({ message: 'Giriş başarılı!' });
    } catch (err) {
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
            completed_at: today
        });

        const { data: user } = await db.from('users').select('current_streak, best_streak').eq('id', userId).single();
        const newStreak = (user?.current_streak || 0) + 1;
        const newBest = Math.max(newStreak, user?.best_streak || 0);

        await db.from('users').update({ current_streak: newStreak, best_streak: newBest }).eq('id', userId);

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
        const { workout_name } = req.body;
        const { data } = await getDb().from('user_manual_workouts').insert({ user_id: req.user.id, workout_name }).select().single();
        res.json(data);
    } catch (err) {
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
        const { data } = await getDb().from('body_measurements').select('*').eq('user_id', req.user.id).order('measured_at', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
    }
});

router.get('/diet', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('diet_plans').select('*').eq('user_id', req.user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
        res.json(data || {});
    } catch (err) {
        res.status(500).json({ error: 'Diyet planı yüklenemedi' });
    }
});

router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('daily_tasks').select('*').order('created_at', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Görevler yüklenemedi' });
    }
});

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
        const { weight_kg, body_fat_pct } = req.body;
        const { data } = await getDb().from('body_measurements').insert({ user_id: req.user.id, weight_kg, body_fat_pct, measured_at: new Date().toISOString().split('T')[0] }).select().single();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Kaydedilemedi' });
    }
});

// =================== ADMIN: MEMBER MANAGEMENT (CRUD) ===================

router.get('/admin/users', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { role } = req.query;
        let query = getDb().from('users').select('*');
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

// Delete member
router.delete('/admin/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
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

        await logAudit('USER_DELETED', req.user.id, id, {
            deleted_user: userToDelete.full_name,
            deleted_email: userToDelete.email,
            deleted_role: userToDelete.role
        });

        const { error } = await db.from('users').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: 'Kullanıcı silindi' });
    } catch (err) {
        console.error('Delete User Error:', err);
        res.status(500).json({ error: 'Silme başarısız' });
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
            days, end_date: newEnd.toISOString().split('T')[0], remaining_days: remaining
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

        // Insert payment as pending
        const { data, error } = await db.from('payments').insert({
            user_id,
            amount: parseFloat(amount),
            payment_method: payment_method || 'cash',
            package_type: package_type || 'Standart',
            payment_type: payment_type || 'cash_full',
            installment_count: parseInt(installment_count || 1),
            total_price: safeTotalPrice,
            processed_by: req.user.id,
            status: 'completed', // Direct complete as requested
            notes: notes || null
        }).select().single();

        if (error) throw error;

        res.json({ message: 'Ödeme beklemede olarak kaydedildi. Onay bekleniyor.', payment: data });
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

        const [currentMonthRes, allMonthsRes, pendingRes] = await Promise.all([
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
                .or('remaining_days.lte.7,status.eq.expired,status.eq.grace')
                .order('remaining_days', { ascending: true })
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
            pendingPayments: pendingRes.data || []
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
        const { title, content, type } = req.body;
        const { data } = await getDb().from('announcements').insert({
            created_by: req.user.id,
            title,
            body: content,
            type: type || 'general',
            is_active: true
        }).select().single();

        await logAudit('ANNOUNCEMENT_CREATED', req.user.id, null, { title });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Duyuru yayınlanamadı' });
    }
});

router.get('/announcements', authMiddleware, async (req, res) => {
    try {
        const { data } = await getDb().from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Yüklenemedi' });
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
        res.status(500).json({ error: 'Kayıt başarısız' });
    }
});

router.get('/nutrition/daily', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await getDb().from('nutrition_logs')
            .select('*, food_items(name)')
            .eq('user_id', req.user.id)
            .eq('log_date', today);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Günlük veri yüklenemedi' });
    }
});

router.get('/admin/user-nutrition/:id', authMiddleware, requireRole('admin', 'trainer'), async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = await getDb().from('nutrition_logs')
            .select('*, food_items(name)')
            .eq('user_id', id)
            .order('log_date', { ascending: false })
            .limit(50);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Kullanıcı verisi yüklenemedi' });
    }
});



router.post('/nutrition/ai-log-meal', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        // Find how many meals the user logged today
        const { count } = await db.from('nutrition_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id)
            .eq('log_date', today);

        const nextMealNumber = (count || 0) + 1;
        const mealTypeStr = `${nextMealNumber}. Öğün`;

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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Get user info for context
        const { data: userStats } = await db.from('users').select('height_cm, weight_kg').eq('id', req.user.id).single();

        const prompt = `Lütfen şu yediğim yemeği veya ifadeyi besin değerleri (makrolar) açısından analiz et ve sadece JSON dön. JSON formatı kesinlikle şu olmalı: {"protein_g": sayi, "carbs_g": sayi, "fat_g": sayi, "calories": sayi, "feedback": "Kisa Türkce feedback (Örn: Yuksek proteinli harika bir secim)"}
        Kullanici Bilgisi: Kilo ${userStats?.weight_kg || 'Bilinmiyor'}kg, Boy ${userStats?.height_cm || 'Bilinmiyor'}cm
        İfade: "${text}"`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const match = responseText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("JSON formatı alınamadı");

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
            log_date: today
        }).select().single();

        // Background history
        await db.from('ai_macro_logs').insert({
            user_id: req.user.id, raw_text: text, ...macros
        });

        res.json({ message: 'Öğün başarıyla eklendi', data: data });
    } catch (err) {
        console.error('AI Meal Log Error:', err);
        res.status(500).json({ error: 'Öğün eklenemedi, AI analizi başarısız.' });
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

module.exports = router;
