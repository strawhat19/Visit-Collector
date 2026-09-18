import { elementProps } from '../ui/elementProps';
import { useId, useEffect, useState } from 'react';
import { Canvas as WebCanvas, type CanvasProps } from '@react-three/fiber';

export { useFrame, useLoader } from '@react-three/fiber';

type GeographyCanvasProps = CanvasProps & { onZoomWheel?: (delta: number) => void };

export const Canvas = ({ onCreated, onZoomWheel, ...props }: GeographyCanvasProps) => {
  const scope = useId();
  const [surface, setSurface] = useState<HTMLCanvasElement | null>(null);
  const { id, className } = elementProps(`geography-web-canvas`, scope);
  useEffect(() => {
    if (!surface || !onZoomWheel) return;
    const onWheel = (event: WheelEvent) => {
      if (!Number.isFinite(event.deltaY) || event.deltaY === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight || 800 : 1;
      onZoomWheel(Math.max(-120, Math.min(120, event.deltaY * unit)));
    };
    surface.addEventListener(`wheel`, onWheel, { passive: false });
    return () => surface.removeEventListener(`wheel`, onWheel);
  }, [surface, onZoomWheel]);
  return (
    <WebCanvas
      {...props}
      id={id}
      className={className}
      onCreated={state => {
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
        setSurface(canvas);
        onCreated?.(state);
      }}
    />
  );
};
