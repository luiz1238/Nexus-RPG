import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseClient } from '../utils/supabaseClient';
import type { BroadcastEventName, BroadcastPayloads } from '../utils/realtime';

type EventCallback<T extends BroadcastEventName> = (payload: BroadcastPayloads[T]) => void;

let channelInstance: RealtimeChannel | null = null;
let refCount = 0;

function getChannel(): RealtimeChannel {
  if (!channelInstance) {
    channelInstance = supabaseClient.channel('nexus-rpg', {
      config: {
        broadcast: { self: true },
      },
    });
    channelInstance.subscribe();
  }
  refCount++;
  return channelInstance;
}

function releaseChannel() {
  refCount--;
  if (refCount <= 0 && channelInstance) {
    supabaseClient.removeChannel(channelInstance);
    channelInstance = null;
    refCount = 0;
  }
}

export default function useRealtime() {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [ready, setReady] = useState(() => channelInstance?.state === 'joined');

  useEffect(() => {
    const channel = getChannel();
    channelRef.current = channel;

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
      channelRef.current = null;
      setReady(false);
      releaseChannel();
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
