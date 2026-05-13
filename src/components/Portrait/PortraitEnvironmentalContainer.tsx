import { Fragment, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Fade from 'react-bootstrap/Fade';
import Draggable from 'react-draggable';
import useRealtime from '../../hooks/useRealtime';
import styles from '../../styles/modules/Portrait.module.scss';
import { clamp } from '../../utils';
import type { Environment } from '../../utils/config';
import { getAttributeStyle } from '../../utils/style';
import type { PortraitEnvironmentOrientation } from '../Modals/GetPortraitModal';

type PortraitPlayerName = { name: string; show: boolean };

type PortraitAttributes = {
  value: number;
  Attribute: {
    id: number;
    name: string;
    color: string;
  };
  maxValue: number;
  show: boolean;
}[];

const bounds = {
  top: 0,
  bottom: 450,
  left: 0,
  right: 0,
};

export default function PortraitEnvironmentalContainer(props: {
  environment: Environment;
  attributes: PortraitAttributes;
  playerName: PortraitPlayerName;
  playerId: number;
  debug: boolean;
  nameOrientation: PortraitEnvironmentOrientation;
}) {
  const [environment, setEnvironment] = useState(props.environment);
  const [diceColor, setDiceColor] = useState('000000');
  const { on } = useRealtime();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const color = params.get('dicecolor');
    if (color) {
      setDiceColor(color);
    }
  }, []);

  useEffect(() => {
    const unsub = on('environmentChange', (payload) => setEnvironment(payload.value as Environment));
    return () => { unsub?.(); };
  }, [on]);

  let divStyle: CSSProperties = { width: 800 };

  props.nameOrientation === 'Direita'
    ? (divStyle = { ...divStyle, left: 430, textAlign: 'start' })
    : (divStyle = { ...divStyle, left: 0, textAlign: 'end' });

  return (
    <div className={styles.container} style={divStyle}>
      <PortraitAttributesContainer
        environment={environment}
        attributes={props.attributes}
        playerId={props.playerId}
        debug={props.debug}
      />
      <PortraitNameContainer
        environment={environment}
        playerName={props.playerName}
        playerId={props.playerId}
        debug={props.debug}
        diceColor={diceColor}
      />
    </div>
  );
}

function PortraitAttributesContainer(props: {
  environment: Environment;
  attributes: PortraitAttributes;
  playerId: number;
  debug: boolean;
}) {
  const [attributes, setAttributes] = useState(props.attributes);
  const [positionY, setPositionY] = useState(0);
  const { on } = useRealtime();

  useEffect(() => {
    setPositionY(Number(localStorage.getItem('attribute-pos-y') || 300));
  }, []);

  useEffect(() => {
    const unsub = on('playerAttributeChange', (payload) => {
      if (payload.playerId !== props.playerId) return;

      setAttributes((attributes) => {
        const index = attributes.findIndex((attr) => attr.Attribute.id === payload.attributeId);
        if (index === -1) return attributes;

        const newAttributes = [...attributes];

        newAttributes[index].value = payload.value;
        newAttributes[index].maxValue = payload.maxValue;
        newAttributes[index].show = payload.show;

        return newAttributes;
      });
    });
    return () => { unsub?.(); };
  }, [on, props.playerId]);

  return (
    <Draggable
      axis='y'
      position={{ x: 0, y: positionY }}
      bounds={bounds}
      onStop={(_ev, data) => {
        const posY = clamp(data.y, bounds.top, bounds.bottom);
        setPositionY(posY);
        localStorage.setItem('attribute-pos-y', posY.toString());
      }}>
      <Fade in={props.debug || props.environment === 'combat'}>
        <div className={styles.combat}>
          {attributes.map((attr) => (
            <Fragment key={attr.Attribute.id}>
              <span
                className={`${styles.attribute} atributo-primario ${attr.Attribute.name}`}
                style={getAttributeStyle(attr.Attribute.color)}>
                <label>{attr.show ? `${attr.value}/${attr.maxValue}` : '?/?'}</label>
              </span>
              <br />
            </Fragment>
          ))}
        </div>
      </Fade>
    </Draggable>
  );
}

function PortraitNameContainer(props: {
  environment: Environment;
  playerName: PortraitPlayerName;
  playerId: number;
  debug: boolean;
  diceColor: string;
}) {
  const [playerName, setPlayerName] = useState(props.playerName);
  const [positionY, setPositionY] = useState(0);
  const { on } = useRealtime();

  useEffect(() => {
    setPositionY(Number(localStorage.getItem('name-pos-y') || 300));
  }, []);

  useEffect(() => {
    const unsub1 = on('playerNameChange', (payload) => {
      if (payload.playerId !== props.playerId) return;
      setPlayerName((pn) => ({ ...pn, name: payload.value }));
    });

    const unsub2 = on('playerNameShowChange', (payload) => {
      if (payload.playerId !== props.playerId) return;
      setPlayerName((pn) => ({ ...pn, show: payload.show }));
    });
    return () => { unsub1?.(); unsub2?.(); };
  }, [on, props.playerId]);

  return (
    <Draggable
      axis='y'
      position={{ x: 0, y: positionY }}
      bounds={bounds}
      onStop={(_ev, data) => {
        const posY = clamp(data.y, bounds.top, bounds.bottom);
        setPositionY(posY);
        localStorage.setItem('name-pos-y', posY.toString());
      }}>
      <Fade in={props.debug || props.environment === 'idle'}>
        <div className={styles.nameContainer}>
        <label
          className={`${styles.name} nome`}
          style={{
            display: 'inline-block',
            transform: 'rotate(-8deg)',
            color: `#${props.diceColor}`,
            textShadow: `2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0 0 10px #${props.diceColor}, 0 0 20px #${props.diceColor}`,
            textAlign: 'center',
            lineHeight: '1.1',
          }}
        >
            {playerName.show ? playerName.name || 'Desconhecido' : '???'}
          </label>
        </div>
      </Fade>
    </Draggable>
  );
}
