import { createClient } from '@supabase/supabase-js';

// IMPORTANTE: Você precisa criar uma conta no Supabase (https://supabase.com)
// e adicionar essas variáveis no arquivo .env

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
