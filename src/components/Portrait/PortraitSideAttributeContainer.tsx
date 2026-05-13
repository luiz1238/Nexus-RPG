import { useEffect, useMemo, useState } from 'react';
import useRealtime from '../../hooks/useRealtime';
import styles from '../../styles/modules/Portrait.module.scss';
import PortraitDraggableResizable from './PortraitDraggableResizable';
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

export default function PortraitSideAttributeContainer(props: {
  sideAttribute: PortraitSideAttribute;
  debug?: boolean;
}) {
  const [sideAttribute, setSideAttribute] = useState(props.sideAttribute);
  const { on } = useRealtime();

  useEffect(() => {
    const unsub = on('playerAttributeChange', (payload) => {
      setSideAttribute((attr) => {
        if (attr === null || payload.attributeId !== attr.Attribute.id) return attr;
        return { value: payload.value, show: payload.show, Attribute: { ...attr.Attribute } };
      });
    });
    return () => { unsub?.(); };
  }, [on]);

  if (!sideAttribute) return null;

  return (
    <PortraitDraggableResizable
      storageKey="side-attribute"
      defaultPosition={{ x: 0, y: 450 }}
      defaultSize={{ width: 200, height: 120 }}
      debug={props.debug}
      zIndex={100}
    >
      <div className={styles.sideContainerInner}>
        <div className={styles.sideBackground}></div>
        <label
          className={`${styles.sideContent} atributo-secundario ${sideAttribute.Attribute.name}`}
          style={{ color: `#${sideAttribute.Attribute.color}` }}
        >
          {sideAttribute.show ? sideAttribute.value : '?'}
        </label>
      </div>
    </PortraitDraggableResizable>
  );
}
