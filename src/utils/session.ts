import type { IronSessionOptions } from 'iron-session';
import { withIronSessionApiRoute, withIronSessionSsr } from 'iron-session/next';
import type { GetServerSidePropsContext, NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

export const cookieName = 'openrpg_session';

declare module 'iron-session' {
  interface IronSessionData {
    player?: {
      id: number;
      admin: boolean;
    };
  }
}

const sessionOptions: IronSessionOptions = {
  cookieName,
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: false,
  },
};

export function sessionAPI(handler: NextApiHandler) {
  return withIronSessionApiRoute(handler, sessionOptions);
}

export function sessionSSR(
  handler: (context: GetServerSidePropsContext) => Promise<any>
) {
  return withIronSessionSsr(handler, sessionOptions);
}
