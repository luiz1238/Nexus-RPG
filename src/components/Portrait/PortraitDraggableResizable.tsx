import { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import { clamp } from '../../utils';

type Position = { x: number; y: number };
type Size = { width: number; height: number };

type Props = {
  children: React.ReactNode;
  storageKey: string;
  defaultPosition: Position;
  defaultSize: Size;
  debug?: boolean;
  zIndex?: number;
  bounds?: { left: number; top: number; right: number; bottom: number };
  lockAspectRatio?: boolean;
};

const CANVAS = { width: 800, height: 800 };

export default function PortraitDraggableResizable({
  children,
  storageKey,
  defaultPosition,
  defaultSize,
  debug = false,
  zIndex = 1,
  bounds,
  lockAspectRatio = false,
}: Props) {
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [size, setSize] = useState<Size>(defaultSize);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`portrait-${storageKey}`) || 'null');
      if (saved) {
        if (saved.position) setPosition(saved.position);
        if (saved.size) setSize(saved.size);
      }
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  function save(pos: Position, sz: Size) {
    localStorage.setItem(`portrait-${storageKey}`, JSON.stringify({ position: pos, size: sz }));
  }

  function onDragStop(_e: any, data: { x: number; y: number }) {
    const b = bounds || { left: 0, top: 0, right: CANVAS.width, bottom: CANVAS.height };
    const x = clamp(data.x, b.left, b.right - size.width);
    const y = clamp(data.y, b.top, b.bottom - size.height);
    const pos = { x, y };
    setPosition(pos);
    save(pos, size);
  }

  function onResizeStop(_e: any, _dir: any, ref: HTMLElement) {
    const w = parseInt(ref.style.width);
    const h = parseInt(ref.style.height);
    const sz = { width: w, height: h };
    setSize(sz);
    save(position, sz);
  }

  if (!loaded) return null;

  return (
    <Draggable
      position={position}
      onStop={onDragStop}
      disabled={!debug}
      bounds={bounds || { left: 0, top: 0, right: CANVAS.width, bottom: CANVAS.height }}
      handle=".portrait-drag-handle"
    >
      <div style={{ position: 'absolute', left: position.x, top: position.y, zIndex }}>
        <Resizable
          size={size}
          onResizeStop={onResizeStop}
          enable={debug ? {
            top: true, bottom: true, left: true, right: true,
            topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
          } : false}
          lockAspectRatio={lockAspectRatio}
          style={{
            border: debug ? '2px dashed rgba(138,43,226,0.6)' : 'none',
            borderRadius: debug ? 4 : 0,
          }}
        >
          {debug && (
            <div
              className="portrait-drag-handle"
              style={{
                position: 'absolute',
                top: -8,
                left: -8,
                width: size.width + 16,
                height: 20,
                cursor: 'move',
                background: 'rgba(138,43,226,0.3)',
                borderRadius: 4,
                zIndex: 999,
              }}
            />
          )}
          {children}
        </Resizable>
      </div>
    </Draggable>
  );
}
