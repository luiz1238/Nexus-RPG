import type { NextApiRequest, NextApiResponse } from 'next';
import database from '../../../../../utils/database';
import { sessionAPI } from '../../../../../utils/session';
import { broadcast } from '../../../../../utils/broadcast';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') return handlePut(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  res.status(404).end();
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player) {
    res.status(401).end();
    return;
  }

  const senderId = player.id;
  const senderItemId: number | undefined = req.body.offerId;

  const receiverId: number | undefined = req.body.playerId;
  const receiverItemId: number | undefined = req.body.tradeId;

  if (!senderItemId || !receiverId) {
    res.status(400).send({ message: 'ID da oferta ou ID do jogador estão em branco.' });
    return;
  }

  const existingTrade = await database.trade.findFirst({
    where: {
      OR: [{ sender_id: receiverId }, { receiver_id: receiverId }],
    },
  });

  if (existingTrade) {
    res.status(400).send({
      message:
        'Esse jogador já está em uma troca. Por favor, aguarde até sua troca terminar.',
    });
    return;
  }

  if (receiverItemId) {
    if (senderItemId === receiverItemId) {
      res.status(400).send({ message: 'Não é possível trocar dois itens iguais.' });
      return;
    }

    const senderTradeItem = await database.playerItem.findUnique({
      where: {
        player_id_item_id: {
          player_id: senderId,
          item_id: receiverItemId,
        },
      },
    });

    if (senderTradeItem) {
      res.status(400).send({
        message: 'Você já possui esse item.',
      });
      return;
    }

    const receiverItem = await database.playerItem.findUnique({
      where: {
        player_id_item_id: {
          player_id: receiverId,
          item_id: receiverItemId,
        },
      },
    });

    if (receiverItem === null) {
      res.status(400).send({
        message: 'Essa troca não pode ser criada porque o ofertado não possui esse item.',
      });
      return;
    }
  } else {
    const receiverItem = await database.playerItem.findUnique({
      where: {
        player_id_item_id: {
          player_id: receiverId,
          item_id: senderItemId,
        },
      },
    });

    if (receiverItem !== null) {
      res.status(400).send({
        message:
          'Essa proposta não pode ser feita porque o seu ofertado já possui esse item.',
      });
      return;
    }
  }

  const trade = await database.trade.create({
    data: {
      sender_id: senderId,
      sender_object_id: senderItemId,
      receiver_id: receiverId,
      receiver_object_id: receiverItemId,
    },
  });

  const senderItem = await database.playerItem.findUnique({
    where: {
      player_id_item_id: {
        player_id: senderId,
        item_id: senderItemId,
      },
    },
    select: {
      Player: { select: { name: true } },
      Item: { select: { name: true } },
    },
  });

  if (!senderItem) {
    res.status(400).send({
      message: 'Essa troca não pode ser criada porque você não possui esse item.',
    });
    return;
  }

  res.send({ id: trade.id });

  broadcast('playerTradeRequest', {
    type: 'item',
    tradeId: trade.id,
    receiverObjectId: trade.receiver_object_id,
    senderName: senderItem.Player.name,
    senderObjectName: senderItem.Item.name,
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player) {
    res.status(401).end();
    return;
  }

  const tradeId: number | undefined = req.body.tradeId;
  const accept: boolean | undefined = req.body.accept;

  if (accept === undefined || !tradeId) {
    res.status(400).send({ message: 'Aceite ou ID da troca estão em branco.' });
    return;
  }

  const trade = await database.trade.findUnique({ where: { id: tradeId } });

  if (trade === null) {
    res.status(400).send({ message: 'Essa troca não existe.' });
    return;
  }

  if (trade.receiver_id !== player.id) {
    res.status(401).end();
    return;
  }

  await database.trade.delete({ where: { id: tradeId } });

  if (!accept) {
    res.end();
    broadcast('playerTradeResponse', { accept: false });
    return;
  }

  if (trade.receiver_object_id) {
    const results = await database.$transaction([
      database.playerItem.update({
        where: {
          player_id_item_id: {
            player_id: trade.sender_id,
            item_id: trade.sender_object_id,
          },
        },
        data: { player_id: trade.receiver_id },
        include: { Item: true },
      }),
      database.playerItem.update({
        where: {
          player_id_item_id: {
            player_id: trade.receiver_id,
            item_id: trade.receiver_object_id,
          },
        },
        data: { player_id: trade.sender_id },
        include: { Item: true },
      }),
    ]);

    const newSenderItem = results[0];
    const newReceiverItem = results[1];

    res.send({ item: newSenderItem });

    broadcast('playerTradeResponse', {
      accept,
      object: { type: 'item', obj: results[1] },
    });

    broadcast('playerItemRemove', { playerId: trade.sender_id, id: trade.sender_object_id });
    broadcast('playerItemRemove', { playerId: trade.receiver_id, id: trade.receiver_object_id });
    broadcast('playerItemAdd', {
      playerId: trade.sender_id,
      item: newSenderItem.Item,
      currentDescription: newSenderItem.currentDescription,
      quantity: newSenderItem.quantity,
    });
    broadcast('playerItemAdd', {
      playerId: trade.receiver_id,
      item: newReceiverItem.Item,
      currentDescription: newReceiverItem.currentDescription,
      quantity: newReceiverItem.quantity,
    });
  } else {
    const item = await database.playerItem.update({
      where: {
        player_id_item_id: {
          player_id: trade.sender_id,
          item_id: trade.sender_object_id,
        },
      },
      data: { player_id: trade.receiver_id },
      include: { Item: true },
    });

    res.send({ item });

    broadcast('playerTradeResponse', { accept });

    broadcast('playerItemRemove', { playerId: trade.sender_id, id: trade.sender_object_id });
    broadcast('playerItemAdd', {
      playerId: trade.receiver_id,
      item: item.Item,
      currentDescription: item.currentDescription,
      quantity: item.quantity,
    });
  }

  res.end();
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session.player) {
    res.status(401).end();
    return;
  }

  const tradeId: number | undefined = req.body.tradeId;

  if (!tradeId) {
    res.status(400).send({ message: 'ID da troca está em branco.' });
    return;
  }

  const existingTrade = await database.trade.findUnique({
    where: { id: tradeId },
    select: { id: true, receiver_id: true },
  });

  if (!existingTrade) {
    res.status(400).send({
      message: 'Você não possui nenhuma troca para cancelar.',
    });
    return;
  }

  await database.trade.delete({ where: { id: existingTrade.id } });

  res.end();
}

export default sessionAPI(handler);
