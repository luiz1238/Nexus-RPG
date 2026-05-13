import { useRef, useState } from 'react';
import type { DiceRoll, DiceRollModalProps } from '../components/Modals/DiceRollModal';

export type DiceRollEvent = (diceRoll: DiceRoll) => void;

export default function useDiceRoll(npcId?: number): [DiceRollModalProps, DiceRollEvent] {
  const [diceRoll, setDiceRoll] = useState<DiceRoll & { _key: number }>({ dices: null, _key: 0 });

  const lastRoll = useRef<DiceRoll>({ dices: null });
  const rollKey = useRef(0);

  const onDiceRoll: DiceRollEvent = ({ dices, resolverKey, onResult }) => {
    const roll = { dices, resolverKey, onResult };
    lastRoll.current = roll;
    rollKey.current++;
    setDiceRoll({ ...roll, _key: rollKey.current });
  };

  const diceRollModalProps: DiceRollModalProps = {
    ...diceRoll,
    onHide: () => setDiceRoll({ dices: null, _key: 0 }),
    onRollAgain: () => {
      rollKey.current++;
      setDiceRoll({ ...lastRoll.current, _key: rollKey.current });
    },
    npcId,
  };

  return [diceRollModalProps, onDiceRoll];
}
