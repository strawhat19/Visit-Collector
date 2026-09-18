import type { VisitMetadata } from './visitMetadata';
import { normalizeVisitMetadata } from './visitMetadata';
import { Appearance, Dimensions, Platform } from 'react-native';

type BrowserNavigator = Navigator & {
  deviceMemory?: number;
  globalPrivacyControl?: boolean;
  connection?: { rtt?: number; downlink?: number; saveData?: boolean; effectiveType?: string };
};

const safely = <T>(read: () => T): T | undefined => {
  try { return read(); } catch { return undefined; }
};

const version = (userAgent: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = userAgent.match(pattern)?.[1];
    if (match) return match.replace(/_/g, `.`);
  }
  return undefined;
};

const elapsed = (end?: number, start = 0) => typeof end === `number` && end > 0 && end >= start ? end - start : undefined;
const media = (query: string) => safely(() => typeof window !== `undefined` && typeof window.matchMedia === `function` ? window.matchMedia(query).matches : undefined);

const collectPerformance = (): VisitMetadata[`performance`] => {
  if (typeof window === `undefined` || typeof window.performance?.getEntriesByType !== `function`) return undefined;
  const navigation = safely(() => window.performance.getEntriesByType(`navigation`)?.[0] as PerformanceNavigationTiming | undefined);
  const paint = safely(() => window.performance.getEntriesByType(`paint`));
  return {
    navigationType: navigation?.type,
    transferBytes: navigation?.transferSize,
    encodedBodyBytes: navigation?.encodedBodySize,
    decodedBodyBytes: navigation?.decodedBodySize,
    loadMs: elapsed(navigation?.loadEventEnd, navigation?.startTime),
    ttfbMs: elapsed(navigation?.responseStart, navigation?.startTime),
    firstPaintMs: paint?.find(entry => entry.name === `first-paint`)?.startTime,
    responseMs: elapsed(navigation?.responseEnd, navigation?.responseStart),
    domInteractiveMs: elapsed(navigation?.domInteractive, navigation?.startTime),
    dnsMs: elapsed(navigation?.domainLookupEnd, navigation?.domainLookupStart),
    domContentLoadedMs: elapsed(navigation?.domContentLoadedEventEnd, navigation?.startTime),
    firstContentfulPaintMs: paint?.find(entry => entry.name === `first-contentful-paint`)?.startTime,
    tlsMs: navigation?.secureConnectionStart ? elapsed(navigation.connectEnd, navigation.secureConnectionStart) : undefined,
    tcpMs: elapsed(navigation?.secureConnectionStart || navigation?.connectEnd, navigation?.connectStart),
  };
};

const collectPage = (): VisitMetadata[`page`] => {
  if (typeof window === `undefined` || typeof document === `undefined`) return undefined;
  const url = safely(() => new URL(window.location.href));
  return {
    origin: url?.origin,
    entryPath: url?.pathname,
    title: safely(() => document.title),
    referrer: safely(() => document.referrer),
    utm: {
      id: url?.searchParams.get(`utm_id`) ?? undefined,
      term: url?.searchParams.get(`utm_term`) ?? undefined,
      source: url?.searchParams.get(`utm_source`) ?? undefined,
      medium: url?.searchParams.get(`utm_medium`) ?? undefined,
      content: url?.searchParams.get(`utm_content`) ?? undefined,
      campaign: url?.searchParams.get(`utm_campaign`) ?? undefined,
    },
  };
};

