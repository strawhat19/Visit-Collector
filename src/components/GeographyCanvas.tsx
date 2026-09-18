import { useId } from 'react';
import { elementProps } from '../ui/elementProps';
import { Canvas as NativeCanvas, type CanvasProps } from '@react-three/fiber/native';

export { useFrame, useLoader } from '@react-three/fiber/native';

type GeographyCanvasProps = CanvasProps & { dpr?: [number, number]; onZoomWheel?: (delta: number) => void };

export const Canvas = ({ dpr, onZoomWheel, ...props }: GeographyCanvasProps) => {
  const scope = useId();
  return (
    <NativeCanvas
      {...props}
      {...elementProps(`geography-native-canvas`, scope)}
    />
  );
};
