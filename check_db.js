const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = ['nutrition_logs', 'ai_macro_logs', 'users'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
        if (error) {
            console.error(`❌ Table ${table} error:`, error.message);
        } else {
            console.log(`✅ Table ${table} exists.`);
        }
    }
}

checkTables();
