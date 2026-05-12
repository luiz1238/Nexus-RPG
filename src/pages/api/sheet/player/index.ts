import type { NextApiRequest, NextApiResponse } from 'next';
import database from '../../../../utils/database';
import { sessionAPI } from '../../../../utils/session';
import { broadcast } from '../../../../utils/broadcast';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') return handleDelete(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  res.status(404).end();
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const name: string | undefined = req.body.name;
  const showName: boolean | undefined = req.body.showName;
  const maxLoad: number | undefined = req.body.maxLoad;
  const maxSlots: number | undefined = req.body.maxSlots;

  const playerId = npcId ? npcId : player.id;

  await database.player.update({
    where: { id: playerId },
    data: { name, showName, maxLoad, spellSlots: maxSlots },
  });

  res.end();

  if (!npcId) {
    if (maxSlots !== undefined)
      broadcast('playerSpellSlotsChange', { playerId, newSpellSlots: maxSlots });
    if (maxLoad !== undefined)
      broadcast('playerMaxLoadChange', { playerId, newLoad: maxLoad });
  }

  if (name !== undefined) broadcast('playerNameChange', { playerId, value: name });
  if (showName !== undefined)
    broadcast('playerNameShowChange', { playerId, show: showName });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player || !player.admin) {
    res.status(401).end();
    return;
  }

  const playerID = req.body.id;

  if (!playerID) {
    res.status(400).send({ message: 'Player ID is undefined.' });
    return;
  }

  await database.player.delete({ where: { id: playerID } });

  res.end();

  broadcast('playerDelete', { playerId: playerID });
}

export default sessionAPI(handler);
