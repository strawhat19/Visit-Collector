import Logo from './Logo';
import { useEffect, useRef } from 'react';
import type { Palette } from '../ui/theme';
import { elementProps } from '../ui/elementProps';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

type HeaderBrandProps = { mobile: boolean; narrow: boolean; expanded: boolean; palette: Palette; reducedMotion: boolean };

const HeaderBrand = ({ mobile, narrow, expanded, palette, reducedMotion }: HeaderBrandProps) => {
  const visible = mobile || !expanded;
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: visible ? 1 : 0, duration: reducedMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, visible]);

  return <Animated.View {...elementProps(`header-brand`)} aria-hidden={!visible} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? `auto` : `no-hide-descendants`} style={[styles.brand, { opacity: progress, width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, mobile ? narrow ? 174 : 190 : 190] }) }]}>
    {mobile && <Logo id={`header-brand-logo`} size={29} />}
    <Text {...elementProps(`header-brand-name`)} numberOfLines={1} style={[styles.name, { color: palette.text, fontSize: mobile ? narrow ? 18 : 20 : 23 }]}>Visit Collector</Text>
  </Animated.View>;
};

const styles = StyleSheet.create({
  name: { flexShrink: 1, fontWeight: `700`, letterSpacing: -0.8 },
  brand: { gap: 7, height: 31, flexShrink: 1, overflow: `hidden`, alignItems: `center`, flexDirection: `row` },
});

export default HeaderBrand;
