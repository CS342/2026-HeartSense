import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wtwgqbfuhkiilclsczvo.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0d2dxYmZ1aGtpaWxjbHNjenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzYyNjMsImV4cCI6MjA4NDAxMjI2M30.Zqix4ES039_eWjtNOqHMeXYO7iazRgLMYGwNftETH0I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
