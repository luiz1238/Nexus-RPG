import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseClient } from '../utils/supabaseClient';
import type { BroadcastEventName, BroadcastPayloads } from '../utils/realtime';

type EventCallback<T extends BroadcastEventName> = (payload: BroadcastPayloads[T]) => void;

let channelInstance: RealtimeChannel | null = null;

function getChannel(): RealtimeChannel {
  if (!channelInstance) {
    channelInstance = supabaseClient.channel('nexus-rpg', {
      config: {
        broadcast: { self: true },
      },
    });
    channelInstance.subscribe();
  }
  return channelInstance;
}

export default function useRealtime() {
  const channelRef = useRef<RealtimeChannel>(getChannel());
  const [ready, setReady] = useState(() => channelRef.current.state === 'joined');

  useEffect(() => {
    const channel = channelRef.current;

    if (channel.state === 'joined') {
      setReady(true);
    }

    const unsubscribe = channel.on('system', {}, (payload: { type?: string }) => {
      if (payload.type === 'joined') {
        setReady(true);
      }
    }) as unknown as () => void;

    return () => {
      unsubscribe?.();
    };
  }, []);

  const on = useCallback(<T extends BroadcastEventName>(event: T, callback: EventCallback<T>) => {
    const channel = channelRef.current;

    channel.on('broadcast' as any, { event } as any, (payload: { payload: BroadcastPayloads[T] }) => {
      callback(payload.payload);
    });
  }, []);

  return { on, ready, channel: channelRef };
}
