export function buildWwwAuthenticate({
	error,
	errorDescription,
}: {
	error?: string;
	errorDescription?: string;
} = {}): string {
	const parts = ['Bearer realm="onion-bridge"'];
	if (error) parts.push(`error="${error}"`);
	if (errorDescription) {
		parts.push(`error_description="${escapeParam(errorDescription)}"`);
	}
	return parts.join(", ");
}

function escapeParam(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
