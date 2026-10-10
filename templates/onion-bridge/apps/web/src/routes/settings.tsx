import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { KineticText } from '../components/KineticText'
import {
  api,
  writeControlToken,
  type SettingsResponse,
} from '../lib/api'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  const [projectsText, setProjectsText] = useState('')
  const [defaultProfile, setDefaultProfile] = useState('default')
  const [controlPort, setControlPort] = useState(3847)
  const [controlAuthMode, setControlAuthMode] = useState<'local' | 'token'>(
    'local',
  )
  const [controlToken, setControlToken] = useState('')
  const [controlTokenMasked, setControlTokenMasked] = useState('')
  const [tunnelBin, setTunnelBin] = useState('')
  const [tunnelId, setTunnelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState('')
  const [tokenMasked, setTokenMasked] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'ok' | 'warn'>('ok')

  function applySettings(settings: SettingsResponse) {
    setProjectsText(settings.projects.join('\n'))
    setDefaultProfile(settings.defaultProfile)
    setControlPort(settings.controlPort)
    setControlAuthMode(settings.controlAuthMode || 'local')
    setControlTokenMasked(settings.controlTokenMasked || '')
    setControlToken(settings.controlTokenMasked || '')
    setTunnelBin(settings.tunnelBin || '')
    setTunnelId(settings.tunnelId || '')
    setApiKeyMasked(settings.apiKeyMasked || '')
    setTokenMasked(settings.tokenMasked || '')
    setApiKey(settings.apiKeyMasked || '')
  }

  useEffect(() => {
    void api
      .settings()
      .then(applySettings)
      .catch((error: Error) => {
        setMessageTone('warn')
        setMessage(error.message)
      })
  }, [])

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const projects = projectsText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
      const typedControlToken = controlToken.trim()
      const saved = await api.saveSettings({
        projects,
        defaultProfile,
        controlPort: Number(controlPort),
        controlAuthMode,
        controlToken,
        tunnelBin,
        tunnelId,
        apiKey,
      })
      // Keep this browser session authorized after enabling token mode.
      if (controlAuthMode === 'token') {
        if (typedControlToken && !typedControlToken.includes('•')) {
          writeControlToken(typedControlToken)
        }
      } else {
        writeControlToken(null)
      }
      applySettings(saved)
      setMessageTone('ok')
      setMessage(
        controlAuthMode === 'token'
          ? '저장됨. token 모드가 켜졌습니다. 이 브라우저는 방금 입력한 Control token으로 유지됩니다. 새로고침 후에는 잠금 해제 화면에 같은 토큰을 입력하세요.'
          : 'Settings saved. Secrets stay masked in the UI.',
      )
    } catch (error) {
      setMessageTone('warn')
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ob-page">
      <section className="ob-hero">
        <KineticText text="Settings" className="ob-hero-kinetic" />
        <p>
          Configure Onion setup values used by the local control UI. API keys and bearer
          tokens are masked and never shown in full.
        </p>
      </section>

      <form
        onSubmit={(event) => void onSave(event)}
        className="ob-card ob-settings-grid"
        noValidate
      >
        <div className="ob-section-block">
          <h2 className="ob-card-title">Onion setup</h2>
          <div className="ob-settings-grid ob-settings-grid-2">
            <div className="ob-field">
              <label className="ob-label" htmlFor="tunnel-bin">
                tunnel-client path
              </label>
              <input
                id="tunnel-bin"
                className="ob-input"
                value={tunnelBin}
                onChange={(event) => setTunnelBin(event.target.value)}
                placeholder="/opt/homebrew/bin/tunnel-client"
                spellCheck={false}
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="tunnel-id">
                Tunnel ID
              </label>
              <input
                id="tunnel-id"
                className="ob-input"
                value={tunnelId}
                onChange={(event) => setTunnelId(event.target.value)}
                placeholder="tunnel_..."
                spellCheck={false}
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="api-key">
                OpenAI API key
              </label>
              <p className="ob-hint">
                {apiKeyMasked
                  ? `Saved value: ${apiKeyMasked}. Leave as-is to keep it, or paste a new key.`
                  : 'No API key saved yet.'}
              </p>
              <input
                id="api-key"
                className="ob-input"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={apiKeyMasked || 'sk-...'}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="token-masked">
                Bearer token
              </label>
              <p className="ob-hint">Managed automatically per profile. Display only.</p>
              <input
                id="token-masked"
                className="ob-input"
                value={tokenMasked || 'Not generated yet'}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="ob-section-block">
          <h2 className="ob-card-title">Control defaults</h2>
          <div className="ob-settings-grid ob-settings-grid-2">
            <div className="ob-field">
              <label className="ob-label" htmlFor="default-profile">
                Default profile name
              </label>
              <input
                id="default-profile"
                className="ob-input"
                value={defaultProfile}
                onChange={(event) => setDefaultProfile(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="control-port">
                Control API port
              </label>
              <p className="ob-hint">
                Applied the next time you run <code>npm start</code>.
              </p>
              <input
                id="control-port"
                type="number"
                min={1}
                max={65535}
                className="ob-input"
                value={controlPort}
                onChange={(event) => setControlPort(Number(event.target.value))}
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="control-auth-mode">
                Control auth mode
              </label>
              <p className="ob-hint">
                Use <code>local</code> on a trusted machine only. Switch to{' '}
                <code>token</code> before Tailscale/remote access.
              </p>
              <select
                id="control-auth-mode"
                className="ob-input"
                value={controlAuthMode}
                onChange={(event) =>
                  setControlAuthMode(
                    event.target.value === 'token' ? 'token' : 'local',
                  )
                }
              >
                <option value="local">local (no API auth)</option>
                <option value="token">token (require bearer)</option>
              </select>
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="control-token">
                Control token
              </label>
              <p className="ob-hint">
                {controlTokenMasked
                  ? `Saved value: ${controlTokenMasked}. Leave as-is to keep it, or paste a new token.`
                  : 'Required when auth mode is token. Also settable via ONION_CONTROL_TOKEN.'}
              </p>
              <input
                id="control-token"
                className="ob-input"
                type="password"
                value={controlToken}
                onChange={(event) => setControlToken(event.target.value)}
                placeholder={controlTokenMasked || 'control-secret'}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="ob-section-block">
          <h2 className="ob-card-title">Workspace roots</h2>
          <div className="ob-field">
            <label className="ob-label" htmlFor="project-folders">
              Parent folders to scan
            </label>
            <p className="ob-hint">
              One absolute path per line. Each root’s child folders appear automatically on
              the Dashboard.
            </p>
            <textarea
              id="project-folders"
              className="ob-textarea"
              value={projectsText}
              onChange={(event) => setProjectsText(event.target.value)}
              placeholder={'/Users/you/workspace\n/Users/you/projects'}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="ob-actions">
          <button type="submit" className="ob-btn ob-btn-secondary" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        {message ? (
          <p
            className={`ob-alert ${messageTone === 'ok' ? 'ob-alert-ok' : 'ob-alert-warn'}`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </div>
  )
}
