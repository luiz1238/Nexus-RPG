import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../utils/database';
import { sessionAPI } from '../../../../../utils/session';
import { broadcast } from '../../../../../utils/broadcast';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(401).end();
    return;
  }

  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const attributeID: number | undefined = parseInt(req.body.id);

  if (!attributeID) {
    res.status(401).send({ message: 'ID do atributo está em branco.' });
    return;
  }

  const value: number | undefined = req.body.value;
  const maxValue: number | undefined = req.body.maxValue;
  const show: boolean | undefined = req.body.show;

  const playerId = npcId ? npcId : player.id;

  const attr = await prisma.playerAttribute.update({
    where: {
      player_id_attribute_id: {
        player_id: playerId,
        attribute_id: attributeID,
      },
    },
    data: { value, maxValue, show },
  });

  res.end();

  broadcast('playerAttributeChange', {
    playerId,
    attributeId: attributeID,
    value: attr.value,
    maxValue: attr.maxValue,
    show: attr.show,
  });
}

export default sessionAPI(handler);
