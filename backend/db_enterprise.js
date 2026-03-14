const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyUpdates() {
    const client = new Client({
        connectionString: "postgresql://postgres:pufEOq3m3NIWWfykBrUDY-tz1iLwReQ25aFfwrI7iRo@lfqkmlvrpeqnshgeoxdj.supabase.co:6543/postgres",
    });

    try {
        await client.connect();
        console.log('Connected to Supabase DB');

        const sql = fs.readFileSync(path.join(__dirname, 'enterprise_updates.sql'), 'utf8');
        await client.query(sql);

        console.log('Enterprise schema updates applied successfully! ✅');
    } catch (err) {
        console.error('Error applying updates:', err);
    } finally {
        await client.end();
    }
}

applyUpdates();
