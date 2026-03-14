import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lfqkmlvrpeqnshgeoxdj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmcWttbHZycGVxbnNoZ2VveGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzNTA5MSwiZXhwIjoyMDg4OTExMDkxfQ.pufEOq3m3NIWWfykBrUDY-tz1iLwReQ25aFfwrI7iRo';

export const supabase = createClient(supabaseUrl, supabaseKey);
