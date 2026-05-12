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
  const senderEquipmentId: number | undefined = req.body.offerId;

  const receiverId: number | undefined = req.body.playerId;
  const receiverEquipmentId: number | undefined = req.body.tradeId;

  if (!senderEquipmentId || !receiverId) {
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

  if (receiverEquipmentId) {
    if (senderEquipmentId === receiverEquipmentId) {
      res.status(400).send({ message: 'Não é possível trocar dois itens iguais.' });
      return;
    }

    const senderTradeEquip = await database.playerEquipment.findUnique({
      where: {
        player_id_equipment_id: {
          player_id: senderId,
          equipment_id: receiverEquipmentId,
        },
      },
    });

    if (senderTradeEquip) {
      res.status(400).send({
        message: 'Você já possui esse equipamento.',
      });
      return;
    }

    const receiverEquip = await database.playerEquipment.findUnique({
      where: {
        player_id_equipment_id: {
          player_id: receiverId,
          equipment_id: receiverEquipmentId,
        },
      },
    });

    if (receiverEquip === null) {
      res.status(400).send({
        message: 'Essa troca não pode ser criada porque o ofertado não possui esse equipamento.',
      });
      return;
    }
  } else {
    const receiverEquip = await database.playerEquipment.findUnique({
      where: {
        player_id_equipment_id: {
          player_id: receiverId,
          equipment_id: senderEquipmentId,
        },
      },
    });

    if (receiverEquip !== null) {
      res.status(400).send({
        message:
          'Essa proposta não pode ser feita porque o seu ofertado já possui esse equipamento.',
      });
      return;
    }
  }

  const senderEquip = await database.playerEquipment.findUnique({
    where: {
      player_id_equipment_id: {
        player_id: senderId,
        equipment_id: senderEquipmentId,
      },
    },
    select: {
      Player: { select: { name: true } },
      Equipment: { select: { name: true } },
    },
  });

  if (!senderEquip) {
    res.status(400).send({
      message: 'Essa troca não pode ser criada porque você não possui esse equipamento.',
    });
    return;
  }

  const trade = await database.trade.create({
    data: {
      sender_id: senderId,
      sender_object_id: senderEquipmentId,
      receiver_id: receiverId,
      receiver_object_id: receiverEquipmentId,
    },
    select: { id: true },
  });

  res.send({ id: trade.id });

  broadcast('playerTradeRequest', {
    type: 'equipment',
    tradeId: trade.id,
    receiverObjectId: receiverEquipmentId || null,
    senderName: senderEquip.Player.name,
    senderObjectName: senderEquip.Equipment.name,
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
      database.playerEquipment.update({
        where: {
          player_id_equipment_id: {
            player_id: trade.sender_id,
            equipment_id: trade.sender_object_id,
          },
        },
        data: { player_id: trade.receiver_id },
        include: { Equipment: true },
      }),
      database.playerEquipment.update({
        where: {
          player_id_equipment_id: {
            player_id: trade.receiver_id,
            equipment_id: trade.receiver_object_id,
          },
        },
        data: { player_id: trade.sender_id },
        include: { Equipment: true },
      }),
    ]);

    const newSenderEquipment = results[0];
    const newReceiverEquipment = results[1];

    res.send({ equipment: newSenderEquipment });

    broadcast('playerTradeResponse', {
      accept,
      object: { type: 'equipment', obj: results[1] },
    });

    broadcast('playerEquipmentRemove', { playerId: trade.sender_id, id: trade.sender_object_id });
    broadcast('playerEquipmentRemove', { playerId: trade.receiver_id, id: trade.receiver_object_id });
    broadcast('playerEquipmentAdd', { playerId: trade.sender_id, equipment: newSenderEquipment.Equipment });
    broadcast('playerEquipmentAdd', { playerId: trade.receiver_id, equipment: newReceiverEquipment.Equipment });
  } else {
    const equipment = await database.playerEquipment.update({
      where: {
        player_id_equipment_id: {
          player_id: trade.sender_id,
          equipment_id: trade.sender_object_id,
        },
      },
      data: { player_id: trade.receiver_id },
      include: { Equipment: true },
    });

    res.send({ equipment });

    broadcast('playerTradeResponse', { accept });

    broadcast('playerEquipmentRemove', { playerId: trade.sender_id, id: trade.sender_object_id });
    broadcast('playerEquipmentAdd', { playerId: trade.receiver_id, equipment: equipment.Equipment });
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
