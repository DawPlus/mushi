import { createFileRoute } from '@tanstack/react-router'
import { AppButton, AppInput } from '../components/common'
import { ApiStatus } from '../features/system/api-status'
import { OwnerLogin } from '../features/system/owner-login'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return <main className="grid max-w-sm gap-4"><h1 className="text-2xl font-semibold">Mushi</h1><OwnerLogin><p>개인 작업 공간 준비 중</p><AppInput label="프로젝트 이름" placeholder="Mushi" /><AppButton type="button">시작하기</AppButton><ApiStatus /></OwnerLogin></main>
}
