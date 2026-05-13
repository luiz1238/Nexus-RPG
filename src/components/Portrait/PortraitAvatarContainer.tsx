import { useEffect, useRef, useState } from 'react';
import Fade from 'react-bootstrap/Fade';
import Image from 'react-bootstrap/Image';
import useRealtime from '../../hooks/useRealtime';
import styles from '../../styles/modules/Portrait.module.scss';
import api from '../../utils/api';

export type PortraitAttributeStatus = {
  value: boolean;
  attribute_status_id: number;
}[];

export default function PortraitAvatar(props: {
  attributeStatus: PortraitAttributeStatus;
  playerId: number;
}) {
  const [src, setSrc] = useState('#');
  const srcRef = useRef('#');
  const [showAvatar, setShowAvatar] = useState(false);
  const [attributeStatus, setAttributeStatus] = useState(props.attributeStatus);
  const previousStatusID = useRef(Number.MAX_SAFE_INTEGER);
  const { on } = useRealtime();

  const [diceColor, setDiceColor] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const color = params.get('dicecolor');
    if (color) setDiceColor(color);

    const id = attributeStatus.find((stat) => stat.value)?.attribute_status_id || 0;
    previousStatusID.current = id;
    api
      .get(`/sheet/player/avatar/${id}`, { params: { playerID: props.playerId } })
      .then((res) => {
        const newSrc = `${res.data.link}?v=${Date.now()}`;
        srcRef.current = newSrc;
        setSrc(newSrc);
      })
      .catch(() => {
        srcRef.current = '/avatar404.png';
        setSrc('/avatar404.png');
      });
  }, []);

  useEffect(() => {
    on('playerAttributeStatusChange', (payload) => {
      if (payload.playerId !== props.playerId) return;
      const newStatus = [...attributeStatus];

      const index = newStatus.findIndex((stat) => stat.attribute_status_id === payload.attStatusId);
      if (index === -1) return;

      newStatus[index].value = payload.value;

      const newStatusID = newStatus.find((stat) => stat.value)?.attribute_status_id || 0;
      setAttributeStatus(newStatus);

      if (newStatusID !== previousStatusID.current) {
        previousStatusID.current = newStatusID;
        api
          .get(`/sheet/player/avatar/${newStatusID}`, {
            params: { playerID: props.playerId },
          })
          .then((res) => {
            if (res.data.link === srcRef.current.split('?')[0]) return;
            setShowAvatar(false);
            const newSrc = `${res.data.link}?v=${Date.now()}`;
            srcRef.current = newSrc;
            setSrc(newSrc);
          })
          .catch(() => {
            srcRef.current = '/avatar404.png';
            setSrc('/avatar404.png');
          });
      }
    });
  }, [on, attributeStatus, props.playerId]);

  return (
    <Fade in={showAvatar}>
      <div
        style={{
          filter: diceColor ? `drop-shadow(0 0 15px #${diceColor})` : 'none',
        }}
      >
        <Image
          src={src}
          alt='Avatar'
          onError={() => setSrc('/avatar404.png')}
          onLoad={() => setShowAvatar(true)}
          className={styles.avatar}
        />
      </div>
    </Fade>
  );
}
