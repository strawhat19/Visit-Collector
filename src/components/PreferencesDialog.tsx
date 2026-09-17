import ModalShell from './ModalShell';
import type { Palette } from '../ui/theme';
import { elementProps } from '../ui/elementProps';
import { useId, useEffect, useRef, useState } from 'react';
import type { DataMode, Preferences } from '../state/types';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Sun, Moon, Radio, Waves, Trash2, BellOff, History, Monitor, Vibrate, HardDrive, type LucideIcon } from 'lucide-react-native';

type PreferencesDialogProps = {
  mode: DataMode;
  visible: boolean;
  palette: Palette;
  onClose: () => void;
  preferences: Preferences;
  reducedMotion?: boolean;
  onClearHistory: () => Promise<void>;
  onModeChange: (mode: DataMode) => Promise<void>;
  onChange: (patch: Partial<Preferences>) => Promise<void>;
};

type ToggleRowProps = {
  label: string;
  value: boolean;
  Icon: LucideIcon;
  palette: Palette;
  disabled: boolean;
  description: string;
  onChange: (value: boolean) => void;
};

const appearanceOptions = [
  { value: `light`, label: `Light`, Icon: Sun },
  { value: `dark`, label: `Dark`, Icon: Moon },
  { value: `system`, label: `System`, Icon: Monitor },
] as const;

const ToggleRow = ({ Icon, label, value, palette, disabled, description, onChange }: ToggleRowProps) => {
  const scope = useId();
  return (
  <View {...elementProps(`preferences-toggle`, scope)} style={styles.settingRow}>
    <Icon {...elementProps(`preferences-toggle-icon`, scope)} size={20} color={palette.muted} strokeWidth={1.8} />
    <View {...elementProps(`preferences-toggle-copy`, scope)} style={styles.rowCopy}>
      <Text {...elementProps(`preferences-toggle-label`, scope)} style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      <Text {...elementProps(`preferences-toggle-description`, scope)} style={[styles.description, { color: palette.muted }]}>{description}</Text>
    </View>
    <Switch {...elementProps(`preferences-toggle-switch`, scope)} value={value} hitSlop={8} disabled={disabled} aria-checked={value} aria-disabled={disabled} onValueChange={onChange} accessibilityLabel={label} accessibilityHint={description} thumbColor={`#FFFFFF`} trackColor={{ false: palette.faint, true: `#2563EB` }} ios_backgroundColor={palette.faint} />
  </View>
  );
};

