import { useId } from 'react';
import { elementProps } from '../ui/elementProps';
import { Canvas as WebCanvas, type CanvasProps } from '@react-three/fiber';

export { useFrame, useLoader } from '@react-three/fiber';

export const Canvas = ({ onCreated, ...props }: CanvasProps) => {
  const scope = useId();
  const { id, className } = elementProps(`geography-web-canvas`, scope);
  return <WebCanvas {...props} id={id} className={className} onCreated={state => {
    const canvas = state.gl.domElement;
    const viewport = canvas.parentElement;
    canvas.id = elementProps(`geography-canvas-surface`, scope).id;
    canvas.classList.add(`geography-canvas-surface`);
    canvas.setAttribute(`data-vc-class`, `geography-canvas-surface`);
    if (viewport) {
      viewport.id = elementProps(`geography-canvas-viewport`, scope).id;
      viewport.classList.add(`geography-canvas-viewport`);
      viewport.setAttribute(`data-vc-class`, `geography-canvas-viewport`);
    }
    onCreated?.(state);
  }} />;
};
