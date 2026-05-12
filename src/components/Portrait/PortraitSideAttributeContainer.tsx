import { useEffect, useMemo, useState } from 'react';
import type { ControlPosition, DraggableData, DraggableEvent } from 'react-draggable';
import Draggable from 'react-draggable';
import useRealtime from '../../hooks/useRealtime';
import styles from '../../styles/modules/Portrait.module.scss';
import { clamp } from '../../utils';
import { getAttributeStyle } from '../../utils/style';

type PortraitSideAttribute = {
  value: number;
  show: boolean;
  Attribute: {
    id: number;
    name: string;
    color: string;
  };
} | null;

const bounds = {
  bottom: 475,
  left: 5,
  top: 5,
  right: 215,
};

export default function PortraitSideAttributeContainer(props: {
  sideAttribute: PortraitSideAttribute;
}) {
  const [sideAttribute, setSideAttribute] = useState(props.sideAttribute);
  const [position, setPosition] = useState<ControlPosition>({ x: 0, y: 0 });
  const { on } = useRealtime();

  useEffect(() => {
    setPosition(
      (JSON.parse(
        localStorage.getItem('side-attribute-pos') || 'null'
      ) as ControlPosition) || { x: 0, y: 420 }
    );
  }, []);

  useEffect(() => {
    on('playerAttributeChange', (payload) => {
      setSideAttribute((attr) => {
        if (attr === null || payload.attributeId !== attr.Attribute.id) return attr;
        return { value: payload.value, show: payload.show, Attribute: { ...attr.Attribute } };
      });
    });
  }, [on]);

  const attributeStyle = useMemo(
    () => getAttributeStyle(sideAttribute?.Attribute.color || 'ffffff'),
    []
  );

  if (!sideAttribute) return null;

  function onDragStop(_ev: DraggableEvent, data: DraggableData) {
    const pos = {
      x: clamp(data.x, bounds.left, bounds.right),
      y: clamp(data.y, bounds.top, bounds.bottom),
    };
    setPosition(pos);
    localStorage.setItem('side-attribute-pos', JSON.stringify(pos));
  }

  return (
    <Draggable axis='both' onStop={onDragStop} position={position} bounds={bounds}>
      <div className={styles.sideContainer}>
        <div className={styles.sideBackground}></div>
        <label
          className={`${styles.sideContent} atributo-secundario ${sideAttribute.Attribute.name}`}
          style={{ color: `#${sideAttribute.Attribute.color}` }}
        >
          {sideAttribute.show ? sideAttribute.value : '?'}
        </label>
      </div>
    </Draggable>
  );
}
