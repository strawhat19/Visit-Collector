import { useId } from 'react';
import Svg, { Path } from 'react-native-svg';
import { elementProps } from '../ui/elementProps';

const iconPaths: Record<string, string> = {
  edge: `M20 15c-2 5-11 6-15 1C0 9 6 2 13 3c5 0 8 4 8 8 0 4-6 6-10 3-2-2-1-5 2-5 3 0 4 3 2 4H8c-2 4 6 7 12 2Z`,
  apple: `M15 7c-2 0-3 1-3 1s-2-1-4-1C3 7 3 13 5 17c2 4 3 5 5 4l2-1 2 1c2 1 4-1 6-5-4-2-4-5-1-7-1-1-2-2-4-2ZM12 6c0-3 2-4 5-4 0 3-2 4-5 4Z`,
  opera: `M12 3a8 9 0 1 0 0 18 8 9 0 1 0 0-18Zm0 0c-7 0-7 18 0 18s7-18 0-18Z`,
  linux: `M8 10V7a4 4 0 0 1 8 0v3l3 6-2 3H7l-2-3 3-6ZM10 7h.01M14 7h.01M10 10l2 2 2-2-2-1-2 1ZM9 13l-1 4m7-4 1 4M7 18l-3 3h6v-2m7-1 3 3h-6v-2`,
  chrome: `M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 8h8M8.5 14l-4-7M15.5 14l-4 7`,
  safari: `M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-2 6-6 2 2-6 6-2ZM10 10l4 4M12 5v1m0 12v1M5 12h1m12 0h1`,
  mobile: `M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM10 5h4M11 19h2`,
  tablet: `M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 19h2`,
  android: `M7 7 5 4m12 3 2-3M6 11a6 6 0 0 1 12 0H6Zm0 0v7h12v-7M9 18v3m6-3v3M3 12v5m18-5v5M9 8h.01M15 8h.01`,
  desktop: `M4 3h16a2 2 0 0 1 2 2v11H2V5a2 2 0 0 1 2-2ZM9 16v5m6-5v5M6 21h12`,
  firefox: `M5 6 4 2l5 4c2-1 4-1 6 0l2-4 1 6c6 4 2 13-6 13-7 0-11-7-8-12l1-3Zm0 0 5 4-3 2 4 3c3 1 5-1 6-3 2 5-4 9-9 6`,
  windows: `M3 5 11 4v7H3V5Zm10-1 8-1v8h-8V4ZM3 13h8v7l-8-1v-6Zm10 0h8v8l-8-1v-7Z`,
  unknown: `M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01`,
  nativeapp: `M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM7 7h3v3H7V7Zm7 0h3v3h-3V7ZM7 14h3v3H7v-3Zm7 0h3v3h-3v-3Z`,
  windowsphone: `M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM9 8l6-1v8l-6-1V8Zm3 0v6m-3-3h6M11 19h2`,
  samsunginternet: `M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM9 6C1 5 0 8 6 13c5 5 14 7 16 5 1-2-1-5-5-8`,
  globe: `M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z`,
};

const iconAliases: Record<string, string> = {
  ios: `apple`,
  mac: `apple`,
  ipados: `apple`,
  macos: `apple`,
  iphone: `mobile`,
  ipad: `tablet`,
  laptop: `desktop`,
  chromeos: `chrome`,
  microsoftedge: `edge`,
  googlechrome: `chrome`,
  mozillafirefox: `firefox`,
};

const PlatformIcon = ({ name, color, size = 18 }: { name: string; color: string; size?: number }) => {
  const scope = useId();
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, ``);
  const iconName = iconAliases[normalizedName] ?? normalizedName;
  const path = iconPaths[iconName] ?? iconPaths.globe;
  return (
    <Svg
      fill={`none`}
      width={size}
      height={size}
      stroke={color}
      strokeWidth={1.7}
      viewBox={`0 0 24 24`}
      accessible={false}
      strokeLinecap={`round`}
      strokeLinejoin={`round`}
      {...elementProps(`platform-icon`, `${scope}-${normalizedName}`)}
    >
      <Path
        d={path}
        {...elementProps(`platform-icon-shape`, `${scope}-${normalizedName}`)}
      />
    </Svg>
  );
};

export default PlatformIcon;
