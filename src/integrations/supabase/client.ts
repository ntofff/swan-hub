// ============================================================
// SWAN · HUB — Client Supabase
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://oqiybworucfowcwllufg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xaXlid29ydWNmb3djd2xsdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NDUxNjYsImV4cCI6MjA3NjQyMTE2Nn0.ku_ur1Oqd1VAZKJxV_rLCH2BH-zD8UzZXw-gBPs0APA';

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// END
