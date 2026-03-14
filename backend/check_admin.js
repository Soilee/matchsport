const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

async function checkSuperAdmin() {
    try {
        const { data: user, error } = await getDb().from('users').select('*').eq('email', 'superadmin@matchsport.com').single();

        if (error) {
            console.log('User not found or error:', error.message);
            return;
        }

        console.log('User found:', user.email);
        console.log('Role:', user.role);
        console.log('Stored Hash:', user.password_hash);

        const passwordToTry = 'SuperAdmin2026!';
        const isMatch = bcrypt.compareSync(passwordToTry, user.password_hash);
        console.log(`Does "${passwordToTry}" match?`, isMatch);

        const isPasswordMatch = bcrypt.compareSync('password', user.password_hash);
        console.log(`Does "password" match?`, isPasswordMatch);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

checkSuperAdmin();
