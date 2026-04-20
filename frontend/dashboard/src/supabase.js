import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lfqkmlvrpeqnshgeoxdj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmcWttbHZycGVxbnNoZ2VveGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzUwOTEsImV4cCI6MjA4ODkxMTA5MX0.aayWZufwRx159CR9soQoAbViWDzbiVxCxlVYPSuGXNI';

export const supabase = createClient(supabaseUrl, supabaseKey);
