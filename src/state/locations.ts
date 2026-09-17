import type { LocationInput, StoredCollector } from './types';

export const MAX_LOCATIONS = 100;
export const validateLocation = (input: LocationInput): LocationInput => {
  const name = typeof input.name === `string` ? input.name.trim() : ``;
  if (name.length < 2 || name.length > 80) throw new Error(`Use A Location Name Between 2 And 80 Characters`);
  if (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) throw new Error(`Latitude Must Be Between -90 And 90`);
  if (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180) throw new Error(`Longitude Must Be Between -180 And 180`);
  return { name, latitude: input.latitude, longitude: input.longitude };
};
export const saveLocation = (record: StoredCollector, input: LocationInput, sessionId: string, createId: () => string, now: number) => {
  const location = validateLocation(input);
  const ownerKey = record.userId ?? `guest-device`;
  let saved = record.locations.find(candidate => candidate.ownerKey === ownerKey && candidate.name.toLowerCase() === location.name.toLowerCase()
    && candidate.latitude === location.latitude && candidate.longitude === location.longitude);
  if (!saved) {
    if (record.locations.length >= MAX_LOCATIONS) throw new Error(`This Device Has Reached Its Saved Location Limit`);
    saved = { ...location, ownerKey, id: `Location_${createId()}`, createdAt: now };
    record.locations.push(saved);
  }
  record.locationAssignments[ownerKey] = saved.id;
  const session = record.sessions.find(candidate => candidate.id === sessionId && candidate.visitorKey === ownerKey);
  if (session) {
    session.countryCode = saved.id;
    record.activity.forEach(event => { if (event.sessionId === session.id) event.countryCode = saved.id; });
  }
  return saved.id;
};
