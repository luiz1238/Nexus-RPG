import { createContext } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const ErrorLogger = createContext<(err: any) => void>(() => {});
export const Realtime = createContext<RealtimeChannel | null>(null);
