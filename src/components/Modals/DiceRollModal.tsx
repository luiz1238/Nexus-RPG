import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Fade from 'react-bootstrap/Fade';
import Spinner from 'react-bootstrap/Spinner';
import { clamp } from '../../utils';
import SheetModal from './SheetModal';
import { DiceRequest, DiceResolverKey, DiceResponse } from '../../utils/dice';
import api from '../../utils/api';
import { ErrorLogger } from '../../contexts';

export type DiceRoll = {
	dices: (Omit<DiceRequest, 'num'> & { num?: number }) | DiceRequest[] | null;
	resolverKey?: DiceResolverKey;
	onResult?: (result: DiceResponse[]) => void | DiceResponse[];
};

export type DiceRollModalProps = DiceRoll & {
  onHide: () => void;
  onRollAgain: () => void;
  npcId?: number;
  _key?: number;
};

export default function DiceRollModal(props: DiceRollModalProps) {
	const [dices, setDices] = useState(props.dices);
	const[num, setNum] = useState(1);
	const [diceRoll, setDiceRoll] = useState<DiceRollResult>({ dices: null });
	const lastRoll = useRef<DiceRollResult>({ dices: null });
	const diceRef = useRef<DiceRollResult | null>(null);

	useEffect(() => {
		if (props.dices === null) return;
		if (Array.isArray(props.dices))
			return roll({
				dices: props.dices,
				onResult: props.onResult,
				resolverKey: props.resolverKey,
			});
		else if (props.dices.num) {
			const dices = {
				...props.dices,
				num: props.dices.num,
			};
			return roll({
				dices,
				onResult: props.onResult,
				resolverKey: props.resolverKey,
			});
		}
		setDices(props.dices);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.dices]);

	function onNumChange(coeff: number) {
		setNum((n) => {
			return clamp(n + coeff, 1, 9);
		});
	}

	function onExited() {
		setNum(1);
		if (diceRef.current) {
			setDiceRoll(diceRef.current);
			diceRef.current = null;
		}
	}

	function roll(dice?: DiceRollResult) {
		if (dice) {
			lastRoll.current = dice;
			return setDiceRoll(dice);
		}
		if (dices === null || Array.isArray(dices)) return;

		const roll = {
			dices: { ...dices, num },
			onResult: props.onResult,
			resolverKey: props.resolverKey,
		};
		lastRoll.current = roll;
		diceRef.current = roll;

		setDices(null);
	}

	return (
		<>
			<SheetModal
				title='Rolagem de Dados'
				show={dices !== null}
				onHide={() => setDices(null)}
				onExited={onExited}
				applyButton={{
					name: 'Rolar',
					onApply: () => roll(),
				}}
				centered>
				<Container fluid className='text-center'>
					<Row className='mb-1 justify-content-center'>
						<Col>Número de Dados</Col>
					</Row>
					<Row className='justify-content-center'>
						<Col xs='auto'>
							<Button variant='secondary' onClick={() => onNumChange(-1)} size='sm'>
								-
							</Button>
						</Col>
						<Col
							xs='auto'
							className='align-self-center'
							style={{ width: '1rem', padding: 0 }}>
							{num}
						</Col>
						<Col xs='auto'>
							<Button variant='secondary' onClick={() => onNumChange(1)} size='sm'>
								+
							</Button>
						</Col>
					</Row>
				</Container>
			</SheetModal>
        <DiceRollResultModal
          {...diceRoll}
          npcId={props.npcId}
          _key={props._key}
          onHide={() => {
            setDiceRoll({ dices: null });
          }}
          onCloseModal={() => props.onHide()}
          onRollAgain={() => setDiceRoll({ ...lastRoll.current, _key: (props._key || 0) + 1 })}
        />
		</>
	);
}

type DiceRollResult = Omit<DiceRoll, 'dices'> & {
  dices: DiceRequest | DiceRequest[] | null;
  _key?: number;
};

type DiceRollResultModalProps = Omit<
  DiceRollModalProps,
  'dices' | 'resolverKey' | 'onResult'
> &
  DiceRollResult & { onCloseModal?: () => void };

type DisplayDice = {
	roll: number | string;
	description?: number | string;
};

