const { getDb } = require('../database');

async function checkSchema() {
    const db = getDb();

    // 1. Memberships
    const { data: mems } = await db.from('memberships').select('*').limit(1);
    if (mems && mems.length > 0) {
        console.log('MEMBERSHIP_COLUMNS:', Object.keys(mems[0]).join(','));
        console.log('MEMBERSHIP_SAMPLE:', JSON.stringify(mems[0]));
    } else {
        console.log('MEMBERSHIP:EMPTY');
    }

    // 2. Food Items
    const { data: foods } = await db.from('food_items').select('*').limit(1);
    if (foods && foods.length > 0) {
        console.log('FOOD_COLUMNS:', Object.keys(foods[0]).join(','));
    } else {
        console.log('FOOD:EMPTY');
    }

    process.exit();
}

checkSchema();
