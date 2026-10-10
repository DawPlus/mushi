import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  ApiUnauthorizedError,
  api,
  readControlToken,
  writeControlToken,
  type AuthStatusResponse,
} from '../lib/api'

export function ControlAuthGate({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthStatusResponse | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  async function refreshAuthStatus() {
    const status = await api.auth()
    setAuth(status)
    return status
  }

  async function probeUnlock() {
    const status = await refreshAuthStatus()
    if (!status.required) {
      setUnlocked(true)
      return true
    }
    const stored = readControlToken()
    if (!stored) {
      setUnlocked(false)
      return false
    }
    await api.status()
    setUnlocked(true)
    return true
  }

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setChecking(true)
      setError(null)
      try {
        await probeUnlock()
      } catch (err) {
        if (cancelled) return
        writeControlToken(null)
        setUnlocked(false)
        setError(err instanceof Error ? err.message : String(err))
        try {
          await refreshAuthStatus()
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void boot()

    function onUnauthorized() {
      writeControlToken(null)
      setUnlocked(false)
      setError('인증이 필요합니다. Control token을 다시 입력하세요.')
      void refreshAuthStatus().catch(() => undefined)
    }
    window.addEventListener('onion-control-unauthorized', onUnauthorized)
    return () => {
      cancelled = true
      window.removeEventListener('onion-control-unauthorized', onUnauthorized)
    }
  }, [])

  async function onUnlock(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const next = tokenInput.trim()
    if (!next) {
      setError('Control token을 입력하세요.')
      return
    }
    writeControlToken(next)
    try {
      await api.status()
      setUnlocked(true)
      setTokenInput('')
    } catch (err) {
      writeControlToken(null)
      setUnlocked(false)
      setError(
        err instanceof ApiUnauthorizedError
          ? '토큰이 맞지 않습니다. Settings에 저장한 Control token을 입력하세요.'
          : err instanceof Error
            ? err.message
            : String(err),
      )
    }
  }

  if (checking) {
    return (
      <div className="ob-card" style={{ maxWidth: 480, margin: '2rem auto' }}>
        <p className="ob-hint">제어 접근 확인 중…</p>
      </div>
    )
  }

  if (auth?.required && !unlocked) {
    return (
      <div className="ob-card" style={{ maxWidth: 480, margin: '2rem auto' }}>
        <h2 className="ob-card-title">Control 잠금 해제</h2>
        <p className="ob-hint">
          지금 서버는 <strong>token</strong> 모드입니다. Settings에 저장한{' '}
          <strong>Control token</strong>을 입력하세요. (프로필 Bearer token이
          아닙니다.)
        </p>
        {!auth.tokenConfigured ? (
          <p className="ob-hint" style={{ color: 'var(--ob-warn, #c9783a)' }}>
            서버에 control token이 아직 없습니다. 집 PC에서{' '}
            <code>~/.onion-bridge/web.json</code>의{' '}
            <code>controlAuthMode</code>를 <code>local</code>로 잠시 바꾸거나,{' '}
            <code>ONION_CONTROL_TOKEN</code>을 설정하세요.
          </p>
        ) : null}
        <form
          onSubmit={(event) => void onUnlock(event)}
          className="ob-settings-grid"
          style={{ marginTop: '1rem' }}
        >
          <div className="ob-field">
            <label className="ob-label" htmlFor="control-unlock-token">
              Control token
            </label>
            <input
              id="control-unlock-token"
              className="ob-input"
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              autoComplete="current-password"
              spellCheck={false}
            />
          </div>
          {error ? (
            <p className="ob-hint" style={{ color: 'var(--ob-warn, #c9783a)' }}>
              {error}
            </p>
          ) : null}
          <button type="submit" className="ob-btn">
            잠금 해제
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