function DiceRollResultModal(props: DiceRollResultModalProps) {
	const[diceResults, setDiceResults] = useState<DiceResponse[]>([]);
	const[descriptionFade, setDescriptionFade] = useState(false);
	
	// Estado para a Cor do Dado escolhida pelo jogador (Roxo Neon padrão)
	const [diceColor, setDiceColor] = useState('#8a2be2');

	const logError = useContext(ErrorLogger);

	const rollAgain = useRef(false);
	const descriptionDelayTimeout = useRef<NodeJS.Timeout | null>(null);

	// Carrega a cor salva assim que a tela abre
	useEffect(() => {
		const savedColor = localStorage.getItem('playerDiceColor');
		if (savedColor) setDiceColor(savedColor);
	},[]);

	// Salva a cor no navegador quando o jogador mudar
	function handleColorChange(color: string) {
		setDiceColor(color);
		localStorage.setItem('playerDiceColor', color);
	}

	const result: DisplayDice | undefined = useMemo(() => {
		if (diceResults.length === 1)
			return {
				roll: diceResults[0].roll,
				description: diceResults[0].resultType?.description,
			};
		else if (diceResults.length > 1) {
			if (Array.isArray(props.dices)) {
				const dices = diceResults.map((d) => d.roll);
				const sum = dices.reduce((a, b) => a + b, 0);
				return {
					roll: sum,
					description: dices.join(' + '),
				};
			} else {
				type _Result = { description?: string; weight: number };
				let max: _Result = { weight: Number.MIN_SAFE_INTEGER };
				let min: _Result = { weight: Number.MAX_SAFE_INTEGER };

				for (const result of diceResults) {
					if (result.resultType) {
						if (result.resultType.successWeight > max.weight)
							max = {
								description: result.resultType.description,
								weight: result.resultType.successWeight,
							};

						if (result.resultType.successWeight < min.weight)
							min = {
								description: result.resultType.description,
								weight: result.resultType.successWeight,
							};
					}
				}

				const roll = diceResults.map((d) => d.roll).join(' | ');
				let description: string | undefined;

				if (min.description && max.description) {
					if (min.description === max.description) description = min.description;
					else description = `${min.description} - ${max.description}`;
				} else description = min.description || max.description;

				return { roll, description };
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	},[diceResults]);

  useEffect(() => {
    if (props.dices === null) return;
    setDiceResults([]);
    setDescriptionFade(false);
    api
      .post('/dice', {
        dices: props.dices,
        resolverKey: props.resolverKey,
        npcId: props.npcId,
      })
      .then((res) => {
        let results: DiceResponse[] = res.data.results;
        if (props.onResult) {
          let newResults = props.onResult(results);
          if (newResults) results = newResults;
        }
        setDiceResults(results);
      })
      .catch(logError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props._key, props.dices]);

	useEffect(() => {
		if (result && (diceResults.length > 1 || diceResults[0].resultType))
			descriptionDelayTimeout.current = setTimeout(() => setDescriptionFade(true), 750);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [diceResults]);

	function onHide() {
		if (descriptionDelayTimeout.current) {
			clearTimeout(descriptionDelayTimeout.current);
			descriptionDelayTimeout.current = null;
		}
		
		// Esconde apenas o modal do resultado atual
		props.onHide();

		// A MÁGICA: Só chama o OnClose (que fecha tudo) se não formos rolar de novo!
		if (!rollAgain.current && props.onCloseModal) {
			props.onCloseModal();
		}
	}

	function onExited() {
		setDiceResults([]);
		setDescriptionFade(false);
		// Se o botão "Rolar Novamente" foi clicado, ele dispara a nova rolagem aqui
		if (rollAgain.current) props.onRollAgain();
		rollAgain.current = false;
	}

	return (
		<SheetModal
			show={props.dices != null}
			onExited={onExited}
			title='Resultado da Rolagem'
			onHide={onHide}
			closeButton={{ disabled: !result }}
			backdrop={!result ? 'static' : true}
			keyboard={!result ? false : true}
			centered
			applyButton={{
				name: 'Rolar Novamente',
				onApply: () => {
					rollAgain.current = true;
					onHide(); // Fecha este para o onExited disparar a nova rolagem
				},
				disabled: !result,
			}}
			bodyStyle={{ minHeight: 120, display: 'flex', alignItems: 'center' }}>
			
			{/* Seletor de Cor do Dado - Mantendo a preferência do jogador */}
			<div style={{ position: 'absolute', top: '15px', right: '50px', display: 'flex', alignItems: 'center', gap: '8px' }}>
				<label style={{ fontSize: '0.8rem', color: '#9d8db3' }}>Cor do Dado:</label>
				<input 
					type="color" 
					value={diceColor} 
					onChange={(e) => handleColorChange(e.target.value)}
					style={{ 
						border: 'none', 
						width: '25px', 
						height: '25px', 
						cursor: 'pointer', 
						backgroundColor: 'transparent',
						borderRadius: '4px'
					}}
				/>
			</div>

			<Container fluid className='text-center'>
				{!result && (
					<Row>
						<Col>
							<Spinner animation='border' style={{ color: diceColor }} />
						</Col>
					</Row>
				)}
				<Row>
					{result && (
						<Fade in appear>
							<Col 
								className='h1 m-0' 
								style={{ 
									color: 'white', 
									fontWeight: 'bold',
									fontSize: '4rem',
									// O efeito Neon que você pediu, usando a cor selecionada
									textShadow: `0 0 10px ${diceColor}, 0 0 20px ${diceColor}` 
								}}
							>
								{result.roll}
							</Col>
						</Fade>
					)}
				</Row>
				<Row className="mt-2">
					{result && (
						<Fade in={descriptionFade}>
							<Col style={{ color: '#c4a7e7', fontSize: '1.2rem' }}>
								{result.description}
							</Col>
						</Fade>
					)}
				</Row>
			</Container>
		</SheetModal>
	);
}
