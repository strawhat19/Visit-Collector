import * as THREE from 'three';
import { Asset } from 'expo-asset';
import type { RefObject } from 'react';
import { elementProps } from '../ui/elementProps';
import { Canvas, useFrame, useLoader } from './GeographyCanvas';
import { Play, Plus, Minus, Pause, RotateCcw, ExternalLink } from 'lucide-react-native';
import { atmosphereFragment, cloudsFragment, globeVertex, surfaceFragment } from '../geography/shaders';
import { Component, Suspense, useId, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Linking, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export type GeographyPoint = {
  id: string;
  label: string;
  value: number;
  color?: string;
  latitude: number;
  longitude: number;
};

type GeographyProps = {
  dark: boolean;
  mode: `map` | `globe`;
  focusRequest?: number;
  reducedMotion: boolean;
  points: GeographyPoint[];
  selectedCountry?: string;
  onSelectCountry?: (id: string) => void;
};

type Controls = {
  zoom: number;
  reset: number;
  paused: boolean;
  dragging: boolean;
  pauseRevision: number;
  drag: { x: number; y: number };
};

type SceneProps = GeographyProps & {
  onReady: () => void;
  controls: RefObject<Controls>;
  onFocusComplete: () => void;
  onZoomChange: (value: number) => void;
};

const dayAsset = require(`../../assets/earth/earth_day_4096.jpg`);
const nightAsset = require(`../../assets/earth/earth_night_4096.jpg`);
const detailAsset = require(`../../assets/earth/earth_bump_roughness_clouds_4096.jpg`);
const textureSources = [dayAsset, nightAsset, detailAsset].map(source => Platform.OS === `web` ? Asset.fromModule(source).uri : source);
const north = new THREE.Vector3(0, 1, 0);
const forward = new THREE.Vector3(0, 0, 1);
const markerColor = `#EF6767`;
const ignoreMarkerRaycast = () => undefined;

const locationVector = (latitude: number, longitude: number, radius = 1) => {
  const phi = THREE.MathUtils.degToRad(latitude);
  const theta = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.sin(phi), -Math.cos(phi) * Math.sin(theta)).multiplyScalar(radius);
};

const Starfield = () => {
  const scope = useId();
  const stars = useMemo(() => {
    const positions = new Float32Array(1_600 * 3);
    const colors = new Float32Array(positions.length);
    let seed = 19;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let index = 0; index < positions.length; index += 3) {
      const longitude = random() * Math.PI * 2;
      const latitude = Math.acos(2 * random() - 1);
      const radius = 10 + random() * 8;
      const brightness = 0.45 + random() * 0.55;
      positions[index] = radius * Math.sin(latitude) * Math.cos(longitude);
      positions[index + 1] = radius * Math.cos(latitude);
      positions[index + 2] = radius * Math.sin(latitude) * Math.sin(longitude);
      colors[index] = brightness * 0.82;
      colors[index + 1] = brightness * 0.9;
      colors[index + 2] = brightness;
    }
    return { positions, colors };
  }, []);
  return <points name={`geography-stars-${scope}`} frustumCulled={false}>
    <bufferGeometry name={`geography-stars-geometry-${scope}`}>
      <bufferAttribute name={`geography-stars-positions-${scope}`} attach={`attributes-position`} args={[stars.positions, 3]} />
      <bufferAttribute name={`geography-stars-colors-${scope}`} attach={`attributes-color`} args={[stars.colors, 3]} />
    </bufferGeometry>
    <pointsMaterial name={`geography-stars-material-${scope}`} transparent vertexColors sizeAttenuation size={0.04} opacity={0.95} depthWrite={false} toneMapped={false} />
  </points>;
};

