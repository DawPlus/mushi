import { createClient } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
	AppAnimatedGrid,
	AppBlurFade,
	AppButton,
	AppInput,
	AppMagicCard,
	AppShinyText,
	AppTypingAnimation,
	ThemeToggle,
} from "../../components/common";
import { api } from "../../lib/api";
import { OwnerAuthProvider } from "./owner-auth";
import {
	loginLinkMessage,
	loginRedirectOrigin,
	oauthCallbackError,
} from "./owner-login-feedback";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const auth = url && key ? createClient(url, key) : null;

export async function getOwnerAccessToken() {
	return (await auth?.auth.getSession())?.data.session?.access_token ?? null;
}

function LoginShell({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex min-h-dvh flex-col bg-background">
			<AppAnimatedGrid fullscreen />
			<div
				aria-hidden="true"
				className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--brand-violet)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--brand-skymint)_10%,transparent),transparent_50%)]"
			/>
			<div className="relative z-10 flex justify-end px-4 py-3 sm:px-6">
				<ThemeToggle />
			</div>
			<div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-6">
				{children}
			</div>
		</div>
	);
}

function LoginPanel({
	email,
	setEmail,
	loading,
	message,
	messageIsError,
	onGoogle,
	onLocal,
	onSubmit,
}: {
	email: string;
	setEmail: (value: string) => void;
	loading: boolean;
	message: string;
	messageIsError: boolean;
	onGoogle: () => void;
	onLocal: () => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
	return (
		<AppMagicCard className="mx-auto w-full max-w-lg rounded-3xl border border-border/70">
			<div className="flex flex-col items-center gap-5 p-5 sm:gap-6 sm:p-8">
				<div className="w-full py-3 text-center sm:py-5">
					<AppTypingAnimation
						as="h1"
						typeSpeed={90}
						delay={80}
						showCursor={false}
						className="font-mushi text-4xl tracking-tight text-foreground sm:text-5xl"
					>
						무시(Mushi)
					</AppTypingAnimation>
				</div>

				<div className="relative flex w-full flex-col items-center gap-3">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -inset-6 rounded-full bg-primary/18 blur-3xl dark:bg-primary/12"
					/>

					<div className="relative z-[1] w-full max-w-sm px-1">
						<div
							role="status"
							aria-live="polite"
							className="relative rounded-2xl border border-border/80 bg-background/90 px-4 py-3.5 text-center shadow-lg shadow-primary/5 backdrop-blur-sm"
						>
							<AppTypingAnimation
								as="p"
								words={[
									"당일 회식은 사양합니다",
									"예? 그걸 제가요?",
									"주말 연락 자제 부탁드립니다",
									"예, 그런데 다음에 하겠습니다",
								]}
								loop
								typeSpeed={55}
								deleteSpeed={35}
								pauseDelay={1800}
								delay={700}
								className="relative flex min-h-[2.4em] items-center justify-center font-mushi text-xl leading-snug text-foreground sm:text-2xl"
							/>
							<span
								aria-hidden="true"
								className="absolute -bottom-2 left-1/2 size-3.5 -translate-x-1/2 rotate-45 border-r border-b border-border/80 bg-background/90"
							/>
						</div>
					</div>

					<figure className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/50 p-1.5 shadow-xl shadow-primary/10">
						<img
							src="/asset/login-mushi.jpg"
							alt="무시"
							width={600}
							height={600}
							className="h-64 w-auto rounded-[1.35rem] object-cover object-center sm:h-80"
						/>
					</figure>
				</div>

				<form className="grid w-full gap-4" onSubmit={onSubmit}>
					{import.meta.env.DEV && (
						<AppButton
							type="button"
							size="lg"
							variant="outline"
							className="w-full"
							disabled={loading}
							onClick={onLocal}
						>
							로컬로 바로 시작
						</AppButton>
					)}
					<AppButton
						type="button"
						size="lg"
						className="w-full"
						disabled={loading}
						onClick={onGoogle}
					>
						{loading ? "Google 연결 중…" : "Google로 계속하기"}
					</AppButton>
					<div
						className="flex items-center gap-3 text-xs text-muted-foreground"
						aria-hidden="true"
					>
						<span className="h-px flex-1 bg-border" />
						또는 이메일 링크
						<span className="h-px flex-1 bg-border" />
					</div>
					<AppInput
						label="소유자 이메일"
						type="email"
						autoComplete="email"
						required
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="you@example.com"
					/>
					<AppButton
						type="submit"
						size="lg"
						className="w-full"
						disabled={loading}
					>
						{loading ? "요청 중…" : "로그인 링크 받기"}
					</AppButton>
					{message && (
						<p
							role="status"
							className={`rounded-xl px-3 py-2 text-sm ${messageIsError ? "border border-destructive/40 bg-destructive/10 text-destructive" : "border border-success/30 bg-success/10 text-success"}`}
						>
							{message}
						</p>
					)}
				</form>
			</div>
		</AppMagicCard>
	);
}

export function OwnerLogin({ children }: { children: ReactNode }) {
	const [localGuest, setLocalGuest] = useState(false);
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState(
		() => oauthCallbackError(window.location.search) ?? "",
	);
	const [loading, setLoading] = useState(false);
	const [authorized, setAuthorized] = useState(false);
	const [checking, setChecking] = useState(Boolean(auth));

	useEffect(() => {
		if (!auth) return;
		let active = true;
		let latestCheck = 0;
		const check = async (session: Session | null) => {
			const requestId = ++latestCheck;
			if (!active) return;
			setAuthorized(false);
			setChecking(Boolean(session));
			if (!session) return;
			try {
				await api.get("auth/owner", {
					headers: { Authorization: `Bearer ${session.access_token}` },
				});
				if (active && requestId === latestCheck) {
					setAuthorized(true);
					setChecking(false);
					setMessage("");
				}
			} catch {
				if (active && requestId === latestCheck) {
					setAuthorized(false);
					setChecking(false);
					setMessage("이 계정은 접근할 수 없습니다.");
				}
			}
		};
		// Supabase provides the session directly; do not call Auth APIs inside this callback.
		const { data: listener } = auth.auth.onAuthStateChange(
			(_event, session) => {
				void check(session);
			},
		);
		return () => {
			active = false;
			latestCheck++;
			listener.subscription.unsubscribe();
		};
	}, []);

	async function signInGoogle() {
		if (!auth || loading) return;
		setLoading(true);
		setMessage("");
		const redirectTo = loginRedirectOrigin(
			window.location.origin,
			window.location.hostname,
		);
		try {
			const { error } = await auth.auth.signInWithOAuth({
				provider: "google",
				options: { redirectTo },
			});
			if (error)
				setMessage(
					"Google 로그인을 시작하지 못했습니다. Supabase Google 제공자 설정을 확인해 주세요.",
				);
		} catch {
			setMessage("Google 로그인 연결에 실패했습니다. 다시 시도해 주세요.");
		} finally {
			setLoading(false);
		}
	}

	async function sendLink(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!auth || loading) return;
		setLoading(true);
		setMessage("");
		const redirectTo = loginRedirectOrigin(
			window.location.origin,
			window.location.hostname,
		);
		try {
			const { error } = await auth.auth.signInWithOtp({
				email,
				options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
			});
			setMessage(loginLinkMessage(error));
		} catch {
			setMessage("로그인 링크 요청에 실패했습니다. 다시 시도해 주세요.");
		} finally {
			setLoading(false);
		}
	}

	if (import.meta.env.DEV && localGuest && !authorized) {
		return (
			<OwnerAuthProvider value={{ signOut: () => setLocalGuest(false) }}>
				{children}
			</OwnerAuthProvider>
		);
	}

	if (!auth) {
		return (
			<LoginShell>
				<AppBlurFade delay={0} direction="up" inView>
					<p
						role="status"
						className="max-w-sm rounded-2xl border border-border bg-card/90 p-6 text-sm text-muted-foreground backdrop-blur-sm"
					>
						Supabase 연결 설정이 필요합니다. 환경 변수를 구성해 주세요.
					</p>
				</AppBlurFade>
			</LoginShell>
		);
	}

	if (checking) {
		return (
			<LoginShell>
				<p role="status" className="text-sm text-muted-foreground">
					<AppShinyText>세션 확인 중…</AppShinyText>
				</p>
			</LoginShell>
		);
	}

	if (authorized) {
		return (
			<OwnerAuthProvider
				value={{
					signOut: () => {
						setAuthorized(false);
						void auth.auth.signOut();
					},
				}}
			>
				{children}
			</OwnerAuthProvider>
		);
	}

	const messageIsError = Boolean(message) && !message.includes("메일함");

	return (
		<LoginShell>
			<AppBlurFade
				delay={0}
				direction="up"
				offset={8}
				inView
				className="w-full"
			>
				<LoginPanel
					email={email}
					setEmail={setEmail}
					loading={loading}
					message={message}
					messageIsError={messageIsError}
					onGoogle={() => void signInGoogle()}
					onLocal={() => setLocalGuest(true)}
					onSubmit={(event) => void sendLink(event)}
				/>
			</AppBlurFade>
		</LoginShell>
	);
}
