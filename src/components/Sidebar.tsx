import Logo from './Logo';
import type { Palette } from '../ui/theme';
import { useId, useEffect, useRef } from 'react';
import { elementProps } from '../ui/elementProps';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Settings, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react-native';

type SidebarProps = {
  active: string;
  expanded: boolean;
  palette: Palette;
  onToggle: () => void;
  onSettings: () => void;
  reducedMotion: boolean;
  onNavigate: (value: string) => void;
  items: ReadonlyArray<{ value: string; title: string; icon: LucideIcon }>;
};

const Sidebar = ({ items, active, expanded, palette, reducedMotion, onToggle, onSettings, onNavigate }: SidebarProps) => {
  const scope = useId();
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: expanded ? 1 : 0, duration: reducedMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [expanded, progress, reducedMotion]);
  const labelStyle = { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] };
  const button = (title: string, Icon: LucideIcon, onPress: () => void, id: string, selected = false, toggle = false) => <Pressable {...elementProps(`sidebar-button`, `${scope}-${id}`)} key={id} onPress={onPress} accessibilityRole={`button`} aria-pressed={toggle ? undefined : selected} aria-expanded={toggle ? expanded : undefined} accessibilityState={{ selected, expanded: toggle ? expanded : undefined }} accessibilityLabel={toggle ? `${expanded ? `Collapse` : `Expand`} Sidebar` : title} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.65 : 1, backgroundColor: selected ? palette.selected : `transparent` }]}>
    <View {...elementProps(`sidebar-button-icon-wrap`, `${scope}-${id}`)} style={styles.icon}><Icon {...elementProps(`sidebar-button-icon`, `${scope}-${id}`)} size={22} strokeWidth={1.7} color={selected ? palette.blue : palette.muted} /></View>
    <Animated.Text {...elementProps(`sidebar-button-label`, `${scope}-${id}`)} accessible={false} numberOfLines={1} style={[styles.label, labelStyle, { color: selected ? palette.blue : palette.muted }]}>{title}</Animated.Text>
  </Pressable>;
  return <Animated.View {...elementProps(`sidebar`, scope)} testID={`sidebar`} style={[styles.sidebar, { borderColor: palette.border, backgroundColor: palette.rail, width: progress.interpolate({ inputRange: [0, 1], outputRange: [68, 236] }) }]}>
    <View {...elementProps(`sidebar-brand`, scope)} style={styles.brand}>
      <View {...elementProps(`sidebar-logo-wrap`, scope)} style={styles.icon}><Logo size={42} id={`${scope}-sidebar`} /></View>
      <Animated.Text {...elementProps(`sidebar-brand-label`, scope)} numberOfLines={1} accessibilityRole={`header`} accessibilityElementsHidden={!expanded} importantForAccessibility={expanded ? `auto` : `no-hide-descendants`} aria-hidden={!expanded} style={[styles.brandLabel, labelStyle, { color: palette.text }]}>Visit Collector</Animated.Text>
    </View>
    <View {...elementProps(`sidebar-navigation`, scope)} style={styles.navigation}>{items.map(({ value, title, icon }) => button(title, icon, () => onNavigate(value), value, value === active))}</View>
    <View {...elementProps(`sidebar-bottom`, scope)} style={styles.bottom}>
      {button(expanded ? `Collapse` : `Expand`, expanded ? PanelLeftClose : PanelLeftOpen, onToggle, `toggle`, false, true)}
      {button(`Settings`, Settings, onSettings, `settings`)}
    </View>
  </Animated.View>;
};

const styles = StyleSheet.create({
  navigation: { gap: 15, paddingTop: 14 },
  label: { width: 152, fontSize: 13, fontWeight: `500` },
  icon: { width: 44, flexShrink: 0, alignItems: `center` },
  bottom: { gap: 8, marginTop: `auto`, paddingBottom: 16 },
  sidebar: { borderRightWidth: 1, overflow: `hidden`, paddingHorizontal: 12 },
  brandLabel: { width: 160, fontSize: 20, fontWeight: `700`, marginLeft: 6, letterSpacing: -0.7 },
  brand: { height: 73, width: 212, flexDirection: `row`, alignItems: `center`, overflow: `hidden` },
  button: { height: 44, borderRadius: 8, overflow: `hidden`, flexDirection: `row`, alignItems: `center` },
});

export default Sidebar;
