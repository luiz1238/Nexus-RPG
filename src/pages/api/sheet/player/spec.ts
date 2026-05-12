import type { NextApiRequest, NextApiResponse } from 'next';
import database from '../../../../utils/database';
import { sessionAPI } from '../../../../utils/session';
import { broadcast } from '../../../../utils/broadcast';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  res.status(404).end();
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const specID: number | undefined = req.body.id;
  const value: string | undefined = req.body.value;

  if (!specID || value === undefined) {
    res.status(400).send({ message: 'Spec ID or value is undefined.' });
    return;
  }

  const playerId = npcId ? npcId : player.id;

  await database.playerSpec.update({
    data: { value },
    where: { player_id_spec_id: { player_id: playerId, spec_id: specID } },
  });

  res.end();

  broadcast('playerSpecChange', { playerId, specId: specID, value });
}

export default sessionAPI(handler);
