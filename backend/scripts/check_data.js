const { getDb } = require('../database');

async function checkSchema() {
    const db = getDb();

    console.log('🔍 Checking memberships table data...');
    const { data: mems, error } = await db.from('memberships').select('*').limit(1);

    if (error) {
        console.error('❌ Error:', error);
    } else if (mems && mems.length > 0) {
        console.log('✅ Sample membership:', mems[0]);
        console.log('Columns found:', Object.keys(mems[0]));
    } else {
        console.log('⚠️ No memberships found.');
    }

    console.log('\n🔍 Checking food_items table data...');
    const { data: foods, error: foodError } = await db.from('food_items').select('*').limit(1);
    if (foodError) {
        console.error('❌ Food Error:', foodError);
    } else {
        console.log('✅ Sample food:', foods?.[0] || 'NONE');
    }

    process.exit();
}

checkSchema();
