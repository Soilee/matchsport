const { getDb } = require('../database');

async function checkUsers() {
    const db = getDb();

    // 1. Users
    const { data: users, error } = await db.from('users').select('id, full_name, email, role').limit(5);
    if (error) {
        console.error('USERS_ERROR:', error);
    } else {
        console.log('USERS_COUNT:', users?.length);
        console.log('USERS_SAMPLE:', JSON.stringify(users));
    }

    // 2. All memberships
    const { data: mems } = await db.from('memberships').select('*');
    console.log('TOTAL_MEMBERSHIPS:', mems?.length);

    process.exit();
}

checkUsers();
