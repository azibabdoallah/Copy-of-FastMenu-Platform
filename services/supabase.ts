import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// إعدادات الربط مع Supabase
// ------------------------------------------------------------------

const supabaseUrl = 'https://apdgwwzyeanxxlotwmpl.supabase.co';
const supabaseKey = 'sb_publishable_zfDzsqNyBUMv9oVvS71n5Q_lANnBSHe';

export const supabase = createClient(supabaseUrl, supabaseKey);