export const collectVisitMetadata = (): VisitMetadata => {
  const capturedAt = Date.now();
  const web = Platform.OS === `web` && typeof window !== `undefined`;
  const navigator = web ? safely(() => window.navigator as BrowserNavigator) : undefined;
  const screen = web ? safely(() => window.screen) : undefined;
  const viewport = !web ? safely(() => Dimensions.get(`window`)) : undefined;
  const nativeScreen = !web ? safely(() => Dimensions.get(`screen`)) : undefined;
  const connection = safely(() => navigator?.connection);
  const userAgent = safely(() => navigator?.userAgent);
  const intl = safely(() => Intl.DateTimeFormat().resolvedOptions());
  const doNotTrack = safely(() => navigator?.doNotTrack);
  const metadata: VisitMetadata = {
    capturedAt,
    page: web ? safely(collectPage) : undefined,
    performance: web ? safely(collectPerformance) : undefined,
    locale: {
      timeZone: intl?.timeZone,
      offsetMinutes: new Date(capturedAt).getTimezoneOffset(),
    },
    hardware: web ? {
      cores: safely(() => navigator?.hardwareConcurrency),
      touchPoints: safely(() => navigator?.maxTouchPoints),
      approximateMemoryGb: safely(() => navigator?.deviceMemory),
    } : undefined,
    connection: web ? {
      rtt: safely(() => connection?.rtt),
      online: safely(() => navigator?.onLine),
      saveData: safely(() => connection?.saveData),
      downlink: safely(() => connection?.downlink),
      effectiveType: safely(() => connection?.effectiveType),
    } : undefined,
    preferences: {
      reducedMotion: web ? media(`(prefers-reduced-motion: reduce)`) : undefined,
      globalPrivacyControl: safely(() => navigator?.globalPrivacyControl),
      doNotTrack: doNotTrack === `1` || doNotTrack === `yes` ? true : doNotTrack === `0` || doNotTrack === `no` ? false : undefined,
      colorScheme: web ? media(`(prefers-color-scheme: dark)`) ? `dark` : media(`(prefers-color-scheme: light)`) ? `light` : undefined : safely(() => Appearance.getColorScheme()) ?? undefined,
      contrast: web ? media(`(prefers-contrast: more)`) ? `more` : media(`(prefers-contrast: less)`) ? `less` : media(`(prefers-contrast: custom)`) ? `custom` : media(`(prefers-contrast: no-preference)`) ? `no-preference` : undefined : undefined,
    },
    client: {
      userAgent,
      platform: Platform.OS,
      language: safely(() => navigator?.language) ?? intl?.locale,
      languages: safely(() => navigator?.languages ? Array.from(navigator.languages) : undefined) ?? (intl?.locale ? [intl.locale] : undefined),
      osVersion: web ? version(userAgent ?? ``, [/Android ([\d.]+)/i, /(?:iPhone OS|CPU OS) ([\d_]+)/i, /Windows NT ([\d.]+)/i, /Mac OS X ([\d_]+)/i]) : Platform.OS === `web` ? undefined : safely(() => Platform.OS === `android` ? Platform.constants.Release : `${Platform.Version}`),
      browserVersion: web ? version(userAgent ?? ``, [/(?:Edg|EdgA|EdgiOS)\/([\d.]+)/i, /(?:OPR|OPiOS)\/([\d.]+)/i, /SamsungBrowser\/([\d.]+)/i, /(?:Firefox|FxiOS)\/([\d.]+)/i, /(?:Chrome|CriOS)\/([\d.]+)/i, /Version\/([\d.]+)/i]) : undefined,
    },
    display: {
      fontScale: viewport?.fontScale,
      colorDepth: safely(() => screen?.colorDepth),
      pixelDepth: safely(() => screen?.pixelDepth),
      availableWidth: safely(() => screen?.availWidth),
      availableHeight: safely(() => screen?.availHeight),
      screenWidth: safely(() => screen?.width) ?? nativeScreen?.width,
      screenHeight: safely(() => screen?.height) ?? nativeScreen?.height,
      pixelRatio: web ? safely(() => window.devicePixelRatio) : viewport?.scale,
      viewportWidth: web ? safely(() => window.innerWidth) : viewport?.width,
      viewportHeight: web ? safely(() => window.innerHeight) : viewport?.height,
      orientation: web ? safely(() => screen?.orientation?.type) : viewport ? viewport.width > viewport.height ? `landscape` : `portrait` : undefined,
    },
    capabilities: web ? {
      cookies: safely(() => navigator?.cookieEnabled),
      secureContext: safely(() => window.isSecureContext),
      websocket: safely(() => typeof window.WebSocket === `function`),
      notifications: safely(() => typeof window.Notification === `function`),
      serviceWorker: safely(() => navigator ? `serviceWorker` in navigator : undefined),
      vibration: safely(() => navigator ? typeof navigator.vibrate === `function` : undefined),
      geolocation: safely(() => navigator ? `geolocation` in navigator : undefined),
      touch: safely(() => navigator ? navigator.maxTouchPoints > 0 || `ontouchstart` in window : undefined),
    } : { websocket: safely(() => typeof WebSocket === `function`) },
  };
  return normalizeVisitMetadata(metadata) ?? { capturedAt };
};
