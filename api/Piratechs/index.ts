import { apiRoute } from '../../server/http';

export const GET = (request: Request) => apiRoute(request, [`GET`], () => ({
  name: `Piratechs`,
  storage: `Local JSON`,
  visits: `/api/Piratechs/visits`,
}));

export const OPTIONS = (request: Request) => apiRoute(request, [`GET`], () => null);
