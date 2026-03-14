const { getDb } = require('../database');

async function listUsers() {
    try {
        const { data, error } = await getDb().from('users').select('full_name, email, role');
        if (error) throw error;
        console.log('--- USER LIST ---');
        data.forEach(u => {
            console.log(`${u.role.toUpperCase()}: ${u.full_name} (${u.email})`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        process.exit();
    }
}

listUsers();
