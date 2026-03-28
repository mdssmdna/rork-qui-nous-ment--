import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://koqvellenvwhboblrhau.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcXZlbGxlbnZ3aGJvYmxyaGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MjU3NzIsImV4cCI6MjA3NjQwMTc3Mn0.ycwbw4CWq6d6XjJ_v2DL4r84dAX9vG9H9WwuSSOSupM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          game_code: string;
          admin_id: string;
          phase: string;
          current_word: string | null;
          word_category: string | null;
          liar_id: string | null;
          time_left: number;
          tie_breaker_id: string | null;
          winner: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_code: string;
          admin_id: string;
          phase?: string;
          current_word?: string | null;
          word_category?: string | null;
          liar_id?: string | null;
          time_left?: number;
          tie_breaker_id?: string | null;
          winner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_code?: string;
          admin_id?: string;
          phase?: string;
          current_word?: string | null;
          word_category?: string | null;
          liar_id?: string | null;
          time_left?: number;
          tie_breaker_id?: string | null;
          winner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          game_id: string;
          name: string;
          is_admin: boolean;
          card: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          name: string;
          is_admin?: boolean;
          card?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          name?: string;
          is_admin?: boolean;
          card?: string | null;
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          game_id: string;
          voter_id: string;
          target_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          voter_id: string;
          target_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          voter_id?: string;
          target_id?: string;
          created_at?: string;
        };
      };
    };
  };
};
