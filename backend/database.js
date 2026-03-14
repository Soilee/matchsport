require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env file!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for backward compatibility (simulating getDb)
function getDb() {
  return supabase;
}

// Supabase handles schema via SQL Editor generally, but we keep this for consistency
function initializeDatabase() {
  console.log('📡 Connected to Supabase Cloud Database');
}

module.exports = { supabase, getDb, initializeDatabase };
