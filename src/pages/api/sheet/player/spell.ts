import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../utils/database';
import { sessionAPI } from '../../../../utils/session';
import { broadcast } from '../../../../utils/broadcast';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') return handlePut(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  res.status(404).send({ message: 'Supported methods: POST | PUT | DELETE' });
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const spellID: number | undefined = req.body.id;

  if (!spellID) {
    res.status(400).send({ message: 'spell ID is undefined.' });
    return;
  }

  const playerId = npcId ? npcId : player.id;

  const spell = await prisma.playerSpell.create({
    data: {
      player_id: playerId,
      spell_id: spellID,
    },
    select: { Spell: true },
  });

  broadcast('playerSpellAdd', { playerId, spell: spell.Spell });

  res.send({ spell: spell.Spell });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;
  const npcId: number | undefined = req.body.npcId;

  if (!player || (player.admin && !npcId)) {
    res.status(401).end();
    return;
  }

  const spellID: number | undefined = req.body.id;

  if (!spellID) {
    res.status(400).send({ message: 'spell ID is undefined.' });
    return;
  }

  const playerId = npcId ? npcId : player.id;

  await prisma.playerSpell.delete({
    where: { player_id_spell_id: { player_id: playerId, spell_id: spellID } },
  });

  broadcast('playerSpellRemove', { playerId, spellId: spellID });

  res.end();
}

export default sessionAPI(handler);
