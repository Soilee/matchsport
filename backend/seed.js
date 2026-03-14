const { getDb } = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) {
    console.log('ℹ️  Database already seeded, skipping...');
    return;
  }

  const hash = bcrypt.hashSync('123456', 10);

  // --- USERS ---
  const users = [
    { id: uuidv4(), full_name: 'Ahmet Yılmaz', nickname: 'HeavyLifter95', email: 'ahmet@matchsport.com', phone: '05551234567', role: 'member', birth_date: '1995-06-15', kvkk_mask: 1 },
    { id: uuidv4(), full_name: 'Elif Demir', nickname: 'IronQueen', email: 'elif@matchsport.com', phone: '05559876543', role: 'member', birth_date: '1998-03-22', kvkk_mask: 1 },
    { id: uuidv4(), full_name: 'Mehmet Kaya', nickname: 'PowerMehmet', email: 'mehmet@matchsport.com', phone: '05553456789', role: 'member', birth_date: '1992-11-08', kvkk_mask: 1 },
    { id: uuidv4(), full_name: 'Zeynep Aksoy', nickname: 'StrongZee', email: 'zeynep@matchsport.com', phone: '05557654321', role: 'member', birth_date: '2000-01-30', kvkk_mask: 1 },
    { id: uuidv4(), full_name: 'Can Öztürk', nickname: 'CanTheCyborg', email: 'can@matchsport.com', phone: '05552345678', role: 'member', birth_date: '1997-09-12', kvkk_mask: 1 },
    { id: uuidv4(), full_name: 'Hakan Koç', nickname: 'CoachHakan', email: 'hakan@matchsport.com', phone: '05558765432', role: 'trainer', birth_date: '1988-04-05', kvkk_mask: 0 },
    { id: uuidv4(), full_name: 'Admin Kullanıcı', nickname: 'Admin', email: 'admin@matchsport.com', phone: '05550000000', role: 'admin', birth_date: '1985-01-01', kvkk_mask: 0 },
    { id: uuidv4(), full_name: 'Selin Yıldız', nickname: 'FitSelin', email: 'selin@matchsport.com', phone: '05554567890', role: 'member', birth_date: '1999-07-18', kvkk_mask: 1 },
    { id: uuidv4(), full_name: 'Burak Arslan', nickname: 'BurakBeast', email: 'burak@matchsport.com', phone: '05556789012', role: 'member', birth_date: '1994-12-03', kvkk_mask: 1 },
    { id: uuidv4(), full_name: 'Deniz Çelik', nickname: 'DenizDynamic', email: 'deniz@matchsport.com', phone: '05551112233', role: 'member', birth_date: '1996-05-25', kvkk_mask: 1 },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, full_name, nickname, email, phone, password_hash, role, birth_date, kvkk_mask)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.full_name, u.nickname, u.email, u.phone, hash, u.role, u.birth_date, u.kvkk_mask);
  }

  // --- MEMBERSHIPS ---
  const memberUsers = users.filter(u => u.role === 'member');
  const insertMembership = db.prepare(`
    INSERT INTO memberships (id, user_id, start_date, end_date, total_days, remaining_days, status, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const statuses = ['active', 'active', 'active', 'grace', 'active', 'active', 'active', 'expired'];
  const remainingDays = [22, 15, 8, 2, 28, 18, 10, 0];

  memberUsers.forEach((u, i) => {
    const start = new Date();
    start.setDate(start.getDate() - (30 - remainingDays[i]));
    const end = new Date();
    end.setDate(end.getDate() + remainingDays[i]);
    insertMembership.run(
      uuidv4(), u.id,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      30, remainingDays[i], statuses[i], 500
    );
  });

  // --- QR CODES ---
  const insertQR = db.prepare(`
    INSERT INTO qr_codes (id, user_id, qr_token, is_active)
    VALUES (?, ?, ?, 1)
  `);
  for (const u of users) {
    insertQR.run(uuidv4(), u.id, `QR-${u.email.split('@')[0].toUpperCase()}-${Date.now()}`);
  }

  // --- EXERCISES ---
  const exercises = [
    { id: uuidv4(), name: 'Bench Press', muscle_group: 'Göğüs', equipment: 'Barbell' },
    { id: uuidv4(), name: 'Squat', muscle_group: 'Bacak', equipment: 'Barbell' },
    { id: uuidv4(), name: 'Deadlift', muscle_group: 'Sırt', equipment: 'Barbell' },
    { id: uuidv4(), name: 'Overhead Press', muscle_group: 'Omuz', equipment: 'Barbell' },
    { id: uuidv4(), name: 'Barbell Row', muscle_group: 'Sırt', equipment: 'Barbell' },
    { id: uuidv4(), name: 'Lat Pulldown', muscle_group: 'Sırt', equipment: 'Cable' },
    { id: uuidv4(), name: 'Leg Press', muscle_group: 'Bacak', equipment: 'Machine' },
    { id: uuidv4(), name: 'Dumbbell Curl', muscle_group: 'Kol', equipment: 'Dumbbell' },
    { id: uuidv4(), name: 'Tricep Pushdown', muscle_group: 'Kol', equipment: 'Cable' },
    { id: uuidv4(), name: 'Cable Fly', muscle_group: 'Göğüs', equipment: 'Cable' },
    { id: uuidv4(), name: 'Lateral Raise', muscle_group: 'Omuz', equipment: 'Dumbbell' },
    { id: uuidv4(), name: 'Leg Curl', muscle_group: 'Bacak', equipment: 'Machine' },
    { id: uuidv4(), name: 'Plank', muscle_group: 'Core', equipment: 'Bodyweight' },
    { id: uuidv4(), name: 'Pull Up', muscle_group: 'Sırt', equipment: 'Bodyweight' },
    { id: uuidv4(), name: 'Dips', muscle_group: 'Göğüs', equipment: 'Bodyweight' },
  ];

  const insertExercise = db.prepare(`
    INSERT INTO exercises (id, name, muscle_group, equipment)
    VALUES (?, ?, ?, ?)
  `);
  for (const e of exercises) {
    insertExercise.run(e.id, e.name, e.muscle_group, e.equipment);
  }

  // --- WORKOUT PROGRAMS ---
  const ahmet = users[0];
  const trainer = users.find(u => u.role === 'trainer');
  const programId = uuidv4();

  db.prepare(`
    INSERT INTO workout_programs (id, user_id, assigned_by, program_name, description, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(programId, ahmet.id, trainer.id, 'Push-Pull-Legs', '6 günlük Push-Pull-Legs split programı');

  const days = [
    { day: 'mon', muscle: 'Göğüs & Omuz (Push)', exercises: [0, 3, 9, 10] },
    { day: 'tue', muscle: 'Sırt & Biceps (Pull)', exercises: [4, 5, 7, 13] },
    { day: 'wed', muscle: 'Bacak', exercises: [1, 6, 11] },
    { day: 'thu', muscle: 'Göğüs & Triceps (Push)', exercises: [0, 14, 8, 10] },
    { day: 'fri', muscle: 'Sırt & Biceps (Pull)', exercises: [2, 5, 7, 13] },
    { day: 'sat', muscle: 'Bacak & Core', exercises: [1, 6, 11, 12] },
  ];

  const insertDay = db.prepare(`
    INSERT INTO workout_days (id, program_id, day_of_week, muscle_group, order_index)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertWE = db.prepare(`
    INSERT INTO workout_exercises (id, workout_day_id, exercise_id, sets, reps, weight_kg, rest_seconds, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  days.forEach((d, di) => {
    const dayId = uuidv4();
    insertDay.run(dayId, programId, d.day, d.muscle, di);
    d.exercises.forEach((ei, order) => {
      insertWE.run(uuidv4(), dayId, exercises[ei].id, 4, 10, 40 + Math.random() * 60, 90, order);
    });
  });

  // --- PR RECORDS ---
  const insertPR = db.prepare(`
    INSERT INTO pr_records (id, user_id, exercise_id, max_weight_kg, reps, achieved_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const prData = [
    { exIdx: 0, weight: 100, reps: 1, date: '2026-03-10', note: '🎉 Bench PR kırıldı!' },
    { exIdx: 1, weight: 140, reps: 1, date: '2026-03-08', note: 'Squat PR!' },
    { exIdx: 2, weight: 160, reps: 1, date: '2026-03-05', note: 'Deadlift yeni rekor' },
    { exIdx: 3, weight: 65, reps: 1, date: '2026-03-01', note: 'OHP ilerleme' },
  ];

  for (const pr of prData) {
    insertPR.run(uuidv4(), ahmet.id, exercises[pr.exIdx].id, pr.weight, pr.reps, pr.date, pr.note);
  }

  // --- BODY MEASUREMENTS ---
  const insertBody = db.prepare(`
    INSERT INTO body_measurements (id, user_id, weight_kg, body_fat_pct, chest_cm, waist_cm, arm_cm, leg_cm, measured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const baseDate = new Date('2026-01-01');
  for (let i = 0; i < 10; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i * 7);
    insertBody.run(
      uuidv4(), ahmet.id,
      82 - i * 0.3,
      18 - i * 0.4,
      102 + i * 0.2,
      84 - i * 0.5,
      36 + i * 0.15,
      58 + i * 0.2,
      d.toISOString().split('T')[0]
    );
  }

  // --- CHECK-INS (last 30 days) ---
  const insertCheckIn = db.prepare(`
    INSERT INTO check_ins (id, user_id, check_in_time, check_out_time, duration_minutes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = new Date();
  for (let day = 0; day < 30; day++) {
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) continue; // Sunday off

    // Random members check in
    const numCheckins = 5 + Math.floor(Math.random() * 15);
    for (let c = 0; c < numCheckins; c++) {
      const user = memberUsers[Math.floor(Math.random() * memberUsers.length)];
      const hour = 7 + Math.floor(Math.random() * 14); // 7am - 9pm
      const checkIn = new Date(d);
      checkIn.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      const duration = 45 + Math.floor(Math.random() * 75);
      const checkOut = new Date(checkIn);
      checkOut.setMinutes(checkOut.getMinutes() + duration);
      insertCheckIn.run(uuidv4(), user.id, checkIn.toISOString(), checkOut.toISOString(), duration);
    }
  }

  // --- GYM OCCUPANCY (heatmap data) ---
  const insertOcc = db.prepare(`
    INSERT INTO gym_occupancy (id, current_count, max_capacity, recorded_at, hour_of_day, day_of_week)
    VALUES (?, ?, 100, ?, ?, ?)
  `);

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const peakHours = { 7: 15, 8: 25, 9: 30, 10: 20, 11: 15, 12: 35, 13: 30, 14: 20, 15: 18, 16: 25, 17: 45, 18: 60, 19: 55, 20: 40, 21: 25 };

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(now);
    d.setDate(d.getDate() - dayOffset);
    const dow = dayNames[d.getDay()];
    for (let hour = 7; hour <= 21; hour++) {
      const base = peakHours[hour] || 10;
      const count = Math.max(0, base + Math.floor((Math.random() - 0.5) * 20));
      const occTime = new Date(d);
      occTime.setHours(hour, 0, 0, 0);
      insertOcc.run(uuidv4(), count, occTime.toISOString(), hour, dow);
    }
  }

  // --- ANNOUNCEMENTS ---
  const admin = users.find(u => u.role === 'admin');
  const insertAnn = db.prepare(`
    INSERT INTO announcements (id, created_by, title, body, type, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  insertAnn.run(uuidv4(), admin.id, '🎉 Mart Kampanyası!', '3 aylık üyelikte %20 indirim! Son gün 31 Mart.', 'campaign');
  insertAnn.run(uuidv4(), admin.id, '⏰ Yeni Çalışma Saatleri', 'Hafta içi 06:00-23:00, Hafta sonu 08:00-22:00 olarak güncellendi.', 'schedule');
  insertAnn.run(uuidv4(), admin.id, '🏋️ Yeni Aletler Geldi!', 'Fonksiyonel antrenman alanımıza yeni ekipmanlar eklendi. Hemen deneyin!', 'general');

  // --- LEADERBOARD & BADGES ---
  const badges = [
    { id: uuidv4(), name: '100 GÜN', description: 'Aralıksız 100 gün disiplin.', icon_type: 'shield', type: 'consistency' },
    { id: uuidv4(), name: 'SQUAT Ustası', description: '100kg+ squat rekoru.', icon_type: 'barbell', type: 'strength' },
    { id: uuidv4(), name: '150 KG CLUB', description: 'Bileşik hareketlerde 150kg barajı.', icon_type: 'trophy', type: 'milestone' },
    { id: uuidv4(), name: 'Early Bird', description: 'Sabah 06:00-08:00 arası girişler.', icon_type: 'sunny', type: 'time' },
  ];

  const insertBadge = db.prepare('INSERT INTO badges (id, name, description, icon_type, type) VALUES (?, ?, ?, ?, ?)');
  const insertUserBadge = db.prepare('INSERT INTO user_badges (id, user_id, badge_id) VALUES (?, ?, ?)');

  badges.forEach(b => insertBadge.run(b.id, b.name, b.description, b.icon_type, b.type));

  // Assign some badges to Ahmet
  const ahmetId = ahmet.id;
  [0, 1, 2].forEach(i => insertUserBadge.run(uuidv4(), ahmetId, badges[i].id));

  const insertLB = db.prepare(`
    INSERT INTO leaderboard (id, user_id, monthly_visits, current_streak, best_streak, month_year, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const visits = [22, 20, 18, 15, 12, 10, 8, 5];
  memberUsers.forEach((u, i) => {
    insertLB.run(uuidv4(), u.id, visits[i], visits[i], visits[i] + 3, monthYear, 'attendance');
  });

  // Strength leaderboard (Bench Press)
  const benchExercise = exercises[0];
  memberUsers.forEach((u, i) => {
    const weight = 140 - i * 5;
    insertLB.run(uuidv4(), u.id, weight, 0, 0, monthYear, 'strength_bench');
  });

  // --- DIET PLANS ---
  db.prepare(`
    INSERT INTO diet_plans (id, user_id, assigned_by, plan_name, description, meals, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(
    uuidv4(), ahmet.id, trainer.id,
    'Kas Kazanım Diyeti',
    'Günlük 2800 kcal hedefli yüksek proteinli beslenme planı',
    JSON.stringify({
      breakfast: { name: 'Kahvaltı', items: ['4 yumurta', 'Yulaf ezmesi (100g)', 'Muz', 'Bal'], calories: 650 },
      snack1: { name: 'Ara Öğün 1', items: ['Protein bar', 'Elma'], calories: 300 },
      lunch: { name: 'Öğle', items: ['Tavuk göğsü (200g)', 'Bulgur pilavı', 'Salata'], calories: 700 },
      snack2: { name: 'Ara Öğün 2', items: ['Yoğurt', 'Ceviz (30g)'], calories: 250 },
      dinner: { name: 'Akşam', items: ['Somon (200g)', 'Sebze sote', 'Makarna (100g)'], calories: 650 },
      postWorkout: { name: 'Antrenman Sonrası', items: ['Whey protein', 'Muz'], calories: 250 }
    }),
  );

  console.log('✅ Database seeded with demo data');
}

module.exports = { seedDatabase };
