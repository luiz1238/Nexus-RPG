import type { NextApiRequest, NextApiResponse } from 'next';
import database from '../../../utils/database';
import { sessionAPI } from '../../../utils/session';
import { broadcast } from '../../../utils/broadcast';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'PUT') return handlePut(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  res.status(404).end();
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player) {
    res.status(401).end();
    return;
  }

  const id: number | undefined = req.body.id;
  const name: string | undefined = req.body.name;
  const description: string | undefined = req.body.description;
  const weight: number | undefined = req.body.weight;
  const visible: boolean | undefined = req.body.visible;

  if (!id || !name || !description || weight === undefined || visible === undefined) {
    res
      .status(401)
      .send({ message: 'ID, nome, descrição, peso ou visível do item estão em branco.' });
    return;
  }

  const item = await database.item.update({
    data: { name, description, weight, visible },
    where: { id },
  });

  broadcast('itemChange', { item });

  res.end();
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player) {
    res.status(401).end();
    return;
  }

  const name: string | undefined = req.body.name;
  const description: string | undefined = req.body.description;
  const weight: number | undefined = req.body.weight;

  if (!name || !description || weight === undefined) {
    res.status(401).send({ message: 'Nome, descrição ou peso do item estão em branco.' });
    return;
  }

  const item = await database.item.create({
    data: { name, description, weight, visible: true },
  });

  res.send({ id: item.id });

  broadcast('itemAdd', { id: item.id, name: item.name });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const player = req.session.player;

  if (!player || !player.admin) {
    res.status(401).end();
    return;
  }

  const id: number | undefined = req.body.id;

  if (!id) {
    res.status(401).send({ message: 'ID do item está em branco.' });
    return;
  }

  await database.item.delete({ where: { id } });

  res.end();

  broadcast('itemRemove', { id });
}

export default sessionAPI(handler);
