export type VisitMetadata = {
  capturedAt: number;
  client?: { platform?: string; language?: string; languages?: string[]; userAgent?: string; osVersion?: string; browserVersion?: string };
  locale?: { timeZone?: string; offsetMinutes?: number };
  display?: {
    pixelRatio?: number;
    fontScale?: number;
    colorDepth?: number;
    pixelDepth?: number;
    orientation?: string;
    screenWidth?: number;
    screenHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    availableWidth?: number;
    availableHeight?: number;
  };
  preferences?: { colorScheme?: `light` | `dark`; contrast?: `more` | `less` | `custom` | `no-preference`; reducedMotion?: boolean; doNotTrack?: boolean; globalPrivacyControl?: boolean };
  connection?: { online?: boolean; rtt?: number; downlink?: number; saveData?: boolean; effectiveType?: string };
  hardware?: { cores?: number; touchPoints?: number; approximateMemoryGb?: number };
  page?: {
    title?: string;
    origin?: string;
    entryPath?: string;
    referrer?: string;
    utm?: { id?: string; term?: string; source?: string; medium?: string; content?: string; campaign?: string };
  };
  performance?: {
    dnsMs?: number;
    tcpMs?: number;
    tlsMs?: number;
    ttfbMs?: number;
    loadMs?: number;
    responseMs?: number;
    firstPaintMs?: number;
    transferBytes?: number;
    navigationType?: string;
    domInteractiveMs?: number;
    encodedBodyBytes?: number;
    decodedBodyBytes?: number;
    domContentLoadedMs?: number;
    firstContentfulPaintMs?: number;
  };
  capabilities?: {
    touch?: boolean;
    cookies?: boolean;
    vibration?: boolean;
    websocket?: boolean;
    geolocation?: boolean;
    notifications?: boolean;
    secureContext?: boolean;
    serviceWorker?: boolean;
  };
};

const object = (value: unknown): Record<string, unknown> => value && typeof value === `object` && !Array.isArray(value) ? value as Record<string, unknown> : {};
const bool = (value: unknown) => typeof value === `boolean` ? value : undefined;
const text = (value: unknown, limit: number) => typeof value === `string` ? value.replace(/[\u0000-\u001f\u007f]/g, ``).trim().slice(0, limit) || undefined : undefined;
const number = (value: unknown, maximum: number, minimum = 0) => typeof value === `number` && Number.isFinite(value) && value >= minimum && value <= maximum ? Math.round(value * 1000) / 1000 : undefined;
const choice = <T extends string>(value: unknown, options: readonly T[]) => typeof value === `string` && options.includes(value as T) ? value as T : undefined;
const compact = <T extends object>(value: T): T | undefined => {
  for (const key of Object.keys(value) as Array<keyof T>) if (value[key] === undefined) delete value[key];
  return Object.keys(value).length ? value : undefined;
};

