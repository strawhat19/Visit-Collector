import type { Palette } from './theme';
import { elementProps } from './elementProps';
import { useId, type ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type ElementIdentity = { id?: string; className?: string };

export const IconButton = ({ id, className, icon: Icon, label, onPress, palette, active, disabled = false, small = false }: ElementIdentity & {
  icon: LucideIcon; label: string; palette: Palette; active?: boolean; small?: boolean; disabled?: boolean; onPress: () => void;
}) => {
  const scope = useId();
  const identity = id ?? scope;
  return <Pressable {...elementProps(className ?? `icon-button`, identity)} disabled={disabled} onPress={onPress} accessibilityRole={`button`} accessibilityLabel={label} aria-pressed={active} aria-disabled={disabled} accessibilityState={{ disabled, selected: active }}
    style={({ pressed }) => [ui.iconButton, small && { width: 36, height: 36 }, { opacity: disabled ? 0.35 : pressed ? 0.65 : 1, backgroundColor: active ? palette.selected : `transparent` }]}>
    <Icon {...elementProps(`icon-button-symbol`, identity)} size={small ? 18 : 21} strokeWidth={1.7} color={active ? palette.blue : palette.muted} />
  </Pressable>;
};

export const Card = ({ id, className, children, palette, style, testID }: ElementIdentity & { testID?: string; palette: Palette; children: ReactNode; style?: StyleProp<ViewStyle> }) => {
  const scope = useId();
  return <View {...elementProps(className ?? `dashboard-card`, id ?? scope)} testID={testID ?? `card`} style={[ui.card, { borderColor: palette.border, backgroundColor: palette.card }, style]}>{children}</View>;
};

export const Segmented = <T extends string,>({ id, className, options, value, onChange, palette, small = false, stretch = false }: ElementIdentity & {
  value: T; small?: boolean; palette: Palette; stretch?: boolean; onChange: (value: T) => void; options: Array<{ value: T; label: string; icon?: LucideIcon }>;
}) => {
  const scope = useId();
  const identity = id ?? scope;
  return <View {...elementProps(className ?? `segmented-tabs`, identity)} accessibilityRole={`tablist`} style={[ui.segmented, stretch && { width: `100%`, alignSelf: `stretch` }, { borderColor: palette.border, backgroundColor: palette.bg }]}>
    {options.map(({ value: optionValue, label, icon: Icon }) => <Pressable key={optionValue} {...elementProps(`segmented-tab`, `${identity}-${optionValue}`)} accessibilityRole={`tab`} accessibilityLabel={label} aria-selected={value === optionValue} accessibilityState={{ selected: value === optionValue }} onPress={() => onChange(optionValue)}
      style={[ui.segment, small && { minHeight: 34, paddingHorizontal: 15 }, stretch && { flex: 1, minWidth: 0, paddingHorizontal: 8 }, { backgroundColor: value === optionValue ? palette.selected : `transparent` }]}>
      {Icon && <Icon {...elementProps(`segmented-tab-icon`, `${identity}-${optionValue}`)} size={15} strokeWidth={1.8} color={value === optionValue ? palette.blue : palette.muted} />}
      <Text {...elementProps(`segmented-tab-label`, `${identity}-${optionValue}`)} style={[ui.segmentText, { color: value === optionValue ? palette.blue : palette.muted }]}>{label}</Text>
    </Pressable>)}
  </View>;
};

export const StatusBadge = ({ id, className, palette, demo = false }: ElementIdentity & { demo?: boolean; palette: Palette }) => {
  const scope = useId();
  const identity = id ?? scope;
  return <View {...elementProps(className ?? `status-badge`, identity)} style={[ui.badge, { backgroundColor: demo ? palette.selected : `${palette.green}14` }]}>
    <View {...elementProps(`status-badge-dot`, identity)} style={[ui.dot, { backgroundColor: demo ? palette.blue : palette.green }]} />
    <Text {...elementProps(`status-badge-label`, identity)} style={[ui.badgeText, { color: demo ? palette.blue : palette.green }]}>{demo ? `Demo` : `Live`}</Text>
  </View>;
};

export const TextButton = ({ id, className, children, onPress, palette, icon: Icon = ChevronRight }: ElementIdentity & { palette: Palette; children: ReactNode; icon?: LucideIcon; onPress: () => void }) => {
  const scope = useId();
  const identity = id ?? scope;
  return <Pressable {...elementProps(className ?? `text-button`, identity)} onPress={onPress} style={ui.textButton} accessibilityRole={`button`}>
    <Text {...elementProps(`text-button-label`, identity)} style={{ fontSize: 13, fontWeight: `500`, color: palette.blue }}>{children}</Text>
    <Icon {...elementProps(`text-button-icon`, identity)} size={15} color={palette.blue} strokeWidth={1.8} />
  </Pressable>;
};

export const ui = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: `600` },
  segmentText: { fontSize: 13, fontWeight: `600` },
  card: { minWidth: 0, borderWidth: 1, borderRadius: 12, overflow: `hidden` },
  iconButton: { width: 44, height: 44, borderRadius: 8, alignItems: `center`, justifyContent: `center` },
  segmented: { padding: 3, borderWidth: 1, borderRadius: 8, flexDirection: `row`, alignSelf: `flex-start` },
  badge: { gap: 6, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, flexDirection: `row`, alignItems: `center` },
  textButton: { gap: 4, minHeight: 38, paddingHorizontal: 4, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  segment: { gap: 6, minHeight: 38, borderRadius: 5, paddingHorizontal: 22, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
});
