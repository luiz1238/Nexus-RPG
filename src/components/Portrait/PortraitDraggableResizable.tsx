import { useCallback, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable, ResizeCallbackData } from 're-resizable';
import { clamp } from '../../utils';
import api from '../../utils/api';
import useRealtime from '../../hooks/useRealtime';

export type LayoutData = {
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  fontSize: number;
};

type Position = { x: number; y: number };
type Size = { width: number; height: number };

type Props = {
  children: (fontSize: number) => React.ReactNode;
  storageKey: string;
  label: string;
  defaultPosition: Position;
  defaultSize: Size;
  defaultFontSize?: number;
  layout?: LayoutData | null;
  debug?: boolean;
  zIndex?: number;
  bounds?: { left: number; top: number; right: number; bottom: number };
  lockAspectRatio?: boolean;
  playerId: number;
};

const CANVAS = { width: 800, height: 800 };

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
  bounds,
  lockAspectRatio = false,
  playerId,
}: Props) {
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [size, setSize] = useState<Size>(defaultSize);
  const [rotation, setRotation] = useState(0);
  const [fontSize, setFontSize] = useState(defaultFontSize);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const { on } = useRealtime();

  useEffect(() => {
    if (layout) {
      setPosition({ x: layout.posX, y: layout.posY });
      setSize({ width: layout.width, height: layout.height });
      setRotation(layout.rotation);
      setFontSize(layout.fontSize);
    }
    setLoaded(true);
  }, [layout]);

  useEffect(() => {
    const unsub = on('portraitLayoutChange', (payload) => {
      if (payload.playerId !== playerId) return;
      if (payload.element !== storageKey) return;
      setPosition({ x: payload.posX, y: payload.posY });
      setSize({ width: payload.width, height: payload.height });
      setRotation(payload.rotation);
      setFontSize(payload.fontSize);
    });
    return () => { unsub?.(); };
  }, [on, playerId, storageKey]);

  function persist(pos: Position, sz: Size, rot: number, fs: number) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      api.post('/sheet/player/layout', {
        element: storageKey,
        posX: pos.x,
        posY: pos.y,
        width: sz.width,
        height: sz.height,
        rotation: rot,
        fontSize: fs,
      }).catch(() => {});
    }, 300);
  }

  function onDragStop(_e: any, data: { x: number; y: number }) {
    const b = bounds || { left: 0, top: 0, right: CANVAS.width, bottom: CANVAS.height };
    const x = clamp(data.x, b.left, b.right - size.width);
    const y = clamp(data.y, b.top, b.bottom - size.height);
    const pos = { x, y };
    setPosition(pos);
    persist(pos, size, rotation, fontSize);
  }

  function onResize(_e: any, _dir: any, _ref: HTMLElement, delta: ResizeCallbackData) {
    const w = delta.width + size.width;
    const h = delta.height + size.height;
    const sz = { width: Math.round(w), height: Math.round(h) };
    const scale = sz.height / defaultSize.height;
    const fs = Math.round(defaultFontSize * scale);
    setSize(sz);
    setFontSize(fs);
  }

  function onResizeStop(_e: any, _dir: any, _ref: HTMLElement, delta: ResizeCallbackData) {
    const w = delta.width + size.width;
    const h = delta.height + size.height;
    const sz = { width: Math.round(w), height: Math.round(h) };
    const scale = sz.height / defaultSize.height;
    const fs = Math.round(defaultFontSize * scale);
    setSize(sz);
    setFontSize(fs);
    persist(position, sz, rotation, fs);
  }

  function onRotationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rot = parseInt(e.target.value) || 0;
    setRotation(rot);
    persist(position, size, rot, fontSize);
  }

  if (!loaded) return null;

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    zIndex,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    overflow: 'hidden',
  };

  if (!debug) {
    return (
      <div style={wrapperStyle}>
        {children(fontSize)}
      </div>
    );
  }

  return (
    <Draggable
      position={position}
      onStop={onDragStop}
      bounds={bounds || { left: 0, top: 0, right: CANVAS.width, bottom: CANVAS.height }}
      handle=".portrait-drag-handle"
    >
      <div style={{ position: 'absolute', zIndex }}>
        <div
          className="portrait-drag-handle"
          style={{
            width: size.width,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, color: '#c4a7e7' }}>
          <span>Rot:</span>
          <input
            type="range"
            min={-180}
            max={180}
            value={rotation}
            onChange={onRotationChange}
            style={{ width: 100, accentColor: '#8a2be2' }}
          />
          <span>{rotation}°</span>
          <span style={{ marginLeft: 8 }}>Fonte: {fontSize}px</span>
        </div>
        <Resizable
          size={size}
          onResize={onResize}
          onResizeStop={onResizeStop}
          enable={{
            top: true, bottom: true, left: true, right: true,
            topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
          }}
          lockAspectRatio={lockAspectRatio}
          style={{
            border: '2px dashed rgba(138,43,226,0.6)',
            borderRadius: 4,
            transform: rotation ? `rotate(${rotation}deg)` : undefined,
            overflow: 'hidden',
          }}
        >
          {children(fontSize)}
        </Resizable>
      </div>
    </Draggable>
  );
}
