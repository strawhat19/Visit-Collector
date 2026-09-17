import { useId } from 'react';
import { elementProps } from '../ui/elementProps';
import { Canvas as NativeCanvas, type CanvasProps } from '@react-three/fiber/native';

export { useFrame, useLoader } from '@react-three/fiber/native';

export const Canvas = ({ dpr, ...props }: CanvasProps & { dpr?: [number, number] }) => {
  const scope = useId();
  return <NativeCanvas {...props} {...elementProps(`geography-native-canvas`, scope)} />;
};
