const { getDb } = require('../database');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    const db = getDb();
    const email = 'admin@matchless.com';
    const password = 'admin123';
    const hash = bcrypt.hashSync(password, 10);

    console.log('🚀 Creating admin account...');

    try {
        const { data: existing } = await db.from('users').select('id').eq('email', email).maybeSingle();

        if (existing) {
            console.log('⚠️ Admin account already exists. Updating password...');
            const { error: updateError } = await db.from('users').update({
                password_hash: hash,
                role: 'admin'
            }).eq('id', existing.id);

            if (updateError) throw updateError;
            console.log('✅ Admin password updated successfully!');
        } else {
            const { data: newUser, error: insertError } = await db.from('users').insert({
                full_name: 'System Admin',
                nickname: 'Admin',
                email: email,
                phone: '5550000000',
                password_hash: hash,
                role: 'admin'
            }).select().single();

            if (insertError) throw insertError;
            console.log('✅ Admin account created successfully!');
            console.log('Email:', email);
            console.log('Password:', password);
        }
    } catch (err) {
        console.error('❌ Error seeding admin:', err);
    } finally {
        process.exit();
    }
}

seedAdmin();
