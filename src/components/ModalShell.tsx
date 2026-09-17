import { X } from 'lucide-react-native';
import type { Palette } from '../ui/theme';
import { useId, type ReactNode } from 'react';
import { elementProps } from '../ui/elementProps';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView } from 'react-native';

export type ModalShellProps = {
  title: string;
  visible: boolean;
  palette: Palette;
  children: ReactNode;
  maxWidth?: number;
  onClose: () => void;
  description?: string;
  dismissible?: boolean;
  reducedMotion?: boolean;
};

const ModalShell = ({ title, visible, palette, children, onClose, description, maxWidth = 480, dismissible = true, reducedMotion = false }: ModalShellProps) => {
  const scope = useId();
  const dismiss = () => { if (dismissible) onClose(); };

  return (
    <Modal {...elementProps(`dialog-modal`, scope)} transparent visible={visible} statusBarTranslucent accessibilityLabel={title} onRequestClose={dismiss} animationType={reducedMotion ? `none` : `fade`}>
      <View {...elementProps(`dialog-overlay`, scope)} style={styles.overlay}>
        <Pressable {...elementProps(`dialog-backdrop`, scope)} accessible={false} tabIndex={-1} onPress={dismiss} style={styles.backdrop} />
        <KeyboardAvoidingView {...elementProps(`dialog-keyboard-position`, scope)} style={styles.position} behavior={Platform.OS === `ios` ? `padding` : undefined}>
          <View {...elementProps(`dialog-panel`, scope)} accessibilityViewIsModal onAccessibilityEscape={dismiss} style={[styles.panel, { maxWidth, borderColor: palette.border, backgroundColor: palette.card }]}>
            <View {...elementProps(`dialog-header`, scope)} style={[styles.header, { borderBottomColor: palette.border }]}>
              <View {...elementProps(`dialog-heading`, scope)} style={styles.heading}>
                <Text {...elementProps(`dialog-title`, scope)} accessibilityRole={`header`} style={[styles.title, { color: palette.text }]}>{title}</Text>
                {description ? <Text {...elementProps(`dialog-description`, scope)} style={[styles.description, { color: palette.muted }]}>{description}</Text> : null}
              </View>
              <Pressable {...elementProps(`dialog-close`, scope)} accessibilityRole={`button`} accessibilityLabel={`Close ${title}`} disabled={!dismissible} accessibilityState={{ disabled: !dismissible }} onPress={dismiss} style={({ pressed }) => [styles.close, { opacity: !dismissible ? 0.4 : pressed ? 0.65 : 1, backgroundColor: palette.raised }]}>
                <X {...elementProps(`dialog-close-icon`, scope)} size={20} color={palette.muted} strokeWidth={1.8} />
              </Pressable>
            </View>
            <ScrollView {...elementProps(`dialog-scroll`, scope)} style={styles.scroll} keyboardShouldPersistTaps={`handled`} contentContainerStyle={styles.content}>
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  scroll: { flexGrow: 0 },
  content: { gap: 20, padding: 20 },
  heading: { flex: 1, minWidth: 0, gap: 5 },
  title: { fontSize: 21, fontWeight: `700` },
  description: { fontSize: 13, lineHeight: 19 },
  close: { width: 44, height: 44, borderRadius: 8, alignItems: `center`, justifyContent: `center` },
  header: { gap: 16, padding: 20, borderBottomWidth: 1, flexDirection: `row`, alignItems: `center` },
  position: { flex: 1, padding: 16, pointerEvents: `box-none`, justifyContent: `center`, alignItems: `center` },
  panel: { width: `100%`, maxHeight: `100%`, flexShrink: 1, borderWidth: 1, borderRadius: 12, overflow: `hidden` },
  backdrop: { position: `absolute`, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: `rgba(3, 7, 12, 0.64)` },
});

export default ModalShell;
