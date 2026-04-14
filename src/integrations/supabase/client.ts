import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://oqiybworucfowcwllufg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xaXlid29ydWNmb3djd2xsdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODk5OTEsImV4cCI6MjA5MTc2NTk5MX0.DvKpdnUWUzry4WFBkKp7FIm8-zfEs7Rf3IglYxgG4C4";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
