import { useEffect, useRef, useState } from 'react';
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
  children: React.ReactNode;
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
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const { on } = useRealtime();

  useEffect(() => {
    if (layout) {
      setPosition({ x: layout.posX, y: layout.posY });
      setSize({ width: layout.width, height: layout.height });
      setRotation(layout.rotation);
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
    });
    return () => { unsub?.(); };
  }, [on, playerId, storageKey]);

  function persist(pos: Position, sz: Size, rot: number) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    const effectiveFontSize = Math.round(defaultFontSize * (sz.height / defaultSize.height));
    saveTimeout.current = setTimeout(() => {
      api.post('/sheet/player/layout', {
        element: storageKey,
        playerId,
        posX: pos.x,
        posY: pos.y,
        width: sz.width,
        height: sz.height,
        rotation: rot,
        fontSize: effectiveFontSize,
      }).catch(() => {});
    }, 300);
  }

  function onDragStop(_e: any, data: { x: number; y: number }) {
    const b = bounds || { left: 0, top: 0, right: CANVAS.width, bottom: CANVAS.height };
    const x = clamp(data.x, b.left, b.right - size.width);
    const y = clamp(data.y, b.top, b.bottom - size.height);
    const pos = { x, y };
    setPosition(pos);
    persist(pos, size, rotation);
  }

  function onResizeStop(_e: any, _dir: any, ref: HTMLElement) {
    const w = parseFloat(ref.style.width) || size.width;
    const h = parseFloat(ref.style.height) || size.height;
    const sz = { width: Math.round(w), height: Math.round(h) };
    setSize(sz);
    persist(position, sz, rotation);
  }

  function onRotationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rot = parseInt(e.target.value) || 0;
    setRotation(rot);
    persist(position, size, rot);
  }

  if (!loaded) return null;

  const scaleX = size.width / defaultSize.width;
  const scaleY = size.height / defaultSize.height;
  const effectiveFontSize = Math.round(defaultFontSize * scaleY);

  const contentDiv = (
    <div style={{
      width: defaultSize.width,
      height: defaultSize.height,
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: 'top left',
    }}>
      {children}
    </div>
  );

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
    return <div style={wrapperStyle}>{contentDiv}</div>;
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
            width: 200,
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
          width: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 4,
          fontSize: 10,
          color: '#c4a7e7',
          flexWrap: 'wrap',
        }}>
          <span>Rot:</span>
          <input
            type="range"
            min={-180}
            max={180}
            value={rotation}
            onChange={onRotationChange}
            style={{ width: 70, accentColor: '#8a2be2' }}
          />
          <span>{rotation}°</span>
          <span style={{ marginLeft: 4 }}>≈{effectiveFontSize}px</span>
        </div>
        <Resizable
          size={size}
          onResizeStop={onResizeStop}
          enable={{
            top: true, bottom: true, left: true, right: true,
            topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
          }}
          lockAspectRatio={lockAspectRatio}
          style={{
            border: '2px dashed rgba(138,43,226,0.6)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {contentDiv}
        </Resizable>
      </div>
    </Draggable>
  );
}
