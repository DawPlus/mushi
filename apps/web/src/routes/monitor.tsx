import { createFileRoute } from '@tanstack/react-router'
import MonitorFeature from '../features/monitor/Feature'
import { MacAgentControl } from '../features/monitor/mac-agent-control'
import { loadMonitorStatus, loadMonitorHistory } from '../features/system/monitor-api'

export const Route = createFileRoute('/monitor')({
  component: () => <><MacAgentControl /><MonitorFeature loadStatus={loadMonitorStatus} loadHistory={loadMonitorHistory} /></>,
})
