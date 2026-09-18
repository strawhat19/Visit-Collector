import { createServer } from 'node:http';
import { API_BODY_LIMIT } from '../server/http';
import * as baseRoute from '../api/Piratechs/index';
import * as visitsRoute from '../api/Piratechs/visits';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiMethod = `GET` | `POST` | `OPTIONS`;
type ApiHandler = (request: Request) => Response | Promise<Response>;
type ApiRoute = Partial<Record<ApiMethod, ApiHandler>>;

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST?.trim() || `127.0.0.1`;
const routes = new Map<string, ApiRoute>([
  [`/api/Piratechs`, { GET: baseRoute.GET, OPTIONS: baseRoute.OPTIONS }],
  [`/api/Piratechs/visits`, { GET: visitsRoute.GET, POST: visitsRoute.POST, OPTIONS: visitsRoute.OPTIONS }],
]);

class BodyLimitError extends Error {}

const readBody = (request: IncomingMessage) => new Promise<string>((resolve, reject) => {
  let size = 0;
  let oversized = false;
  const chunks: Buffer[] = [];

  request.on(`data`, (chunk: Buffer) => {
    if (oversized) return;
    size += chunk.length;
    if (size > API_BODY_LIMIT) {
      oversized = true;
      chunks.length = 0;
      reject(new BodyLimitError());
      return;
    }
    chunks.push(chunk);
  });
  request.on(`error`, reject);
  request.on(`aborted`, () => reject(new Error(`Request Aborted`)));
  request.on(`end`, () => {
    if (!oversized) resolve(Buffer.concat(chunks).toString(`utf8`));
  });
});

const sendResponse = async (response: ServerResponse, result: Response) => {
  const body = await result.text();
  response.statusCode = result.status;
  result.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(body);
};

const sendError = (response: ServerResponse, status: number, error: string, allow?: string) => {
  response.statusCode = status;
  if (allow) response.setHeader(`Allow`, allow);
  response.setHeader(`Cache-Control`, `no-store`);
  response.setHeader(`Content-Type`, `application/json; charset=utf-8`);
  response.end(JSON.stringify({ error }));
};

const server = createServer(async (request, response) => {
  try {
    const method = request.method ?? `GET`;
    const url = new URL(request.url ?? `/`, `http://localhost`);
    const pathname = url.pathname.replace(/\/$/, ``);
    const route = routes.get(pathname);

    if (!route) {
      request.resume();
      sendError(response, 404, `Route Not Found`);
      return;
    }

    const allowedMethods = Object.keys(route);
    if (!allowedMethods.includes(method)) {
      request.resume();
      sendError(response, 405, `Method Not Allowed`, allowedMethods.join(`, `));
      return;
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
      else if (value !== undefined) headers.set(name, value);
    }

    const body = await readBody(request);
    const handler = route[method as ApiMethod]!;
    const webRequest = new Request(url, {
      method,
      headers,
      ...(method !== `GET` && body ? { body } : {}),
    });
    await sendResponse(response, await handler(webRequest));
  } catch (error) {
    if (response.destroyed || response.writableEnded) return;
    if (response.headersSent) {
      response.destroy();
      return;
    }
    const oversized = error instanceof BodyLimitError;
    sendError(response, oversized ? 413 : 500, oversized ? `Request Body Too Large` : `Internal Server Error`);
  }
});

let closing = false;
const shutdown = () => {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => server.closeAllConnections(), 5000);
  timeout.unref();
  server.close((error) => {
    clearTimeout(timeout);
    if (error) process.exitCode = 1;
  });
};

process.on(`SIGINT`, shutdown);
process.on(`SIGTERM`, shutdown);
server.on(`error`, (error) => {
  process.exitCode = 1;
  console.error(`API Server Error`, error.message);
});

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`API Port Must Be An Integer Between 1 And 65535`);
  process.exitCode = 1;
} else {
  server.listen(port, host, () => {
    const address = host.includes(`:`) ? `[${host}]` : host;
    console.log(`API Listening At http://${address}:${port}/api/Piratechs`);
  });
}
