import ModalShell from './ModalShell';
import type { Palette } from '../ui/theme';
import { elementProps } from '../ui/elementProps';
import type { LocationInput } from '../state/types';
import { LocateFixed, MapPin } from 'lucide-react-native';
import { useId, useEffect, useRef, useState } from 'react';
import { currentPosition } from '../location/currentPosition';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type LocationDialogProps = {
  visible: boolean;
  palette: Palette;
  reducedMotion: boolean;
  onClose: () => void;
  onSave: (location: LocationInput) => Promise<void>;
};

const LocationDialog = ({ visible, palette, reducedMotion, onClose, onSave }: LocationDialogProps) => {
  const scope = useId();
  const request = useRef(0);
  const saving = useRef(false);
  const [name, setName] = useState(``);
  const [error, setError] = useState(``);
  const [latitude, setLatitude] = useState(``);
  const [longitude, setLongitude] = useState(``);
  const [busy, setBusy] = useState<`location` | `save` | null>(null);
  useEffect(() => {
    request.current += 1;
    if (visible) {
      setName(``);
      setError(``);
      setLatitude(``);
      setLongitude(``);
      setBusy(null);
    }
    return () => { request.current += 1; };
  }, [visible]);
  const locate = async () => {
    if (busy) return;
    const current = ++request.current;
    setError(``);
    setBusy(`location`);
    try {
      const position = await currentPosition(() => current === request.current);
      if (current !== request.current) return;
      setLatitude(position.latitude.toFixed(5));
      setLongitude(position.longitude.toFixed(5));
      setName(value => value || `My Location`);
    } catch (reason) {
      if (current === request.current) setError(reason instanceof Error ? reason.message : `Could Not Find Your Location. Enter Coordinates Instead`);
    } finally {
      if (current === request.current) setBusy(null);
    }
  };
  const save = async () => {
    if (busy || saving.current) return;
    setError(``);
    if (!name.trim() || !latitude.trim() || !longitude.trim()) {
      setError(`Enter A Name, Latitude, And Longitude`);
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
      setError(`Latitude Must Be −90 To 90 And Longitude −180 To 180`);
      return;
    }
    saving.current = true;
    setBusy(`save`);
    try {
      await onSave({ name: name.trim(), latitude: lat, longitude: lng });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Location Could Not Be Saved`);
    } finally {
      saving.current = false;
      setBusy(null);
    }
  };
  const inputStyle = [styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.input }];
  return (
    <ModalShell
      visible={visible}
      title={`Add Your Location`}
      description={`Place your marker on the map and globe`}
      palette={palette}
      reducedMotion={reducedMotion}
      dismissible={busy !== `save`}
      onClose={onClose}
    >
      <Pressable
        {...elementProps(`location-locate`, scope)}
        accessibilityRole={`button`}
        accessibilityLabel={`Use Current Location`}
        aria-busy={busy === `location`}
        disabled={!!busy}
        onPress={locate}
        style={[styles.locate, { borderColor: palette.border, backgroundColor: palette.raised, opacity: busy ? 0.65 : 1 }]}
      >
        {busy === `location` ? (
          <ActivityIndicator
            {...elementProps(`location-locate-spinner`, scope)}
            size={`small`}
            color={palette.blue}
          />
        ) : (
          <LocateFixed
            {...elementProps(`location-locate-icon`, scope)}
            size={19}
            color={palette.blue}
          />
        )}
        <Text
          {...elementProps(`location-locate-label`, scope)}
          style={[styles.buttonLabel, { color: palette.blue }]}
        >
          {busy === `location` ? `Finding Your Location…` : `Use Current Location`}
        </Text>
      </Pressable>
      <Text
        {...elementProps(`location-description`, scope)}
        style={[styles.note, { color: palette.muted }]}
      >
        Use your device location or enter coordinates below. Your saved marker stays on this device.
      </Text>
      <View
        {...elementProps(`location-name-field`, scope)}
        style={styles.field}
      >
        <Text
          {...elementProps(`location-name-label`, scope)}
          style={[styles.label, { color: palette.text }]}
        >
          Location Name
        </Text>
        <TextInput
          {...elementProps(`location-name-input`, scope)}
          accessibilityLabel={`Location Name`}
          value={name}
          onChangeText={setName}
          placeholder={`City, home, or a favorite place`}
          placeholderTextColor={palette.faint}
          maxLength={60}
          editable={!busy}
          style={inputStyle}
        />
      </View>
      <View
        {...elementProps(`location-coordinates`, scope)}
        style={styles.coordinates}
      >
        <View
          {...elementProps(`location-latitude-field`, scope)}
          style={styles.coordinate}
        >
          <Text
            {...elementProps(`location-latitude-label`, scope)}
            style={[styles.label, { color: palette.text }]}
          >
            Latitude
          </Text>
          <TextInput
            {...elementProps(`location-latitude-input`, scope)}
            accessibilityLabel={`Latitude`}
            value={latitude}
            onChangeText={setLatitude}
            placeholder={`40.7128`}
            placeholderTextColor={palette.faint}
            maxLength={20}
            editable={!busy}
            autoCorrect={false}
            keyboardType={`numbers-and-punctuation`}
            style={inputStyle}
          />
        </View>
        <View
          {...elementProps(`location-longitude-field`, scope)}
          style={styles.coordinate}
        >
          <Text
            {...elementProps(`location-longitude-label`, scope)}
            style={[styles.label, { color: palette.text }]}
          >
            Longitude
          </Text>
          <TextInput
            {...elementProps(`location-longitude-input`, scope)}
            accessibilityLabel={`Longitude`}
            value={longitude}
            onChangeText={setLongitude}
            placeholder={`-74.0060`}
            placeholderTextColor={palette.faint}
            maxLength={20}
            editable={!busy}
            autoCorrect={false}
            keyboardType={`numbers-and-punctuation`}
            onSubmitEditing={save}
            style={inputStyle}
          />
        </View>
      </View>
      {error ? (
        <Text
          {...elementProps(`location-error`, scope)}
          accessibilityRole={`alert`}
          style={[styles.note, { color: palette.red }]}
        >
          {error}
        </Text>
      ) : null}
      <Pressable
        {...elementProps(`location-save`, scope)}
        accessibilityRole={`button`}
        accessibilityLabel={`Save Location`}
        aria-busy={busy === `save`}
        disabled={!!busy}
        onPress={save}
        style={[styles.save, { backgroundColor: palette.blue, opacity: busy ? 0.65 : 1 }]}
      >
        {busy === `save` ? (
          <ActivityIndicator
            {...elementProps(`location-save-spinner`, scope)}
            size={`small`}
            color={`#FFFFFF`}
          />
        ) : (
          <MapPin
            {...elementProps(`location-save-icon`, scope)}
            size={18}
            color={`#FFFFFF`}
          />
        )}
        <Text
          {...elementProps(`location-save-label`, scope)}
          style={[styles.buttonLabel, { color: `#FFFFFF` }]}
        >
          {busy === `save` ? `Saving…` : `Save Location`}
        </Text>
      </Pressable>
    </ModalShell>
  );
};

const styles = StyleSheet.create({
  field: { gap: 8 },
  coordinate: { flex: 1, gap: 8 },
  note: { fontSize: 12, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: `600` },
  coordinates: { flexDirection: `row`, gap: 12 },
  buttonLabel: { fontSize: 14, fontWeight: `600` },
  input: { minWidth: 0, minHeight: 46, borderRadius: 8, borderWidth: 1, padding: 12, fontSize: 16 },
  save: { minHeight: 46, gap: 8, borderRadius: 8, flexDirection: `row`, justifyContent: `center`, alignItems: `center` },
  locate: { minHeight: 46, gap: 8, borderRadius: 8, borderWidth: 1, flexDirection: `row`, justifyContent: `center`, alignItems: `center` },
});

export default LocationDialog;
