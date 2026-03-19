const { getDb } = require('./backend/database');

async function check() {
    try {
        const db = getDb();
        const { data, error, count } = await db.from('check_ins')
            .select('*', { count: 'exact' })
            .is('check_out_time', null);

        if (error) {
            console.error('Error fetching check_ins:', error);
            return;
        }

        console.log('Current check_ins without check_out_time:', data.length);
        console.log('Records:', JSON.stringify(data, null, 2));

        const { data: occ } = await db.from('gym_occupancy')
            .select('*')
            .order('recorded_at', { ascending: false })
            .limit(1);
        console.log('Latest gym_occupancy record:', JSON.stringify(occ, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

check();
