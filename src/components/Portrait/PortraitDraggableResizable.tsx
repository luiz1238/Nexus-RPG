import { useEffect, useRef, useState } from 'react';
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
  bounds?: { left: number; top: number; right: number; bottom: number };
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
  playerId,
}: Props) {
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const { on } = useRealtime();

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
      setPosition({ x: payload.posX, y: payload.posY });
      setScale(payload.scale || 1);
      setRotation(payload.rotation || 0);
    });
    return () => { unsub?.(); };
  }, [on, playerId, storageKey]);

  function persist(pos: Position, sc: number, rot: number) {
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
    const b = bounds || { left: 0, top: 0, right: CANVAS.width, bottom: CANVAS.height };
    const maxX = b.right - defaultSize.width * scale;
    const maxY = b.bottom - defaultSize.height * scale;
    const x = clamp(data.x, b.left, maxX);
    const y = clamp(data.y, b.top, maxY);
    const pos = { x, y };
    setPosition(pos);
    persist(pos, scale, rotation);
  }

  function onScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const sc = parseInt(e.target.value) / 100;
    setScale(sc);
    persist(position, sc, rotation);
  }

  function onRotationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rot = parseInt(e.target.value) || 0;
    setRotation(rot);
    persist(position, scale, rot);
  }

  if (!loaded) return null;

  const effectiveFontSize = Math.round(defaultFontSize * scale);

  const contentDiv = (
    <div style={{
      width: defaultSize.width,
      height: defaultSize.height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }}>
      {children}
    </div>
  );

  if (!debug) {
    return (
      <div style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        zIndex,
      }}>
        {contentDiv}
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
      <div style={{
        position: 'absolute',
        zIndex,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}>
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
          width: defaultSize.width * scale,
          height: defaultSize.height * scale,
          border: '2px dashed rgba(138,43,226,0.6)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          {contentDiv}
        </div>
      </div>
    </Draggable>
  );
}
