// @ts-nocheck
import { spawnSync } from "node:child_process";

const PICKER_TIMEOUT_MS = 5 * 60 * 1000;

function normalizeSelectedPath(raw) {
	return String(raw || "")
		.trim()
		.replace(/[\\/]+$/, "");
}

function isCancelExit(result, message) {
	if (/user cancelled|canceled|cancel/i.test(message)) return true;
	if (result.status === 1 && !String(result.stdout || "").trim()) return true;
	return false;
}

function browseDarwin(spawnSyncImpl) {
	const result = spawnSyncImpl(
		"osascript",
		["-e", 'POSIX path of (choose folder with prompt "Select an Onion project folder")'],
		{ encoding: "utf8", timeout: PICKER_TIMEOUT_MS },
	);
	if (result.error) {
		throw new Error(result.error.message || "Folder picker failed.");
	}
	if (result.status !== 0) {
		const message = (result.stderr || result.stdout || "").trim();
		if (isCancelExit(result, message)) {
			return { cancelled: true, path: null };
		}
		throw new Error(message || "Folder picker failed.");
	}
	const selected = normalizeSelectedPath(result.stdout);
	if (!selected) return { cancelled: true, path: null };
	return { cancelled: false, path: selected };
}

function browseWindows(spawnSyncImpl) {
	// FolderBrowserDialog needs STA; keep the script ASCII-safe for -Command quoting.
	const script = [
		"Add-Type -AssemblyName System.Windows.Forms",
		"$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
		"$dialog.Description = 'Select an Onion project folder'",
		"$dialog.ShowNewFolderButton = $true",
		"try { $dialog.SelectedPath = [Environment]::GetFolderPath('UserProfile') } catch {}",
		"$result = $dialog.ShowDialog()",
		"if ($result -eq [System.Windows.Forms.DialogResult]::OK -and $dialog.SelectedPath) {",
		"  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false",
		"  [Console]::WriteLine($dialog.SelectedPath)",
		"  exit 0",
		"}",
		"exit 1",
	].join("; ");

	const result = spawnSyncImpl(
		"powershell.exe",
		["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
		{
			encoding: "utf8",
			timeout: PICKER_TIMEOUT_MS,
			windowsHide: true,
		},
	);

	if (result.error) {
		const code = result.error.code;
		if (code === "ENOENT") {
			return {
				cancelled: false,
				path: null,
				unsupported: true,
				error:
					"Native folder picker is unavailable (powershell.exe not found). Enter an absolute path instead.",
			};
		}
		throw new Error(result.error.message || "Folder picker failed.");
	}

	if (result.status !== 0) {
		const message = (result.stderr || result.stdout || "").trim();
		if (isCancelExit(result, message)) {
			return { cancelled: true, path: null };
		}
		throw new Error(message || "Folder picker failed.");
	}

	const selected = normalizeSelectedPath(result.stdout);
	if (!selected) return { cancelled: true, path: null };
	return { cancelled: false, path: selected };
}

function tryLinuxPicker(spawnSyncImpl, command, args) {
	const result = spawnSyncImpl(command, args, {
		encoding: "utf8",
		timeout: PICKER_TIMEOUT_MS,
	});
	if (result.error?.code === "ENOENT") {
		return { missing: true };
	}
	if (result.error) {
		throw new Error(result.error.message || "Folder picker failed.");
	}
	if (result.status !== 0) {
		const message = (result.stderr || result.stdout || "").trim();
		if (isCancelExit(result, message) || result.status === 1) {
			return { cancelled: true, path: null };
		}
		throw new Error(message || "Folder picker failed.");
	}
	const selected = normalizeSelectedPath(result.stdout);
	if (!selected) return { cancelled: true, path: null };
	return { cancelled: false, path: selected };
}

function browseLinux(spawnSyncImpl) {
	const zenity = tryLinuxPicker(spawnSyncImpl, "zenity", [
		"--file-selection",
		"--directory",
		"--title=Select an Onion project folder",
	]);
	if (!zenity.missing) return zenity;

	const kdialog = tryLinuxPicker(spawnSyncImpl, "kdialog", [
		"--getexistingdirectory",
		".",
		"--title",
		"Select an Onion project folder",
	]);
	if (!kdialog.missing) return kdialog;

	return {
		cancelled: false,
		path: null,
		unsupported: true,
		error:
			"Native folder picker is unavailable on this platform. Enter an absolute path instead.",
	};
}

export function browseFolderDialog({
	platform = process.platform,
	spawnSyncImpl = spawnSync,
} = {}) {
	if (platform === "darwin") {
		return browseDarwin(spawnSyncImpl);
	}
	if (platform === "win32") {
		return browseWindows(spawnSyncImpl);
	}
	if (platform === "linux") {
		return browseLinux(spawnSyncImpl);
	}

	return {
		cancelled: false,
		path: null,
		unsupported: true,
		error:
			"Native folder picker is unavailable on this platform. Enter an absolute path instead.",
	};
}