const VisitorMarker = ({ point, active, globe, reducedMotion, onSelect }: {
  active: boolean;
  globe: boolean;
  reducedMotion: boolean;
  point: GeographyPoint;
  onSelect?: (id: string) => void;
}) => {
  const scope = useId();
  const identity = `${scope}-${point.id}`;
  const pulse = useRef<THREE.Mesh>(null);
  const billboard = useRef<THREE.Group>(null);
  const pulseMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const position = useMemo(() => globe ? locationVector(point.latitude, point.longitude, 1.018) : new THREE.Vector3(point.longitude / 180, point.latitude / 180, 0.012), [globe, point.latitude, point.longitude]);
  const quaternion = useMemo(() => globe ? new THREE.Quaternion().setFromUnitVectors(forward, position.clone().normalize()) : new THREE.Quaternion(), [globe, position]);
  const inverseQuaternion = useMemo(() => quaternion.clone().invert(), [quaternion]);
  const radius = globe ? 0.018 : 0.01;
  useFrame(({ clock, camera }) => {
    billboard.current?.quaternion.copy(inverseQuaternion).multiply(camera.quaternion);
    if (!pulse.current || !pulseMaterial.current || reducedMotion) return;
    const phase = clock.elapsedTime / 1.7 % 1;
    pulse.current.scale.setScalar(1 + phase * 3.6);
    pulseMaterial.current.opacity = (active ? 0.95 : 0.8) * (1 - phase) * (1 - phase);
  });
  return (
    <group name={`visitor-marker-${identity}`} position={position} quaternion={quaternion} onClick={event => { event.stopPropagation(); onSelect?.(point.id); }}>
      <mesh name={`visitor-marker-touch-target-${identity}`}>
        <circleGeometry name={`visitor-marker-touch-geometry-${identity}`} args={[radius * 3, 24]} />
        <meshBasicMaterial name={`visitor-marker-touch-material-${identity}`} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={billboard} name={`visitor-marker-billboard-${identity}`}>
        <mesh name={`visitor-marker-halo-${identity}`} renderOrder={2} raycast={ignoreMarkerRaycast}>
          <ringGeometry name={`visitor-marker-halo-geometry-${identity}`} args={[radius * 1.55, radius * 1.85, 32]} />
          <meshBasicMaterial name={`visitor-marker-halo-material-${identity}`} transparent color={markerColor} opacity={active ? 0.48 : 0.32} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={pulse} name={`visitor-marker-pulse-${identity}`} renderOrder={2} visible={!reducedMotion} raycast={ignoreMarkerRaycast}>
          <ringGeometry name={`visitor-marker-pulse-geometry-${identity}`} args={[radius * 1.15, radius * 1.4, 32]} />
          <meshBasicMaterial ref={pulseMaterial} name={`visitor-marker-pulse-material-${identity}`} transparent color={markerColor} opacity={0.8} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh name={`visitor-marker-dot-${identity}`} renderOrder={3}>
          <circleGeometry name={`visitor-marker-dot-geometry-${identity}`} args={[radius * (active ? 1.2 : 1), 24]} />
          <meshBasicMaterial name={`visitor-marker-dot-material-${identity}`} color={markerColor} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

const EarthScene = ({ mode, dark, points, controls, onReady, focusRequest, reducedMotion, selectedCountry, onZoomChange, onFocusComplete, onSelectCountry }: SceneProps) => {
  const scope = useId();
  const textures = useLoader(THREE.TextureLoader, textureSources);
  const focusedPoint = points.find(point => point.id === selectedCountry);
  const focusedLatitude = focusedPoint?.latitude;
  const focusedLongitude = focusedPoint?.longitude;
  const clouds = useRef<THREE.Mesh>(null);
  const direction = useRef(locationVector(22, -35));
  const lastDrag = useRef({ x: 0, y: 0 });
  const lastMode = useRef<GeographyProps[`mode`] | null>(null);
  const lastFocusRequest = useRef(focusRequest);
  const lastReset = useRef(controls.current.reset);
  const mapCenter = useRef(new THREE.Vector2());
  const currentZoom = useRef(controls.current.zoom);
  const flight = useRef({ active: false, progress: 0, resume: false, pauseRevision: 0 });
  const focusFrom = useMemo(() => new THREE.Vector3(), []);
  const focusTarget = useMemo(() => new THREE.Vector3(), []);
  const mapFrom = useMemo(() => new THREE.Vector2(), []);
  const mapTarget = useMemo(() => new THREE.Vector2(), []);
  const focusRotation = useMemo(() => new THREE.Quaternion(), []);
  const turn = useMemo(() => new THREE.Quaternion(), []);
  const candidate = useMemo(() => new THREE.Vector3(), []);
  const sunDirection = useMemo(() => new THREE.Vector3(1, 1, 1).normalize(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const surfaceUniforms = useMemo(() => ({ dayMap: { value: textures[0] }, nightMap: { value: textures[1] }, detailMap: { value: textures[2] }, sunDirection: { value: sunDirection } }), [textures, sunDirection]);
  const shellUniforms = useMemo(() => ({ detailMap: { value: textures[2] }, sunDirection: { value: sunDirection } }), [textures, sunDirection]);
  const atmosphereUniforms = useMemo(() => ({ sunDirection: { value: sunDirection } }), [sunDirection]);

  useEffect(() => {
    textures.forEach((texture, index) => {
      texture.colorSpace = index < 2 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    });
    onReady();
  }, [textures, onReady]);

  useEffect(() => {
    const modeChanged = lastMode.current !== mode;
    const requested = focusRequest !== lastFocusRequest.current;
    lastMode.current = mode;
    if (focusedLatitude === undefined || focusedLongitude === undefined) {
      flight.current.active = false;
      if (modeChanged) {
        onZoomChange(1);
        currentZoom.current = 1;
        mapCenter.current.set(0, 0);
      }
      return;
    }
    lastFocusRequest.current = focusRequest;
    focusFrom.copy(direction.current);
    focusTarget.copy(locationVector(focusedLatitude, focusedLongitude));
    focusRotation.setFromUnitVectors(focusFrom, focusTarget);
    mapFrom.copy(mapCenter.current);
    mapTarget.set(focusedLongitude / 180, focusedLatitude / 180);
    flight.current = { active: true, progress: 0, resume: requested, pauseRevision: controls.current.pauseRevision };
    const nextZoom = mode === `map` ? Math.max(2.25, controls.current.zoom) : modeChanged || requested ? 1.08 : controls.current.zoom;
    onZoomChange(nextZoom);
    if (modeChanged) currentZoom.current = nextZoom;
  }, [mode, focusRequest, selectedCountry, focusedLatitude, focusedLongitude, controls, focusFrom, focusTarget, focusRotation, mapFrom, mapTarget, onZoomChange]);

  useFrame(({ camera, size }, frameDelta) => {
    if (size.width <= 0 || size.height <= 0) return;
    const delta = Math.min(frameDelta, 0.05);
    const state = controls.current;
    const aspect = size.width / Math.max(1, size.height);
    const dx = state.drag.x - lastDrag.current.x;
    const dy = state.drag.y - lastDrag.current.y;
    const zoom = reducedMotion ? state.zoom : THREE.MathUtils.damp(currentZoom.current, state.zoom, 10, delta);
    currentZoom.current = zoom;
    if (state.reset !== lastReset.current) {
      flight.current.active = false;
      mapCenter.current.set(0, 0);
      direction.current.copy(locationVector(22, -35));
      lastReset.current = state.reset;
    }
    if (dx || dy) flight.current.active = false;
    const focusing = flight.current.active;
    if (focusing) {
      flight.current.progress = reducedMotion ? 1 : Math.min(1, flight.current.progress + delta / 1.4);
      const progress = flight.current.progress;
      const eased = progress * progress * (3 - 2 * progress);
      if (mode === `globe`) direction.current.copy(focusFrom).applyQuaternion(turn.identity().slerp(focusRotation, eased)).normalize();
      else mapCenter.current.lerpVectors(mapFrom, mapTarget, eased);
      if (progress === 1) {
        flight.current.active = false;
        if (flight.current.resume && flight.current.pauseRevision === state.pauseRevision) onFocusComplete();
      }
    }
    if (mode === `globe`) {
      if (dx || dy) {
        direction.current.applyAxisAngle(north, -dx * 0.005 / zoom);
        right.crossVectors(north, direction.current).normalize();
        candidate.copy(direction.current).applyAxisAngle(right, -dy * 0.004 / zoom);
        if (Math.abs(candidate.y) < 0.97) direction.current.copy(candidate);
      } else if (!focusing && !state.paused && !reducedMotion && !state.dragging) direction.current.applyAxisAngle(north, delta * 0.04);
      camera.position.copy(direction.current).multiplyScalar(Math.max(3.2, 3.2 / aspect) / zoom);
      camera.lookAt(0, 0, 0);
      right.crossVectors(north, direction.current).normalize();
      sunDirection.copy(direction.current).multiplyScalar(0.7).addScaledVector(right, -0.65).addScaledVector(north, 0.6).normalize();
      if (clouds.current && !state.paused && !reducedMotion) clouds.current.rotation.y += delta * 0.004;
    } else {
      const halfHeight = Math.max(0.53, 1.04 / aspect) / zoom;
      const halfWidth = halfHeight * aspect;
      mapCenter.current.x = THREE.MathUtils.clamp(mapCenter.current.x - dx * halfWidth * 2 / Math.max(1, size.width), -Math.max(0, 1 - halfWidth), Math.max(0, 1 - halfWidth));
      mapCenter.current.y = THREE.MathUtils.clamp(mapCenter.current.y + dy * halfHeight * 2 / Math.max(1, size.height), -Math.max(0, 0.5 - halfHeight), Math.max(0, 0.5 - halfHeight));
      camera.position.set(mapCenter.current.x, mapCenter.current.y, halfHeight / Math.tan(THREE.MathUtils.degToRad(38 / 2)));
      camera.lookAt(mapCenter.current.x, mapCenter.current.y, 0);
    }
    lastDrag.current.x = state.drag.x;
    lastDrag.current.y = state.drag.y;
  });

  return (
    <>
      {mode === `globe` ? (
        <>
          <Starfield />
          <mesh name={`earth-surface-${scope}`} onClick={event => event.stopPropagation()}>
            <sphereGeometry name={`earth-surface-geometry-${scope}`} args={[1, 96, 64]} />
            <shaderMaterial name={`earth-surface-material-${scope}`} vertexShader={globeVertex} fragmentShader={surfaceFragment} uniforms={surfaceUniforms} />
          </mesh>
          <mesh ref={clouds} name={`earth-clouds-${scope}`}>
            <sphereGeometry name={`earth-clouds-geometry-${scope}`} args={[1.005, 64, 48]} />
            <shaderMaterial name={`earth-clouds-material-${scope}`} transparent depthWrite={false} vertexShader={globeVertex} fragmentShader={cloudsFragment} uniforms={shellUniforms} />
          </mesh>
          <mesh name={`earth-atmosphere-${scope}`}>
            <sphereGeometry name={`earth-atmosphere-geometry-${scope}`} args={[1.027, 64, 48]} />
            <shaderMaterial name={`earth-atmosphere-material-${scope}`} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} vertexShader={globeVertex} fragmentShader={atmosphereFragment} uniforms={atmosphereUniforms} />
          </mesh>
        </>
      ) : (
        <mesh name={`earth-map-${scope}`} onClick={event => event.stopPropagation()}>
          <planeGeometry name={`earth-map-geometry-${scope}`} args={[2, 1]} />
          <meshBasicMaterial name={`earth-map-material-${scope}`} map={textures[0]} color={dark ? `#D0DBE5` : `#FFFFFF`} />
        </mesh>
      )}
      {points.map(point => <VisitorMarker key={point.id} point={point} globe={mode === `globe`} reducedMotion={reducedMotion} active={point.id === selectedCountry} onSelect={onSelectCountry} />)}
    </>
  );
};

class GeographyBoundary extends Component<{ scope: string; dark: boolean; children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View {...elementProps(`geography-error`, this.props.scope)} style={styles.status}>
        <Text {...elementProps(`geography-error-title`, this.props.scope)} style={[styles.statusTitle, { color: this.props.dark ? `#EDF4F8` : `#17252F` }]}>Earth Couldn’t Load</Text>
        <Text {...elementProps(`geography-error-message`, this.props.scope)} style={styles.statusText}>Your visitor data is still available below</Text>
        <Pressable {...elementProps(`geography-retry`, this.props.scope)} accessibilityRole={`button`} onPress={this.props.onRetry} style={styles.retry}><RotateCcw {...elementProps(`geography-retry-icon`, this.props.scope)} size={14} color={`#D7FFF4`} /><Text {...elementProps(`geography-retry-label`, this.props.scope)} style={styles.retryText}>Retry</Text></Pressable>
      </View>
    );
  }
}

const Geography = (props: GeographyProps) => {
  const scope = useId();
  const controls = useRef<Controls>({ zoom: 1, reset: 0, paused: false, dragging: false, pauseRevision: 0, drag: { x: 0, y: 0 } });
  const origin = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(AppState.currentState !== `background`);
  const selected = props.points.find(point => point.id === props.selectedCountry);
  const space = props.mode === `globe`;
  const foreground = props.dark ? `#D6E4EC` : `#31414F`;
  const controlStyle = { backgroundColor: props.dark ? `#18242EEB` : `#FFFFFFED`, borderColor: props.dark ? `#30414D` : `#D9E1E7` };
  const onReady = useCallback(() => setReady(true), []);
  const onZoomChange = useCallback((value: number) => { controls.current.zoom = value; setZoom(value); }, []);
  const onFocusComplete = useCallback(() => { controls.current.paused = false; setPaused(false); }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(`change`, state => setActive(state === `active`));
    return () => subscription.remove();
  }, []);

  const changeZoom = (amount: number) => {
    const next = THREE.MathUtils.clamp(controls.current.zoom + amount, props.mode === `globe` ? 0.8 : 1, props.mode === `globe` ? 1.45 : 5);
    controls.current.zoom = next;
    setZoom(next);
  };

  const reset = () => {
    controls.current.zoom = 1;
    controls.current.reset += 1;
    controls.current.paused = false;
    setPaused(false);
    setZoom(1);
  };

  const retry = () => {
    useLoader.clear(THREE.TextureLoader, textureSources);
    setReady(false);
    setAttempt(value => value + 1);
  };

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => { origin.current = { ...controls.current.drag }; controls.current.dragging = true; },
    onPanResponderMove: (_, gesture) => { controls.current.drag = { x: origin.current.x + gesture.dx, y: origin.current.y + gesture.dy }; },
    onPanResponderRelease: () => { controls.current.dragging = false; },
    onPanResponderTerminate: () => { controls.current.dragging = false; },
  }), []);

  return (
    <View {...elementProps(`geography-panel`, scope)} style={[styles.container, { backgroundColor: space ? `#060C15` : props.dark ? `#101A24` : `#EDF2F5` }]}>
      <GeographyBoundary key={attempt} scope={scope} dark={space || props.dark} onRetry={retry}>
        <View {...elementProps(`geography-interaction-surface`, scope)} style={styles.canvas} {...responder.panHandlers} accessibilityLabel={props.mode === `globe` ? `Interactive Earth. Drag to rotate, use buttons to zoom` : `Satellite world map. Zoom in, then drag to pan`}>
          <Canvas dpr={[1, 1.5]} frameloop={active ? `always` : `never`} camera={{ fov: 38, near: 0.01, far: 30, position: [0, 0, 3.2] }} gl={{ alpha: true, antialias: true, powerPreference: `default` }} style={styles.canvas}>
            <Suspense fallback={null}><EarthScene {...props} controls={controls} onReady={onReady} onZoomChange={onZoomChange} onFocusComplete={onFocusComplete} /></Suspense>
          </Canvas>
        </View>
        {!ready && <View {...elementProps(`geography-loading`, scope)} style={[styles.status, { pointerEvents: `none` }]}><ActivityIndicator {...elementProps(`geography-loading-spinner`, scope)} color={`#32B99D`} /><Text {...elementProps(`geography-loading-label`, scope)} style={styles.statusText}>Loading Earth</Text></View>}
      </GeographyBoundary>
      {selected && ready && <View {...elementProps(`geography-selection`, scope)} style={[styles.selection, controlStyle, { pointerEvents: `none` }]}><View {...elementProps(`geography-selection-dot`, scope)} style={[styles.dot, { backgroundColor: markerColor }]} /><Text {...elementProps(`geography-selection-label`, scope)} numberOfLines={1} style={[styles.selectionText, { color: foreground }]}>{selected.label} · {selected.value.toLocaleString()}</Text></View>}
      <View {...elementProps(`geography-controls`, scope)} style={styles.controls}>
        <Pressable {...elementProps(`geography-zoom-in`, scope)} accessibilityRole={`button`} accessibilityLabel={`Zoom In`} accessibilityState={{ disabled: zoom >= (props.mode === `globe` ? 1.45 : 5) }} disabled={zoom >= (props.mode === `globe` ? 1.45 : 5)} onPress={() => changeZoom(props.mode === `globe` ? 0.15 : 0.5)} style={[styles.control, controlStyle]}><Plus {...elementProps(`geography-zoom-in-icon`, scope)} size={19} color={foreground} /></Pressable>
        <Pressable {...elementProps(`geography-zoom-out`, scope)} accessibilityRole={`button`} accessibilityLabel={`Zoom Out`} accessibilityState={{ disabled: zoom <= (props.mode === `globe` ? 0.8 : 1) }} disabled={zoom <= (props.mode === `globe` ? 0.8 : 1)} onPress={() => changeZoom(props.mode === `globe` ? -0.15 : -0.5)} style={[styles.control, controlStyle]}><Minus {...elementProps(`geography-zoom-out-icon`, scope)} size={19} color={foreground} /></Pressable>
        <Pressable {...elementProps(`geography-reset-view`, scope)} accessibilityRole={`button`} accessibilityLabel={`Reset View`} onPress={reset} style={[styles.control, controlStyle]}><RotateCcw {...elementProps(`geography-reset-view-icon`, scope)} size={18} color={foreground} /></Pressable>
        {props.mode === `globe` && !props.reducedMotion && <Pressable {...elementProps(`geography-toggle-rotation`, scope)} accessibilityRole={`button`} accessibilityLabel={paused ? `Resume Rotation` : `Pause Rotation`} onPress={() => { controls.current.pauseRevision += 1; controls.current.paused = !paused; setPaused(!paused); }} style={[styles.control, controlStyle]}>{paused ? <Play {...elementProps(`geography-resume-rotation-icon`, scope)} size={15} color={foreground} /> : <Pause {...elementProps(`geography-pause-rotation-icon`, scope)} size={15} color={foreground} />}</Pressable>}
      </View>
      <Pressable {...elementProps(`geography-texture-attribution`, scope)} accessibilityRole={`link`} accessibilityLabel={`Earth Textures By Solar System Scope, Creative Commons Attribution 4.0`} onPress={() => void Linking.openURL(`https://www.solarsystemscope.com/textures/`).catch(() => undefined)} style={[styles.attribution, { backgroundColor: space ? `#060C15D9` : props.dark ? `#101A24D9` : `#EDF2F5E6` }]}><ExternalLink {...elementProps(`geography-attribution-icon`, scope)} size={10} color={space || props.dark ? `#8DA1AF` : `#61717E`} /><Text {...elementProps(`geography-attribution-label`, scope)} style={[styles.attributionText, { color: space || props.dark ? `#8DA1AF` : `#61717E` }]}>Earth: Solar System Scope · CC BY 4.0</Text></Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  attributionText: { fontSize: 9, lineHeight: 13 },
  controls: { position: `absolute`, top: 12, right: 12, gap: 5 },
  retryText: { color: `#D7FFF4`, fontSize: 12, fontWeight: `600` },
  selectionText: { flexShrink: 1, fontSize: 11, fontWeight: `500` },
  statusText: { color: `#7F929F`, fontSize: 12, textAlign: `center` },
  statusTitle: { fontSize: 15, fontWeight: `600`, textAlign: `center` },
  container: { flex: 1, minHeight: 100, position: `relative`, overflow: `hidden`, borderRadius: 10 },
  control: { width: 32, height: 32, borderRadius: 7, borderWidth: 1, alignItems: `center`, justifyContent: `center` },
  status: { position: `absolute`, top: 0, left: 0, right: 0, bottom: 0, gap: 10, padding: 20, alignItems: `center`, justifyContent: `center` },
  retry: { gap: 6, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 18, flexDirection: `row`, alignItems: `center`, backgroundColor: `#1E564E` },
  attribution: { gap: 3, left: 7, bottom: 5, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 5, position: `absolute`, flexDirection: `row`, alignItems: `center` },
  selection: { position: `absolute`, left: 12, top: 12, maxWidth: `70%`, gap: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 6, flexDirection: `row`, alignItems: `center` },
});

export default Geography;
