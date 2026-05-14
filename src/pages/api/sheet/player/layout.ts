import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../utils/database';
import { sessionAPI } from '../../../../utils/session';
import { broadcast } from '../../../../utils/broadcast';

type LayoutElement = {
  element: string;
  playerId?: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  fontSize: number;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const playerID = parseInt(req.query.playerID as string) || req.session.player?.id;
    if (!playerID) { res.status(401).end(); return; }

    const layouts = await prisma.portraitLayout.findMany({
      where: { player_id: playerID },
    });

    res.send({ layouts });
    return;
  }

  if (req.method === 'POST') {
    const { element, posX, posY, width, height, rotation, fontSize }: LayoutElement = req.body;
    const playerId = req.session.player?.id || parseInt(req.body.playerId as any);

    if (!playerId || !element) { res.status(400).end(); return; }

    const layout = await prisma.portraitLayout.upsert({
      where: {
        player_id_element: { player_id: playerId, element },
      },
      create: {
        player_id: playerId,
        element,
        posX: posX ?? 0,
        posY: posY ?? 0,
        width: width ?? 200,
        height: height ?? 200,
        rotation: rotation ?? 0,
        fontSize: fontSize ?? 48,
      },
      update: {
        posX: posX ?? 0,
        posY: posY ?? 0,
        width: width ?? 200,
        height: height ?? 200,
        rotation: rotation ?? 0,
        fontSize: fontSize ?? 48,
      },
    });

    broadcast('portraitLayoutChange', {
      playerId,
      element,
      posX: layout.posX,
      posY: layout.posY,
      width: layout.width,
      height: layout.height,
      rotation: layout.rotation,
      fontSize: layout.fontSize,
    });

    res.send({ layout });
    return;
  }

  res.status(404).end();
}

export default sessionAPI(handler);
