import { useEffect, useRef, useState } from 'react';
import Col from 'react-bootstrap/Col';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import useRealtime from '../../hooks/useRealtime';
import DataContainer from '../DataContainer';

const highlightStyle = { color: '#00a000', fontWeight: 'bold' };

type Dice = { name: string; dices: string; results: string };

export default function DiceList(props: { players: { id: number; name: string }[] }) {
  const [values, setValues] = useState<Dice[]>([]);
  const wrapper = useRef<HTMLDivElement>(null);
  const { on } = useRealtime();
  const componentDidMount = useRef(false);

  useEffect(() => {
    setValues(JSON.parse(localStorage.getItem('admin_dice_history') || '[]') as Dice[]);

  const unsub = on('diceResult', (payload) => {
    addDiceEntry(payload);
  });

  const unsubAdmin = on('diceResultAdmin', (payload) => {
    addDiceEntry(payload);
  });

  function addDiceEntry(payload: { playerId: number; results: any[]; dices: any }) {
    const playerName =
      props.players.find((p) => p.id === payload.playerId)?.name || 'Desconhecido';

    const isArray = Array.isArray(payload.dices);

    const dices = isArray
      ? payload.dices.map((dice: { num: number; roll: number }) => {
          const num = dice.num;
          const roll = dice.roll;
          return num > 0 ? `${num}d${roll}` : roll;
        })
      : payload.dices.num > 0
      ? [`${payload.dices.num}d${payload.dices.roll}`]
      : [payload.dices.roll];

    const results = payload.results.map((res: { roll: number; resultType?: { description: string } }) => {
      const roll = res.roll;
      const description = res.resultType?.description;
      if (description) return `${roll} (${description})`;
      return roll;
    });

    const message = {
      name: playerName,
      dices: dices.join(', '),
      results: results.join(', '),
    };

    setValues((values) => {
      if (values.length > 10) {
        const newValues = [...values];
        newValues.unshift(message);
        newValues.splice(newValues.length - 1, 1);
        return newValues;
      }
      return [message, ...values];
    });
  }
    return () => { unsub?.(); unsubAdmin?.(); };
  }, [on]);

	useEffect(() => {
		if (wrapper.current) wrapper.current.scrollTo({ top: 0, behavior: 'auto' });

		if (componentDidMount.current) {
			localStorage.setItem('admin_dice_history', JSON.stringify(values));
			return;
		}
		componentDidMount.current = true;
	}, [values]);

	return (
		<DataContainer xs={12} lg title='Histórico' addButton={{
			name: 'Limpar',
			onAdd: () => {
				setValues([]);
			}
		}}>
			<Row>
				<Col>
					<div className='w-100 wrapper' ref={wrapper}>
						<ListGroup variant='flush' className='text-center'>
							{values.map((val, index) => (
								<ListGroup.Item key={index}>
									<span style={highlightStyle}>{val.name} </span>
									rolou
									<span style={highlightStyle}> {val.dices} </span>e tirou
									<span style={highlightStyle}> {val.results}</span>.
								</ListGroup.Item>
							))}
						</ListGroup>
					</div>
				</Col>
			</Row>
		</DataContainer>
	);
}
