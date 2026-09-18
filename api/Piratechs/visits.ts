import { apiRoute, readJson } from '../../server/http';
import { readVisits, saveVisits, parseVisitSnapshot } from '../../server/visits';

const methods = [`GET`, `POST`];

export const GET = (request: Request) => apiRoute(request, methods, readVisits);
export const POST = (request: Request) => apiRoute(request, methods, async () => {
  const snapshot = parseVisitSnapshot(await readJson(request));
  return saveVisits(snapshot);
});
export const OPTIONS = (request: Request) => apiRoute(request, methods, () => null);
