import { VisitStoreError } from './visits';

export const API_BODY_LIMIT = 4 * 1024 * 1024;
const loopbackHosts = new Set([`localhost`, `127.0.0.1`, `[::1]`]);

const allowsOrigin = (request: Request, origin: string) => {
  try {
    const url = new URL(origin);
    const configured = process.env.API_ALLOWED_ORIGINS?.split(`,`).map(value => value.trim()) ?? [];
    return origin === new URL(request.url).origin || configured.includes(origin)
      || !process.env.VERCEL && [`http:`, `https:`].includes(url.protocol) && loopbackHosts.has(url.hostname);
  } catch {
    return false;
  }
};

export const readJson = async (request: Request): Promise<unknown> => {
  if (request.headers.get(`content-type`)?.split(`;`)?.[0]?.trim().toLowerCase() !== `application/json`) {
    throw new VisitStoreError(`Use Application/JSON`, 415);
  }
  if (Number(request.headers.get(`content-length`)) > API_BODY_LIMIT) throw new VisitStoreError(`Request Is Too Large`, 413);
  const body = await request.text();
  if (Buffer.byteLength(body) > API_BODY_LIMIT) throw new VisitStoreError(`Request Is Too Large`, 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new VisitStoreError(`Invalid JSON Body`, 400);
  }
};

export const apiRoute = async (request: Request, methods: string[], action: () => unknown | Promise<unknown>) => {
  const allow = [...methods, `OPTIONS`].join(`, `);
  const origin = request.headers.get(`origin`);
  const headers = new Headers({ Vary: `Origin`, Allow: allow, 'Cache-Control': `no-store`, 'X-Content-Type-Options': `nosniff` });
  if (origin && !allowsOrigin(request, origin)) return Response.json({ error: `Origin Is Not Allowed` }, { status: 403, headers });
  if (origin) headers.set(`Access-Control-Allow-Origin`, origin);
  headers.set(`Access-Control-Allow-Methods`, allow);
  headers.set(`Access-Control-Allow-Headers`, `Content-Type`);
  if (request.method === `OPTIONS`) return new Response(null, { status: 204, headers });
  if (!methods.includes(request.method)) return Response.json({ error: `Method Is Not Allowed` }, { status: 405, headers });
  try {
    return Response.json(await action(), { headers });
  } catch (error) {
    const status = error instanceof VisitStoreError ? error.status : 500;
    const message = error instanceof VisitStoreError ? error.message : `Unable To Complete API Request`;
    return Response.json({ error: message }, { status, headers });
  }
};
