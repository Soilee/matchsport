require('dotenv').config();
const { supabase } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🌱 Seeding Supabase...');

    // 1. Create Admin User
    const adminPassword = bcrypt.hashSync('123456', 10);
    await supabase.from('users').upsert({
        email: 'admin@matchsport.com',
        full_name: 'MatchSport Admin',
        role: 'admin',
        password_hash: adminPassword,
        kvkk_mask: false
    }, { onConflict: 'email' });
    console.log('✅ Admin user ready');

    // 2. Create Demo User
    await supabase.from('users').upsert({
        email: 'ahmet@matchsport.com',
        full_name: 'Ahmet Yılmaz',
        role: 'member',
        password_hash: adminPassword,
        nickname: 'Amet',
        kvkk_mask: true
    }, { onConflict: 'email' });
    console.log('✅ Demo user ready');

    // 3. Sample Exercises
    const exercises = [
        { name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
        { name: 'Squat', muscle_group: 'Legs', equipment: 'Barbell' },
        { name: 'Deadlift', muscle_group: 'Back', equipment: 'Barbell' },
        { name: 'Shoulder Press', muscle_group: 'Shoulders', equipment: 'Dumbbell' },
        { name: 'Bicep Curl', muscle_group: 'Arms', equipment: 'Dumbbell' }
    ];

    for (const ex of exercises) {
        await supabase.from('exercises').upsert(ex, { onConflict: 'name' });
    }
    console.log('✅ Sample exercises ready');

    // 3. Initial Occupancy
    await supabase.from('gym_occupancy').insert({
        current_count: 5,
        max_capacity: 100,
        recorded_at: new Date().toISOString(),
        hour_of_day: new Date().getHours(),
        day_of_week: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
    });
    console.log('✅ Occupancy initialized');

    console.log('🚀 Seeding completed!');
}

seed();
