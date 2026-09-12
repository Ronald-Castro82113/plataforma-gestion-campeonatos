import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Usamos createBrowserClient para que guarde la sesión en Cookies automáticas
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);