const PreferencesDialog = ({ mode, visible, palette, onClose, onChange, preferences, onModeChange, onClearHistory, reducedMotion = preferences.reducedMotion }: PreferencesDialogProps) => {
  const scope = useId();
  const working = useRef(false);
  const [error, setError] = useState(``);
  const [notice, setNotice] = useState(``);
  const [pending, setPending] = useState(``);
  const [confirmClear, setConfirmClear] = useState(false);
  const busy = Boolean(pending);

  useEffect(() => {
    if (!visible) return;
    setError(``);
    setNotice(``);
    setConfirmClear(false);
  }, [visible]);

  const save = async (key: string, action: () => Promise<void>) => {
    if (working.current) return;
    working.current = true;
    setError(``);
    setNotice(``);
    setPending(key);
    try {
      await action();
      if (key === `history`) {
        setConfirmClear(false);
        setNotice(`Visit History Cleared`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable To Save. Please Try Again`);
    } finally {
      working.current = false;
      setPending(``);
    }
  };

  return (
    <ModalShell title={`Preferences`} visible={visible} palette={palette} onClose={onClose} maxWidth={520} dismissible={!busy} reducedMotion={reducedMotion} description={`Make Visit Collector feel like yours`}>
      <View {...elementProps(`preferences-appearance`, scope)} style={styles.section}>
        <Text {...elementProps(`preferences-appearance-title`, scope)} style={[styles.sectionTitle, { color: palette.text }]}>Appearance</Text>
        <View {...elementProps(`preferences-appearance-options`, scope)} accessibilityRole={`radiogroup`} style={styles.options}>
          {appearanceOptions.map(({ value, label, Icon }) => (
            <Pressable {...elementProps(`preferences-appearance-option`, `${scope}-${value}`)} key={value} disabled={busy} aria-disabled={busy} aria-checked={preferences.theme === value} accessibilityRole={`radio`} accessibilityLabel={`${label} Appearance`} accessibilityState={{ checked: preferences.theme === value, disabled: busy }} onPress={() => save(`theme`, () => onChange({ theme: value }))} style={({ pressed }) => [styles.appearance, { opacity: busy ? 0.65 : pressed ? 0.75 : 1, borderColor: preferences.theme === value ? palette.blue : palette.border, backgroundColor: preferences.theme === value ? palette.selected : palette.input }]}>
              <Icon {...elementProps(`preferences-appearance-icon`, `${scope}-${value}`)} size={20} color={preferences.theme === value ? palette.blue : palette.muted} strokeWidth={1.8} />
              <Text {...elementProps(`preferences-appearance-label`, `${scope}-${value}`)} style={[styles.optionLabel, { color: preferences.theme === value ? palette.blue : palette.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View {...elementProps(`preferences-settings`, scope)} style={[styles.settings, { borderColor: palette.border }]}>
        <ToggleRow Icon={Vibrate} palette={palette} disabled={busy} label={`Haptic Feedback`} value={preferences.haptics} description={`A subtle tap on supported devices`} onChange={(haptics) => save(`haptics`, () => onChange({ haptics }))} />
        <View {...elementProps(`preferences-haptics-divider`, scope)} style={[styles.divider, { backgroundColor: palette.border }]} />
        <ToggleRow Icon={Waves} palette={palette} disabled={busy} label={`Reduce Motion`} value={preferences.reducedMotion} description={`Keep charts and transitions still`} onChange={(reducedMotion) => save(`motion`, () => onChange({ reducedMotion }))} />
        <View {...elementProps(`preferences-motion-divider`, scope)} style={[styles.divider, { backgroundColor: palette.border }]} />
        <View {...elementProps(`preferences-push-row`, scope)} style={styles.settingRow}>
          <BellOff {...elementProps(`preferences-push-icon`, scope)} size={20} color={palette.faint} strokeWidth={1.8} />
          <View {...elementProps(`preferences-push-copy`, scope)} style={styles.rowCopy}>
            <Text {...elementProps(`preferences-push-title`, scope)} style={[styles.rowLabel, { color: palette.muted }]}>Push Notifications</Text>
            <Text {...elementProps(`preferences-push-description`, scope)} style={[styles.description, { color: palette.muted }]}>Visitor alerts are planned for a future update</Text>
          </View>
          <View {...elementProps(`preferences-push-badge`, scope)} accessibilityLabel={`Push Notifications Planned`} style={[styles.planned, { backgroundColor: palette.raised }]}><Text {...elementProps(`preferences-push-badge-label`, scope)} style={[styles.plannedLabel, { color: palette.muted }]}>Planned</Text></View>
        </View>
      </View>
      <View {...elementProps(`preferences-data-source`, scope)} style={styles.section}>
        <Text {...elementProps(`preferences-data-title`, scope)} style={[styles.sectionTitle, { color: palette.text }]}>Data Source</Text>
        <View {...elementProps(`preferences-data-options`, scope)} accessibilityRole={`radiogroup`} style={styles.options}>
          {([{ value: `local`, label: `This Device` }, { value: `demo`, label: `Demo` }] as const).map(({ value, label }) => (
            <Pressable {...elementProps(`preferences-data-option`, `${scope}-${value}`)} key={value} disabled={busy} aria-disabled={busy} aria-checked={mode === value} accessibilityRole={`radio`} accessibilityLabel={label} accessibilityState={{ checked: mode === value, disabled: busy }} onPress={() => save(`mode`, () => onModeChange(value))} style={({ pressed }) => [styles.dataOption, { opacity: busy ? 0.65 : pressed ? 0.75 : 1, borderColor: mode === value ? palette.blue : palette.border, backgroundColor: mode === value ? palette.selected : palette.input }]}>
              {value === `local` ? <HardDrive {...elementProps(`preferences-local-data-icon`, `${scope}-${value}`)} size={17} color={mode === value ? palette.blue : palette.text} /> : <Radio {...elementProps(`preferences-demo-data-icon`, `${scope}-${value}`)} size={17} color={mode === value ? palette.blue : palette.text} />}
              <Text {...elementProps(`preferences-data-label`, `${scope}-${value}`)} style={[styles.optionLabel, { color: mode === value ? palette.blue : palette.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text {...elementProps(`preferences-data-description`, scope)} style={[styles.description, { color: palette.muted }]}>{mode === `local` ? `Visits recorded in this browser or app. Data stays on this device.` : `Illustrative activity to explore the dashboard. Demo visits are not real traffic.`}</Text>
      </View>
      <View {...elementProps(`preferences-history`, scope)} style={[styles.history, { borderTopColor: palette.border }]}>
        {confirmClear ? (
          <View {...elementProps(`preferences-clear-confirmation`, scope)} style={styles.section}>
            <Text {...elementProps(`preferences-history-title`, scope)} style={[styles.sectionTitle, { color: palette.text }]}>Clear Visit History?</Text>
            <Text {...elementProps(`preferences-history-description`, scope)} style={[styles.description, { color: palette.muted }]}>This removes recorded visits from this device. Your account and preferences stay. This cannot be undone.</Text>
            <View {...elementProps(`preferences-history-actions`, scope)} style={styles.options}>
              <Pressable {...elementProps(`preferences-keep-history`, scope)} accessibilityRole={`button`} disabled={busy} onPress={() => setConfirmClear(false)} style={({ pressed }) => [styles.dataOption, { opacity: busy ? 0.6 : pressed ? 0.75 : 1, borderColor: palette.border, backgroundColor: palette.input }]}>
                <History {...elementProps(`preferences-keep-icon`, scope)} size={17} color={palette.text} />
                <Text {...elementProps(`preferences-keep-label`, scope)} style={[styles.optionLabel, { color: palette.text }]}>Keep History</Text>
              </Pressable>
              <Pressable {...elementProps(`preferences-confirm-clear`, scope)} accessibilityRole={`button`} accessibilityLabel={`Confirm Clear Visit History`} disabled={busy} aria-disabled={busy} aria-busy={pending === `history`} accessibilityState={{ busy: pending === `history`, disabled: busy }} onPress={() => save(`history`, onClearHistory)} style={({ pressed }) => [styles.clearConfirm, { opacity: busy ? 0.7 : pressed ? 0.85 : 1 }]}>
                {pending === `history` ? <ActivityIndicator {...elementProps(`preferences-clear-spinner`, scope)} color={`#FFFFFF`} size={`small`} /> : <><Trash2 {...elementProps(`preferences-confirm-clear-icon`, scope)} size={17} color={`#FFFFFF`} /><Text {...elementProps(`preferences-confirm-clear-label`, scope)} style={styles.confirmLabel}>Clear History</Text></>}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable {...elementProps(`preferences-clear-history`, scope)} accessibilityRole={`button`} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { setNotice(``); setConfirmClear(true); }} style={({ pressed }) => [styles.clearButton, { opacity: busy ? 0.6 : pressed ? 0.7 : 1 }]}>
            <Trash2 {...elementProps(`preferences-clear-icon`, scope)} size={18} color={palette.red} strokeWidth={1.8} />
            <Text {...elementProps(`preferences-clear-label`, scope)} style={[styles.optionLabel, { color: palette.red }]}>Clear Visit History</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text {...elementProps(`preferences-error`, scope)} accessibilityRole={`alert`} accessibilityLiveRegion={`polite`} style={[styles.feedback, { color: palette.red }]}>{error}</Text> : null}
      {notice ? <Text {...elementProps(`preferences-notice`, scope)} accessibilityLiveRegion={`polite`} style={[styles.feedback, { color: palette.green }]}>{notice}</Text> : null}
      {busy && pending !== `history` ? <View {...elementProps(`preferences-saving`, scope)} accessibilityLiveRegion={`polite`} style={styles.saving}><ActivityIndicator {...elementProps(`preferences-saving-spinner`, scope)} size={`small`} color={palette.blue} /><Text {...elementProps(`preferences-saving-label`, scope)} style={[styles.description, { color: palette.muted }]}>Saving…</Text></View> : null}
    </ModalShell>
  );
};

const styles = StyleSheet.create({
  section: { gap: 12 },
  settings: { gap: 6 },
  divider: { height: 1 },
  options: { gap: 8, flexDirection: `row` },
  rowCopy: { gap: 4, flex: 1, minWidth: 0 },
  feedback: { fontSize: 13, lineHeight: 19 },
  description: { fontSize: 12, lineHeight: 18 },
  rowLabel: { fontSize: 14, fontWeight: `600` },
  history: { paddingTop: 12, borderTopWidth: 1 },
  optionLabel: { fontSize: 13, fontWeight: `600` },
  plannedLabel: { fontSize: 11, fontWeight: `600` },
  sectionTitle: { fontSize: 14, fontWeight: `700` },
  saving: { gap: 8, flexDirection: `row`, alignItems: `center` },
  confirmLabel: { color: `#FFFFFF`, fontSize: 13, fontWeight: `600` },
  planned: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 },
  settingRow: { gap: 12, minHeight: 76, paddingVertical: 12, flexDirection: `row`, alignItems: `center` },
  clearButton: { gap: 9, minHeight: 44, alignSelf: `flex-start`, flexDirection: `row`, alignItems: `center` },
  appearance: { flex: 1, gap: 8, minHeight: 77, padding: 10, borderWidth: 1, borderRadius: 8, alignItems: `center`, justifyContent: `center` },
  dataOption: { gap: 8, flex: 1, padding: 10, minHeight: 44, borderWidth: 1, borderRadius: 8, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  clearConfirm: { gap: 8, flex: 1, padding: 10, minHeight: 44, borderRadius: 8, flexDirection: `row`, alignItems: `center`, justifyContent: `center`, backgroundColor: `#B72F38` },
});

export default PreferencesDialog;
