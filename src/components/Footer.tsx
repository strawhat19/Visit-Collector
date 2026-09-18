import type { Palette } from '../ui/theme';
import { useEffect, useState } from 'react';
import { elementProps } from '../ui/elementProps';
import { Clock3, ExternalLink } from 'lucide-react-native';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type FooterProps = { mobile: boolean; palette: Palette; onError: (message: string) => void };
const piratechsUrl = `https://piratechs.com/`;
export const footerHeight = { web: 36, mobile: 48 };

const Footer = ({ palette, mobile, onError }: FooterProps) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(timer);
  }, []);
  const clock = now.toLocaleTimeString([], { hour: `2-digit`, minute: `2-digit`, second: `2-digit` });
  const date = now.toLocaleDateString([], { day: `numeric`, month: `short`, weekday: `short`, year: `numeric` });
  const openPiratechs = () => { void Linking.openURL(piratechsUrl).catch(() => onError(`Unable To Open Piratechs`)); };
  const linkProps = Platform.OS === `web` ? { href: piratechsUrl, hrefAttrs: { target: `_blank`, rel: `noopener noreferrer` } } : { onPress: openPiratechs };

  return (
    <View
      {...elementProps(`app-footer`)}
      style={[styles.footer, { borderColor: palette.border, backgroundColor: palette.rail }, mobile && styles.mobile]}
    >
      <View
        {...elementProps(`footer-clock`)}
        accessibilityLabel={`Local Date And Time ${date}, ${clock}`}
        style={styles.clock}
      >
        <Clock3
          {...elementProps(`footer-clock-icon`)}
          size={12}
          color={palette.blue}
        />
        <View
          {...elementProps(`footer-date-time`)}
          style={[styles.dateTime, mobile && styles.mobileDateTime]}
        >
          <Text
            {...elementProps(`footer-date-value`)}
            numberOfLines={1}
            style={[styles.time, { color: palette.muted }]}
          >
            {date}{mobile ? `` : ` ·`}
          </Text>
          <Text
            {...elementProps(`footer-clock-value`)}
            numberOfLines={1}
            style={[styles.time, { color: palette.muted }]}
          >
            {clock}
          </Text>
        </View>
      </View>
      <View
        {...elementProps(`footer-copyright`)}
        style={styles.copyright}
      >
        <Text
          {...elementProps(`footer-copyright-year`)}
          style={[styles.text, { color: palette.muted }]}
        >
          © {now.getFullYear()}
        </Text>
        <Pressable
          {...elementProps(`footer-piratechs-link`)}
          {...linkProps}
          hitSlop={6}
          accessibilityRole={`link`}
          accessibilityLabel={`Piratechs Website`}
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Text
            {...elementProps(`footer-piratechs-label`)}
            style={[styles.text, { color: palette.blue }]}
          >
            Piratechs
          </Text>
          <ExternalLink
            {...elementProps(`footer-piratechs-icon`)}
            size={11}
            color={palette.blue}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  text: { fontSize: 11 },
  dateTime: { gap: 4, flexDirection: `row` },
  mobileDateTime: { gap: 0, flexDirection: `column` },
  mobile: { minHeight: footerHeight.mobile, paddingHorizontal: 12 },
  copyright: { gap: 5, alignItems: `center`, flexDirection: `row` },
  time: { fontSize: 11, lineHeight: 14, fontVariant: [`tabular-nums`] },
  clock: { gap: 6, minWidth: 0, alignItems: `center`, flexDirection: `row` },
  link: { gap: 4, minHeight: 32, alignItems: `center`, flexDirection: `row` },
  footer: { gap: 8, flexShrink: 0, borderTopWidth: 1, minHeight: footerHeight.web, paddingHorizontal: 24, alignItems: `center`, flexDirection: `row`, justifyContent: `space-between` },
});

export default Footer;
