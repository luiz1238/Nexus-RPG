import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { clamp } from '../../utils';
import api from '../../utils/api';
import useRealtime from '../../hooks/useRealtime';

export type LayoutData = {
  posX: number;
  posY: number;
  scale: number;
  rotation: number;
  fontSize: number;
};

type Position = { x: number; y: number };

type Props = {
  children: React.ReactNode;
  storageKey: string;
  label: string;
  defaultPosition: Position;
  defaultSize: { width: number; height: number };
  defaultFontSize?: number;
  layout?: LayoutData | null;
  debug?: boolean;
  zIndex?: number;
  playerId: number;
};

const CANVAS = { width: 800, height: 800 };
const EDIT_GRACE_MS = 1500;
const CONTROLS_WIDTH = 200;
const CONTROLS_HEIGHT = 60;

type ResetFn = () => void;
const PortraitResetContext = createContext<ResetFn | null>(null);

export function PortraitResetProvider({ children }: { children: React.ReactNode }) {
  const resetFns = useRef<Set<ResetFn>>(new Set());
  const register = useCallback((fn: ResetFn) => {
    resetFns.current.add(fn);
    return () => { resetFns.current.delete(fn); };
  }, []);
  const resetAll = useCallback(() => {
    resetFns.current.forEach((fn) => fn());
  }, []);
  return (
    <PortraitResetContext.Provider value={resetAll}>
      <PortraitResetRegisterContext.Provider value={register}>
        {children}
      </PortraitResetRegisterContext.Provider>
    </PortraitResetContext.Provider>
  );
}

const PortraitResetRegisterContext = createContext<((fn: ResetFn) => () => void) | null>(null);

export function usePortraitReset() {
  const reset = useContext(PortraitResetContext);
  if (!reset) throw new Error('usePortraitReset must be used within PortraitResetProvider');
  return reset;
}

export default function PortraitDraggableResizable({
  children,
  storageKey,
  label,
  defaultPosition,
  defaultSize,
  defaultFontSize = 48,
  layout,
  debug = false,
  zIndex = 1,
  playerId,
}: Props) {
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const editTimeout = useRef<NodeJS.Timeout | null>(null);
  const isEditing = useRef(false);
  const { on } = useRealtime();
  const registerReset = useContext(PortraitResetRegisterContext);

  useEffect(() => {
    if (layout) {
      setPosition({ x: layout.posX, y: layout.posY });
      setScale(layout.scale || 1);
      setRotation(layout.rotation || 0);
    }
    setLoaded(true);
  }, [layout]);

  useEffect(() => {
    const unsub = on('portraitLayoutChange', (payload) => {
      if (payload.playerId !== playerId) return;
      if (payload.element !== storageKey) return;
      if (isEditing.current) return;
      setPosition({ x: payload.posX, y: payload.posY });
      setScale(payload.scale || 1);
      setRotation(payload.rotation || 0);
    });
    return () => { unsub?.(); };
  }, [on, playerId, storageKey]);

  useEffect(() => {
    if (!registerReset) return;
    return registerReset(resetToDefault);
  }, [registerReset]);

  function markEditing() {
    isEditing.current = true;
    if (editTimeout.current) clearTimeout(editTimeout.current);
    editTimeout.current = setTimeout(() => {
      isEditing.current = false;
    }, EDIT_GRACE_MS);
  }

  function persist(pos: Position, sc: number, rot: number) {
    markEditing();
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    const effectiveFontSize = Math.round(defaultFontSize * sc);
    saveTimeout.current = setTimeout(() => {
      api.post('/sheet/player/layout', {
        element: storageKey,
        playerId,
        posX: pos.x,
        posY: pos.y,
        scale: sc,
        rotation: rot,
        fontSize: effectiveFontSize,
      }).catch(console.error);
    }, 500);
  }

  function onDragStop(_e: any, data: { x: number; y: number }) {
    const maxRight = CANVAS.width - (debug ? CONTROLS_WIDTH : defaultSize.width * scale);
    const maxBottom = CANVAS.height - (debug ? CONTROLS_HEIGHT : defaultSize.height * scale);
    const x = clamp(data.x, 0, maxRight);
    const y = clamp(data.y, 0, maxBottom);
    const pos = { x, y };
    setPosition(pos);
    persist(pos, scale, rotation);
  }

  function onScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const sc = Number(e.target.value) / 100;
    setScale(sc);
    persist(position, sc, rotation);
  }

  function onRotationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rot = Number(e.target.value) || 0;
    setRotation(rot);
    persist(position, scale, rot);
  }

  function resetToDefault() {
    const pos = defaultPosition;
    setPosition(pos);
    setScale(1);
    setRotation(0);
    persist(pos, 1, 0);
  }

  if (!loaded) return null;

  const contentWrapperStyle: React.CSSProperties = {
    width: defaultSize.width,
    height: defaultSize.height,
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: 'top left',
  };

  const dragBounds = {
    left: 0,
    top: 0,
    right: CANVAS.width - CONTROLS_WIDTH,
    bottom: CANVAS.height - CONTROLS_HEIGHT,
  };

  if (!debug) {
    return (
      <div style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex,
      }}>
        <div style={contentWrapperStyle}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <Draggable
      position={position}
      onStop={onDragStop}
      bounds={dragBounds}
      handle=".portrait-drag-handle"
    >
      <div style={{
        position: 'absolute',
        zIndex,
      }}>
        <div
          className="portrait-drag-handle"
          style={{
            width: CONTROLS_WIDTH,
            height: 24,
            cursor: 'move',
            background: 'rgba(138,43,226,0.5)',
            borderRadius: 4,
            marginBottom: 2,
            fontSize: 11,
            color: '#fff',
            textAlign: 'center',
            lineHeight: '24px',
            fontWeight: 'bold',
            userSelect: 'none',
          }}
        >
          {label}
        </div>
        <div style={{
          width: CONTROLS_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginBottom: 4,
          fontSize: 10,
          color: '#c4a7e7',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 24 }}>Rot</span>
            <input
              type="range"
              min={-180}
              max={180}
              value={rotation}
              onChange={onRotationChange}
              style={{ width: 100, accentColor: '#8a2be2' }}
            />
            <span style={{ width: 36 }}>{rotation}°</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 24 }}>Esc</span>
            <input
              type="range"
              min={10}
              max={300}
              value={Math.round(scale * 100)}
              onChange={onScaleChange}
              style={{ width: 100, accentColor: '#8a2be2' }}
            />
            <span style={{ width: 36 }}>{Math.round(scale * 100)}%</span>
          </div>
        </div>
        <div style={{
          border: '2px dashed rgba(138,43,226,0.6)',
          borderRadius: 4,
          display: 'inline-block',
        }}>
          <div style={contentWrapperStyle}>
            {children}
          </div>
        </div>
      </div>
    </Draggable>
  );
}
