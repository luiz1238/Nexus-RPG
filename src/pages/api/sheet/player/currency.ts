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

  const currencyID: number | undefined = req.body.id;
  const value: string | undefined = req.body.value;

  if (!currencyID || value === undefined) {
    res.status(401).send({ message: 'Currency ID or value is undefined.' });
    return;
  }

  const playerId = npcId ? npcId : player.id;

  await database.playerCurrency.update({
    data: { value },
    where: { player_id_currency_id: { player_id: playerId, currency_id: currencyID } },
  });

  res.end();

  broadcast('playerCurrencyChange', { playerId, currencyId: currencyID, value });
}

export default sessionAPI(handler);
