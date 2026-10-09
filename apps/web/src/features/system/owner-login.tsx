import { createClient } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AppButton, AppInput } from '../../components/common'
import { api } from '../../lib/api'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const auth = url && key ? createClient(url, key) : null

export function OwnerLogin({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) return
    let active = true
    const check = async () => {
      const { data } = await auth.auth.getSession()
      if (!data.session) { if (active) { setAuthorized(false); setChecking(false) }; return }
      try {
        await api.get('auth/owner', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
        if (active) { setAuthorized(true); setChecking(false); setMessage('소유자 인증 완료') }
      } catch {
        if (active) { setAuthorized(false); setChecking(false); setMessage('이 계정은 접근할 수 없습니다.') }
      }
    }
    void check()
    const { data: listener } = auth.auth.onAuthStateChange(() => { void check() })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth || loading) return
    setLoading(true)
    setMessage('')
    const { error } = await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })
    setMessage(error ? '로그인 링크를 요청하지 못했습니다. 이메일과 설정을 확인해 주세요.' : '메일함에서 로그인 링크를 확인해 주세요.')
    setLoading(false)
  }

  if (!auth) return <p role="status">Supabase 연결 설정이 필요합니다. 환경 변수를 구성해 주세요.</p>
  if (checking) return <p role="status">소유자 인증 확인 중…</p>
  if (authorized) return <div className="grid gap-3"><div className="flex items-center justify-between"><p role="status">{message}</p><AppButton type="button" onClick={() => { setAuthorized(false); void auth.auth.signOut() }}>로그아웃</AppButton></div>{children}</div>
  return <form className="grid gap-3" onSubmit={event => void sendLink(event)}>
    <AppInput label="소유자 이메일" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
    <AppButton type="submit" disabled={loading}>{loading ? '요청 중…' : '로그인 링크 받기'}</AppButton>
    {message && <p role="status">{message}</p>}
  </form>
}
