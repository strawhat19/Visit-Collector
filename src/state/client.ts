export const detectWebClient = (agent: string, maxTouchPoints = 0) => {
  const tablet = /iPad|Tablet/i.test(agent) || /Macintosh/i.test(agent) && maxTouchPoints > 1 || /Android/i.test(agent) && !/Mobile/i.test(agent);
  const device = tablet ? `Tablet` : /Mobi|Android|iPhone|iPod/i.test(agent) ? `Mobile` : `Desktop`;
  const browser = /Edg(?:e|A|iOS)?\//i.test(agent) ? `Edge` : /OPR\/|OPiOS\/|Opera/i.test(agent) ? `Opera`
    : /SamsungBrowser\//i.test(agent) ? `Samsung Internet` : /Firefox\/|FxiOS\//i.test(agent) ? `Firefox`
      : /Chrome\/|CriOS\//i.test(agent) ? `Chrome` : /Safari\//i.test(agent) ? `Safari` : `Unknown`;
  const operatingSystem = /Windows Phone/i.test(agent) ? `Windows Phone` : /Android/i.test(agent) ? `Android`
    : /iPad/i.test(agent) || /Macintosh/i.test(agent) && maxTouchPoints > 1 ? `iPadOS`
      : /iPhone|iPod/i.test(agent) ? `iOS` : /CrOS/i.test(agent) ? `ChromeOS` : /Windows/i.test(agent) ? `Windows`
        : /Macintosh|Mac OS X/i.test(agent) ? `macOS` : /Linux/i.test(agent) ? `Linux` : `Unknown`;
  return { device, browser, operatingSystem };
};
