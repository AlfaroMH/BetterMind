import { createClient } from '@supabase/supabase-js';

// Reemplaza estos valores con los de tu proyecto en Supabase
// Los encuentras en: Settings -> API
const SUPABASE_URL = 'https://xmbtfzmtxpsqmlqweccs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGn5NnmUF-XfsXWL4UaRYA_Rd_tHDjB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
