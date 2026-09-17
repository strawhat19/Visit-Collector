import { Platform } from 'react-native';
import * as Location from 'expo-location';

export const currentPosition = async (isCurrent: () => boolean = () => true): Promise<{ latitude: number; longitude: number }> => {
  if (Platform.OS === `web`) return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(`Location Is Unavailable. Enter Coordinates Instead`));
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      error => reject(new Error(error.code === 1 ? `Location Permission Was Denied. Enter Coordinates Instead` : `Could Not Find Your Location. Try Again Or Enter Coordinates`)),
      { timeout: 15_000, maximumAge: 60_000, enableHighAccuracy: false },
    );
  });
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!isCurrent()) throw new Error(`Location Request Cancelled`);
  if (!permission.granted) throw new Error(`Location Permission Was Denied. Enter Coordinates Instead`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Location Timed Out. Try Again Or Enter Coordinates`)), 20_000); }),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } finally { if (timer) clearTimeout(timer); }
};
