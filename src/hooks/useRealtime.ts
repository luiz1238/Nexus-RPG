import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseClient } from '../utils/supabaseClient';
import type { BroadcastEventName, BroadcastPayloads } from '../utils/realtime';

type EventCallback<T extends BroadcastEventName> = (payload: BroadcastPayloads[T]) => void;

export default function useRealtime() {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const channel = supabaseClient.channel('nexus-rpg', {
      config: {
        broadcast: { self: true },
      },
    });
    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setReady(true);
      }
    });

    return () => {
      supabaseClient.removeChannel(channel);
      channelRef.current = null;
      setReady(false);
    };
  }, []);

  const on = useCallback(<T extends BroadcastEventName>(event: T, callback: EventCallback<T>) => {
    const channel = channelRef.current;
    if (!channel) return;

    channel.on('broadcast' as any, { event } as any, (payload: { payload: BroadcastPayloads[T] }) => {
      callback(payload.payload);
    });
  }, []);

  return { on, ready, channel: channelRef };
}
