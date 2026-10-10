import {
	DEFAULT_CONTROL_PORT,
	loadWebSettings,
	saveWebSettings,
} from "../control/settings.js";
import {
	getLifecycleStatus,
	upLifecycle,
} from "../runtime/lifecycle.js";
import { createWordDigitWordSecretGenerator } from "./secretGenerator.js";
import { createStdoutHandoffNotifier } from "./stdoutNotifier.js";
import type {
	HandoffNotifierPort,
	HandoffPayload,
	SecretGeneratorPort,
} from "./ports.js";

export type RotateOptions = {
	rootDir?: string;
	/** Default true: ensure web + Tailscale Serve via LifecyclePort.up */
	ensureUp?: boolean;
	generator?: SecretGeneratorPort;
	notifier?: HandoffNotifierPort;
	/** Test seam: skip real upLifecycle */
	up?: () => Promise<unknown>;
	getStatus?: () => Promise<Awaited<ReturnType<typeof getLifecycleStatus>>>;
};

export async function rotateControlSecret(
	options: RotateOptions = {},
): Promise<HandoffPayload> {
	const generator =
		options.generator ?? createWordDigitWordSecretGenerator();
	const notifier = options.notifier ?? createStdoutHandoffNotifier();
	const ensureUp = options.ensureUp !== false;
	const secret = generator.generate();

	const current = await loadWebSettings({ rootDir: options.rootDir });
	await saveWebSettings(
		{
			...current,
			controlAuthMode: "token",
			controlToken: secret,
		},
		{ rootDir: options.rootDir },
	);

	if (ensureUp) {
		const up = options.up ?? (() => upLifecycle());
		await up();
	}

	const status = await (options.getStatus ?? getLifecycleStatus)();
	const payload: HandoffPayload = {
		url: status.serve.url,
		secret,
		controlPort: status.controlPort || current.controlPort || DEFAULT_CONTROL_PORT,
		rotatedAt: new Date().toISOString(),
		serveRaw: status.serve.raw,
		controlAuthMode: "token",
	};

	await notifier.notify(payload);
	return payload;
}
