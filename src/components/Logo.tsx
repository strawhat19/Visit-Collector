import { useId, useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { elementProps } from '../ui/elementProps';

const logoXml = (scope: string) => `<svg id="${scope}" class="visit-collector-logo" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="215 215 545 595">
<title id="${scope}-title" class="logo-title">Visit Collector — Wide interlock</title>
<desc id="${scope}-description" class="logo-description">A three-color interlocking V and C in blue, green, and red</desc>
<defs id="${scope}-definitions" class="logo-definitions">
<clipPath id="${scope}-left-arm" class="logo-left-arm-clip"><polygon id="${scope}-left-arm-polygon" class="logo-left-arm-polygon" points="-100.000000000,-100.000000000 966.737384303,-100.000000000 81.918107194,1124.000000000 -100.000000000,1124.000000000"/></clipPath>
<clipPath id="${scope}-right-arm" class="logo-right-arm-clip"><polygon id="${scope}-right-arm-polygon" class="logo-right-arm-polygon" points="57.262615697,-100.000000000 1124.000000000,-100.000000000 1124.000000000,1124.000000000 942.081892806,1124.000000000"/></clipPath>
<clipPath id="${scope}-diagonal-junction" class="logo-diagonal-clip"><polygon id="${scope}-diagonal-polygon" class="logo-diagonal-polygon" points="512.000000000,555.116938654 923.240767238,1124.000000000 100.759232762,1124.000000000"/></clipPath>
</defs>
<g id="${scope}-outer-c" class="logo-outer-c">
<circle id="${scope}-red-end" class="logo-red-end" cx="697.78620637" cy="344.71734841" r="32.0" fill="#E44747"/>
<circle id="${scope}-green-end" class="logo-green-end" cx="697.78620637" cy="679.28265159" r="32.0" fill="#159A63"/>
<path id="${scope}-red-arc" class="logo-red-arc" d="M697.78620637 344.71734841A250 250 0 0 0 340.70425242 329.90725753" fill="none" stroke="#E44747" stroke-width="64"/>
<path id="${scope}-blue-arc" class="logo-blue-arc" d="M329.90725753 340.70425242A250 250 0 0 0 329.90725753 683.29574758" fill="none" stroke="#2563EB" stroke-width="64"/>
<path id="${scope}-green-arc" class="logo-green-arc" d="M340.70425242 694.09274247A250 250 0 0 0 697.78620637 679.28265159" fill="none" stroke="#159A63" stroke-width="64"/>
</g>
<g id="${scope}-inner-v" class="logo-inner-v" transform="translate(0 16)">
<path id="${scope}-green-arm" class="logo-green-arm" d="M392 429L512 595L632 429" fill="none" stroke="#159A63" stroke-width="62" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${scope}-left-arm)"/>
<path id="${scope}-blue-arm" class="logo-blue-arm" d="M392 429L512 595L632 429" fill="none" stroke="#2563EB" stroke-width="62" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${scope}-right-arm)"/>
<path id="${scope}-red-junction" class="logo-red-junction" d="M392 429L512 595L632 429" fill="none" stroke="#E44747" stroke-width="62" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${scope}-diagonal-junction)"/>
</g>
</svg>`;

const Logo = ({ id, size = 36 }: { id?: string; size?: number }) => {
  const generatedId = useId();
  const scope = (id ?? generatedId).replace(/[^a-zA-Z0-9_-]/g, ``) || generatedId.replace(/[^a-zA-Z0-9_-]/g, ``);
  const xml = useMemo(() => logoXml(`visit-collector-logo-${scope}`), [scope]);
  return <SvgXml {...elementProps(`visit-collector-logo`, scope)} xml={xml} width={size} height={size} accessibilityLabel={`Visit Collector Logo`} />;
};

export default Logo;