export const normalizeVisitPath = (value: unknown): string | undefined => {
  if (typeof value !== `string` || !value.startsWith(`/`) || value.startsWith(`//`) || /[\u0000-\u001f\u007f\\]/.test(value)) return undefined;
  return text(value.split(/[?#]/, 1)?.[0], 384);
};

const address = (value: unknown, includePath = false) => {
  if (typeof value !== `string` || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== `http:` && url.protocol !== `https:`) return undefined;
    return text(`${url.origin}${includePath ? url.pathname : ``}`, includePath ? 384 : 192);
  } catch { return undefined; }
};

const serializedBytes = (value: VisitMetadata) => {
  let bytes = 0;
  for (const character of JSON.stringify(value)) {
    const code = character.codePointAt(0) ?? 0;
    bytes += code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4;
  }
  return bytes;
};

export const normalizeVisitMetadata = (value: unknown): VisitMetadata | undefined => {
  const input = object(value);
  const capturedAt = number(input.capturedAt, 8640000000000000);
  if (capturedAt === undefined) return undefined;
  const page = object(input.page);
  const utm = object(page.utm);
  const client = object(input.client);
  const locale = object(input.locale);
  const display = object(input.display);
  const hardware = object(input.hardware);
  const connection = object(input.connection);
  const performance = object(input.performance);
  const preferences = object(input.preferences);
  const capabilities = object(input.capabilities);
  const result: VisitMetadata = { capturedAt };
  result.client = compact({
    platform: text(client.platform, 32),
    language: text(client.language, 35),
    osVersion: text(client.osVersion, 40),
    userAgent: text(client.userAgent, 384),
    browserVersion: text(client.browserVersion, 40),
    languages: Array.isArray(client.languages) ? client.languages.slice(0, 5).map(value => text(value, 35)).filter((value): value is string => Boolean(value)) : undefined,
  });
  result.locale = compact({
    timeZone: text(locale.timeZone, 80),
    offsetMinutes: number(locale.offsetMinutes, 840, -840),
  });
  result.display = compact({
    fontScale: number(display.fontScale, 20),
    pixelRatio: number(display.pixelRatio, 20),
    colorDepth: number(display.colorDepth, 128),
    pixelDepth: number(display.pixelDepth, 128),
    orientation: text(display.orientation, 32),
    screenWidth: number(display.screenWidth, 100000),
    screenHeight: number(display.screenHeight, 100000),
    viewportWidth: number(display.viewportWidth, 100000),
    viewportHeight: number(display.viewportHeight, 100000),
    availableWidth: number(display.availableWidth, 100000),
    availableHeight: number(display.availableHeight, 100000),
  });
  result.hardware = compact({
    cores: number(hardware.cores, 1024),
    touchPoints: number(hardware.touchPoints, 100),
    approximateMemoryGb: number(hardware.approximateMemoryGb, 1024),
  });
  result.connection = compact({
    rtt: number(connection.rtt, 120000),
    online: bool(connection.online),
    saveData: bool(connection.saveData),
    downlink: number(connection.downlink, 100000),
    effectiveType: choice(connection.effectiveType, [`slow-2g`, `2g`, `3g`, `4g`]),
  });
  result.preferences = compact({
    doNotTrack: bool(preferences.doNotTrack),
    reducedMotion: bool(preferences.reducedMotion),
    globalPrivacyControl: bool(preferences.globalPrivacyControl),
    colorScheme: choice(preferences.colorScheme, [`light`, `dark`]),
    contrast: choice(preferences.contrast, [`more`, `less`, `custom`, `no-preference`]),
  });
  result.page = compact({
    title: text(page.title, 120),
    origin: address(page.origin),
    referrer: address(page.referrer, true),
    entryPath: normalizeVisitPath(page.entryPath),
    utm: compact({
      id: text(utm.id, 80),
      term: text(utm.term, 80),
      source: text(utm.source, 80),
      medium: text(utm.medium, 80),
      content: text(utm.content, 80),
      campaign: text(utm.campaign, 80),
    }),
  });
  result.performance = compact({
    dnsMs: number(performance.dnsMs, 3600000),
    tcpMs: number(performance.tcpMs, 3600000),
    tlsMs: number(performance.tlsMs, 3600000),
    ttfbMs: number(performance.ttfbMs, 3600000),
    loadMs: number(performance.loadMs, 3600000),
    responseMs: number(performance.responseMs, 3600000),
    firstPaintMs: number(performance.firstPaintMs, 3600000),
    transferBytes: number(performance.transferBytes, 1073741824),
    domInteractiveMs: number(performance.domInteractiveMs, 3600000),
    encodedBodyBytes: number(performance.encodedBodyBytes, 1073741824),
    decodedBodyBytes: number(performance.decodedBodyBytes, 1073741824),
    domContentLoadedMs: number(performance.domContentLoadedMs, 3600000),
    firstContentfulPaintMs: number(performance.firstContentfulPaintMs, 3600000),
    navigationType: choice(performance.navigationType, [`navigate`, `reload`, `back_forward`, `prerender`]),
  });
  result.capabilities = compact({
    touch: bool(capabilities.touch),
    cookies: bool(capabilities.cookies),
    vibration: bool(capabilities.vibration),
    websocket: bool(capabilities.websocket),
    geolocation: bool(capabilities.geolocation),
    notifications: bool(capabilities.notifications),
    secureContext: bool(capabilities.secureContext),
    serviceWorker: bool(capabilities.serviceWorker),
  });
  compact(result);
  return serializedBytes(result) <= 5120 ? result : undefined;
};
