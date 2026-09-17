import ModalShell from './ModalShell';
import type { Palette } from '../ui/theme';
import type { LocalUser } from '../state/types';
import { elementProps } from '../ui/elementProps';
import { useId, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff, LogIn, LogOut, UserPlus, ShieldCheck, UserRound } from 'lucide-react-native';

type AuthMode = `signin` | `signup`;
type AuthDialogProps = {
  dark: boolean;
  visible: boolean;
  palette: Palette;
  user: LocalUser | null;
  onClose: () => void;
  initialMode?: AuthMode;
  reducedMotion?: boolean;
  onSignOut: () => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (username: string, email: string, password: string) => Promise<void>;
};

const AuthDialog = ({ user, dark, visible, palette, onClose, onSignIn, onSignUp, onSignOut, reducedMotion = false, initialMode = `signin` }: AuthDialogProps) => {
  const scope = useId();
  const working = useRef(false);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(``);
  const [error, setError] = useState(``);
  const [username, setUsername] = useState(``);
  const [password, setPassword] = useState(``);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const signingUp = mode === `signup`;
  const inputStyle = [styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.input }];

  useEffect(() => {
    if (!visible) return;
    setError(``);
    setPassword(``);
    setMode(initialMode);
    setShowPassword(false);
  }, [visible, initialMode]);

  const changeMode = (next: AuthMode) => {
    if (working.current) return;
    setMode(next);
    setError(``);
    setPassword(``);
    setShowPassword(false);
  };

  const submit = async () => {
    if (working.current) return;
    setError(``);
    if (!email.trim() || !password || (signingUp && !username.trim())) {
      setError(`Complete Every Field To Continue`);
      return;
    }
    working.current = true;
    setBusy(true);
    try {
      if (signingUp) await onSignUp(username.trim(), email.trim(), password);
      else await onSignIn(email.trim(), password);
      setPassword(``);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable To Continue. Please Try Again`);
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (working.current) return;
    working.current = true;
    setError(``);
    setBusy(true);
    try {
      await onSignOut();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable To Sign Out. Please Try Again`);
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  return (
    <ModalShell visible={visible} palette={palette} onClose={onClose} dismissible={!busy} reducedMotion={reducedMotion} title={user ? `Your Account` : `Welcome To Visit Collector`} description={user ? `Your profile on this device` : `A clear view of every arrival`}>
      {user ? (
        <View {...elementProps(`auth-account`, scope)} style={styles.account}>
          <View {...elementProps(`auth-account-avatar`, scope)} style={[styles.avatar, { backgroundColor: palette.selected }]}><UserRound {...elementProps(`auth-account-icon`, scope)} size={27} color={palette.blue} strokeWidth={1.8} /></View>
          <Text {...elementProps(`auth-account-name`, scope)} style={[styles.accountName, { color: palette.text }]}>{user.username}</Text>
          <Text {...elementProps(`auth-visitor-number`, scope)} style={[styles.visitor, { color: palette.blue }]}>{`Visitor #${user.number}`}</Text>
          <Text {...elementProps(`auth-account-email`, scope)} selectable style={[styles.accountEmail, { color: palette.muted }]}>{user.email}</Text>
        </View>
      ) : (
        <View {...elementProps(`auth-form`, scope)} style={styles.form}>
          <View {...elementProps(`auth-tabs`, scope)} accessibilityRole={`tablist`} style={[styles.tabs, { backgroundColor: palette.input, borderColor: palette.border }]}>
            {([`signin`, `signup`] as const).map((tab) => (
              <Pressable {...elementProps(`auth-tab`, `${scope}-${tab}`)} key={tab} accessibilityRole={`tab`} disabled={busy} aria-disabled={busy} aria-selected={mode === tab} onPress={() => changeMode(tab)} accessibilityState={{ selected: mode === tab, disabled: busy }} style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1, backgroundColor: mode === tab ? palette.selected : `transparent` }]}>
                {tab === `signin` ? <LogIn {...elementProps(`auth-signin-tab-icon`, `${scope}-${tab}`)} size={17} color={mode === tab ? palette.blue : palette.muted} /> : <UserPlus {...elementProps(`auth-signup-tab-icon`, `${scope}-${tab}`)} size={17} color={mode === tab ? palette.blue : palette.muted} />}
                <Text {...elementProps(`auth-tab-label`, `${scope}-${tab}`)} style={[styles.tabLabel, { color: mode === tab ? palette.blue : palette.muted }]}>{tab === `signin` ? `Sign In` : `Sign Up`}</Text>
              </Pressable>
            ))}
          </View>
          {signingUp ? (
            <View {...elementProps(`auth-username-field`, scope)} style={styles.field}>
              <Text {...elementProps(`auth-username-label`, scope)} style={[styles.label, { color: palette.text }]}>Username</Text>
              <TextInput {...elementProps(`auth-username-input`, scope)} value={username} maxLength={40} editable={!busy} autoCorrect={false} autoComplete={`username`} autoCapitalize={`none`} accessibilityLabel={`Username`} returnKeyType={`next`} submitBehavior={`submit`} keyboardAppearance={dark ? `dark` : `light`} onChangeText={setUsername} onSubmitEditing={() => emailInput.current?.focus()} placeholder={`Your name`} placeholderTextColor={palette.faint} selectionColor={palette.blue} style={inputStyle} />
            </View>
          ) : null}
          <View {...elementProps(`auth-email-field`, scope)} style={styles.field}>
            <Text {...elementProps(`auth-email-label`, scope)} style={[styles.label, { color: palette.text }]}>Email</Text>
            <TextInput {...elementProps(`auth-email-input`, scope)} ref={emailInput} value={email} maxLength={254} editable={!busy} autoCorrect={false} autoComplete={`email`} autoCapitalize={`none`} keyboardType={`email-address`} accessibilityLabel={`Email`} returnKeyType={`next`} submitBehavior={`submit`} keyboardAppearance={dark ? `dark` : `light`} onChangeText={setEmail} onSubmitEditing={() => passwordInput.current?.focus()} placeholder={`you@example.com`} placeholderTextColor={palette.faint} selectionColor={palette.blue} style={inputStyle} />
          </View>
          <View {...elementProps(`auth-password-field`, scope)} style={styles.field}>
            <Text {...elementProps(`auth-password-label`, scope)} style={[styles.label, { color: palette.text }]}>Password</Text>
            <View {...elementProps(`auth-password-input-wrap`, scope)} style={styles.passwordField}>
              <TextInput {...elementProps(`auth-password-input`, scope)} ref={passwordInput} value={password} maxLength={128} editable={!busy} autoCorrect={false} autoCapitalize={`none`} accessibilityLabel={`Password`} returnKeyType={`done`} autoComplete={signingUp ? `new-password` : `current-password`} secureTextEntry={!showPassword} keyboardAppearance={dark ? `dark` : `light`} onChangeText={setPassword} onSubmitEditing={submit} placeholder={signingUp ? `At least 8 characters` : `Your password`} placeholderTextColor={palette.faint} selectionColor={palette.blue} style={[inputStyle, styles.passwordInput]} />
              <Pressable {...elementProps(`auth-password-toggle`, scope)} accessibilityRole={`button`} disabled={busy} accessibilityLabel={showPassword ? `Hide Password` : `Show Password`} onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}>
                {showPassword ? <EyeOff {...elementProps(`auth-password-hide-icon`, scope)} size={20} color={palette.muted} strokeWidth={1.8} /> : <Eye {...elementProps(`auth-password-show-icon`, scope)} size={20} color={palette.muted} strokeWidth={1.8} />}
              </Pressable>
            </View>
          </View>
        </View>
      )}
      {error ? <Text {...elementProps(`auth-error`, scope)} accessibilityRole={`alert`} accessibilityLiveRegion={`polite`} style={[styles.error, { color: palette.red }]}>{error}</Text> : null}
      <Pressable {...elementProps(`auth-submit`, scope)} accessibilityRole={`button`} disabled={busy} aria-busy={busy} aria-disabled={busy} accessibilityState={{ busy, disabled: busy }} onPress={user ? signOut : submit} style={({ pressed }) => [styles.submit, { opacity: busy ? 0.7 : pressed ? 0.85 : 1 }]}>
        {busy ? <ActivityIndicator {...elementProps(`auth-submit-spinner`, scope)} color={`#FFFFFF`} size={`small`} /> : user ? <LogOut {...elementProps(`auth-signout-icon`, scope)} size={18} color={`#FFFFFF`} /> : signingUp ? <UserPlus {...elementProps(`auth-signup-submit-icon`, scope)} size={18} color={`#FFFFFF`} /> : <LogIn {...elementProps(`auth-signin-submit-icon`, scope)} size={18} color={`#FFFFFF`} />}
        <Text {...elementProps(`auth-submit-label`, scope)} style={styles.submitLabel}>{busy ? `Please Wait…` : user ? `Sign Out` : signingUp ? `Create Account` : `Sign In`}</Text>
      </Pressable>
      <View {...elementProps(`auth-local-note`, scope)} style={[styles.localNote, { borderColor: palette.border }]}>
        <ShieldCheck {...elementProps(`auth-local-note-icon`, scope)} size={18} color={palette.muted} strokeWidth={1.7} />
        <View {...elementProps(`auth-local-note-copy`, scope)} style={styles.noteCopy}>
          <Text {...elementProps(`auth-local-note-title`, scope)} style={[styles.noteTitle, { color: palette.muted }]}>Accounts Stay On This Device</Text>
          <Text {...elementProps(`auth-local-note-description`, scope)} style={[styles.noteBody, { color: palette.faint }]}>Your account is stored in this browser or app. It does not sync to other devices.</Text>
        </View>
      </View>
    </ModalShell>
  );
};

