import type { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import Router from 'next/router';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import FormControl from 'react-bootstrap/FormControl';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import WelcomePage from '../components/Admin/WelcomePage';
import ApplicationHead from '../components/ApplicationHead';
import ErrorToastContainer from '../components/ErrorToastContainer';
import useToast from '../hooks/useToast';
import styles from '../styles/modules/Home.module.scss';
import type { InferSSRProps } from '../utils';
import api from '../utils/api';
import prisma from '../utils/database';
import { sessionSSR } from '../utils/session';

export default function Page({ init, error }: InferSSRProps<typeof getSSP>) {
	if (error)
		return (
			<>
				<ApplicationHead title='Erro de Execução' />
				<Container className='text-center'>
					<Row>
						<Col className='h1 mt-3' style={{ color: 'red' }}>
							O banco de dados não foi inicializado corretamente.
						</Col>
					</Row>
					<Row>
						<Col className='h3 mt-2'>
          Certifique-se de ter integrado um banco de dados ao aplicativo, criado a
          variável de ambiente <b>DATABASE_URL</b> e preenchido seu valor
          corretamente.
						</Col>
					</Row>
				</Container>
			</>
		);

	if (!init)
		return (
			<>
				<ApplicationHead title='Inicialização' />
				<WelcomePage />
			</>
		);

	return (
		<>
			<ApplicationHead title='Entrar' />
			<HomePage />
		</>
	);
}

function HomePage() {
	const[loading, setLoading] = useState(false);
	const [toasts, addToast] = useToast();

	async function onFormSubmit(username: string, password: string) {
		setLoading(true);

		try {
			if (username.length === 0 || password.length === 0)
				throw new Error('Você deve preencher tanto o usuário como a senha.');
			const res = await api.post('/login', { username, password });
			if (res.data.admin) return Router.push('/admin/main');
			Router.push('/sheet/player/1');
		} catch (err) {
			addToast(err);
			setLoading(false);
		}
	}

	if (loading)
		return (
			<Container className='text-center d-flex align-items-center justify-content-center' style={{ height: '100vh' }}>
				<Spinner animation='border' style={{ color: '#8a2be2' }} />
			</Container>
		);

	return (
		<>
			{/* Envolve o login numa tela cheia e centraliza verticalmente */}
			<Container className='d-flex align-items-center justify-content-center' style={{ minHeight: '80vh' }}>
				{/* Caixa principal do Login (O "Card" Roxo escuro) */}
				<div
					style={{
						backgroundColor: '#150d22',
						padding: '40px',
						borderRadius: '15px',
						border: '1px solid #3b2259',
						boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.7)',
						width: '100%',
						maxWidth: '450px',
					}}
				>
					<Row className='text-center mb-4'>
						<Col>
							<h1 style={{ color: '#c4a7e7', fontWeight: 'bold', textShadow: '0 0 10px rgba(138, 43, 226, 0.3)' }}>
								<label htmlFor='username'>Bem-Vindo ao Nexus RPG</label>
							</h1>
						</Col>
					</Row>
					
					<LoginForm onSubmit={onFormSubmit} />
					
					<Row className='text-center mt-4'>
						<Col>
							<span className='me-2' style={{ color: '#9d8db3' }}>Não possui cadastro?</span>
							<Link href='/register' passHref>
								<a className={styles.link} style={{ color: '#b175ff', fontWeight: 'bold' }}>Cadastrar-se</a>
							</Link>
						</Col>
					</Row>
				</div>
			</Container>
			<ErrorToastContainer toasts={toasts} />
		</>
	);
}

function LoginForm(props: { onSubmit: (username: string, password: string) => void }) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');

	return (
		<form
			onSubmit={(ev) => {
				ev.preventDefault();
				setPassword('');
				props.onSubmit(username, password);
			}}>
			<Row className='mb-3 justify-content-center'>
				<Col>
					<FormControl
						className='text-center theme-element'
						placeholder='Nome de Usuário'
						id='username'
						name='username'
						value={username}
						onChange={(e) => setUsername(e.currentTarget.value)}
						style={{
							backgroundColor: '#0b0710', // Fundo mais escuro para o input destacar
							borderColor: '#3b2259',
							color: '#fff',
							padding: '12px',
							borderRadius: '8px'
						}}
					/>
				</Col>
			</Row>
			<Row className='mb-4 justify-content-center'>
				<Col>
					<FormControl
						type='password'
						className='text-center theme-element'
						placeholder='Senha'
						id='password'
						name='password'
						value={password}
						onChange={(e) => setPassword(e.currentTarget.value)}
						style={{
							backgroundColor: '#0b0710',
							borderColor: '#3b2259',
							color: '#fff',
							padding: '12px',
							borderRadius: '8px'
						}}
					/>
				</Col>
			</Row>
			<Row className='justify-content-center'>
				<Col>
					<Button 
						type='submit' 
						className='w-100'
						style={{
							backgroundColor: '#8a2be2',
							borderColor: '#8a2be2',
							fontWeight: 'bold',
							padding: '10px',
							borderRadius: '8px',
							boxShadow: '0 4px 15px rgba(138, 43, 226, 0.4)'
						}}
					>
						ENTRAR NO SISTEMA
					</Button>
				</Col>
			</Row>
		</form>
	);
}

async function getSSP(ctx: GetServerSidePropsContext) {
	const player = ctx.req.session.player;

	if (player) {
		if (player.admin) {
			return {
				redirect: {
					destination: '/admin/main',
					permanent: false,
				},
			};
		}
		return {
			redirect: {
				destination: '/sheet/player/1',
				permanent: false,
			},
		};
	}

	try {
		const init = await prisma.config.findUnique({ where: { name: 'init' } });
		return {
			props: {
				init: init === null ? false : true,
			},
		};
	} catch (err) {
		console.error(err);
		return {
			props: {
				init: false,
				error: true,
			},
		};
	}
}

export const getServerSideProps = sessionSSR(getSSP);
