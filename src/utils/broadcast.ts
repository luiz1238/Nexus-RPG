import { supabaseServer } from './supabaseServer';
import type { BroadcastEventName, BroadcastPayloads } from './realtime';

const CHANNEL_NAME = 'nexus-rpg';

export async function broadcast<T extends BroadcastEventName>(
  event: T,
  payload: BroadcastPayloads[T]
) {
  const channel = supabaseServer.channel(CHANNEL_NAME);
  await channel.send({
    type: 'broadcast',
    event,
    payload,
  });
  supabaseServer.removeChannel(channel);
}
