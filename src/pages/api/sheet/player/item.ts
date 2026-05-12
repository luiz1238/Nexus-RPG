import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../utils/database';
import { sessionAPI } from '../../../../utils/session';
import { broadcast } from '../../../../utils/broadcast';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'PUT') return handlePut(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  res.status(404).send({ message: 'Supported methods: POST | PUT | DELETE' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player) {
    res.status(401).end();
    return;
  }

  const playerId = parseInt(req.query.playerId as string);

  if (!playerId) {
    res.status(400).end();
    return;
  }

  const pe = await prisma.playerItem.findMany({
    where: { player_id: playerId },
    select: { Item: true },
  });

  const items = pe.map((eq) => eq.Item);

  res.send({ items });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const itemID = req.body.id;

  if (!itemID) {
    res.status(400).send({ message: 'Item ID is undefined.' });
    return;
  }

  const quantity = req.body.quantity;
  const currentDescription = req.body.currentDescription;

  const playerId = npcId ? npcId : player.id;

  const item = await prisma.playerItem.update({
    where: { player_id_item_id: { player_id: playerId, item_id: itemID } },
    data: { quantity, currentDescription },
  });

  res.end();

  broadcast('playerItemChange', {
    playerId,
    itemID,
    currentDescription: item.currentDescription,
    quantity: item.quantity,
  });
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const itemID = req.body.id;

  if (!itemID) {
    res.status(400).send({ message: 'Item ID is undefined.' });
    return;
  }

  const playerId = npcId ? npcId : player.id;

  const item = await prisma.playerItem.create({
    data: {
      currentDescription: '',
      quantity: 1,
      player_id: playerId,
      item_id: itemID,
    },
    include: { Item: true },
  });

  await prisma.playerItem.update({
    where: { player_id_item_id: { player_id: playerId, item_id: itemID } },
    data: { currentDescription: item.Item.description },
  });

  item.currentDescription = item.Item.description;

  res.send({ item });

  broadcast('playerItemAdd', {
    playerId,
    item: item.Item,
    currentDescription: item.currentDescription,
    quantity: item.quantity,
  });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const itemID = req.body.id;

  if (!itemID) {
    res.status(400).send({ message: 'Item ID is undefined.' });
    return;
  }

  const playerId = npcId ? npcId : player.id;

  await prisma.playerItem.delete({
    where: { player_id_item_id: { player_id: playerId, item_id: itemID } },
  });

  res.end();

  broadcast('playerItemRemove', { playerId, id: itemID });
}

export default sessionAPI(handler);