const styles = StyleSheet.create({
  field: { gap: 8 },
  form: { gap: 18 },
  noteCopy: { flex: 1, gap: 4 },
  passwordField: { position: `relative` },
  error: { fontSize: 13, lineHeight: 19 },
  account: { gap: 9, alignItems: `center` },
  label: { fontSize: 13, fontWeight: `600` },
  noteBody: { fontSize: 12, lineHeight: 18 },
  visitor: { fontSize: 13, fontWeight: `600` },
  tabLabel: { fontSize: 14, fontWeight: `600` },
  noteTitle: { fontSize: 12, fontWeight: `600` },
  passwordInput: { width: `100%`, paddingRight: 52 },
  submitLabel: { color: `#FFFFFF`, fontSize: 15, fontWeight: `600` },
  accountEmail: { fontSize: 14, lineHeight: 21, textAlign: `center` },
  accountName: { fontSize: 23, fontWeight: `700`, textAlign: `center` },
  tabs: { padding: 3, borderWidth: 1, borderRadius: 10, flexDirection: `row` },
  localNote: { gap: 10, paddingTop: 17, borderTopWidth: 1, flexDirection: `row` },
  input: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 13, borderWidth: 1, borderRadius: 8, fontSize: 16 },
  avatar: { width: 60, height: 60, marginBottom: 5, borderRadius: 18, alignItems: `center`, justifyContent: `center` },
  tab: { gap: 8, flex: 1, minHeight: 44, borderRadius: 7, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  passwordToggle: { top: 2, right: 2, width: 44, bottom: 2, position: `absolute`, alignItems: `center`, justifyContent: `center` },
  submit: { gap: 9, minHeight: 48, borderRadius: 8, padding: 12, flexDirection: `row`, alignItems: `center`, justifyContent: `center`, backgroundColor: `#2563EB` },
});

export default AuthDialog;
