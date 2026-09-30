'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clipboard, RotateCcw, ShieldAlert, Sparkles, Terminal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Stage = 'INIT' | 'COLLECTING' | 'ANALYZING' | 'APPROVAL_PENDING' | 'REMEDIATING' | 'VERIFYING' | 'CLOSED'
type Trace = { who: string; text: string; tone?: 'critical' | 'warning' | 'success' | 'operator' }
type Log = { time: string; level: string; message: string; tone?: 'error' | 'highlight' | 'warning' }

const stages: Stage[] = ['INIT', 'COLLECTING', 'ANALYZING', 'APPROVAL_PENDING', 'REMEDIATING', 'VERIFYING', 'CLOSED']
const diagnosisEvidence = [
  'Errors began 2 minutes after the v2.4.1 deploy',
  'Commit diff changes DATABASE_POOL_SIZE from 20 to 0',
  'All failures are DBConnectionTimeoutException',
  'Proposed fix: roll back to v2.4.0',
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function DevOpsCopilot() {
  const [stage, setStage] = useState(-1)
  const [status, setStatus] = useState('No active incident')
  const [statusTone, setStatusTone] = useState('idle')
  const [traces, setTraces] = useState<Trace[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [rates, setRates] = useState<number[]>([])
  const [showDiagnosis, setShowDiagnosis] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [approval, setApproval] = useState(false)
  const [postMortem, setPostMortem] = useState('')
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const runRef = useRef(0)
  const startedAt = useRef(0)

  const latestRate = rates.at(-1) ?? 0
  const chartPoints = useMemo(() => {
    if (rates.length < 2) return '0,80 300,80'
    return rates.map((value, index) => `${Math.round((index * 300) / (rates.length - 1))},${80 - Math.min(value, 50) * 1.4}`).join(' ')
  }, [rates])

  const addTrace = (trace: Trace) => setTraces((current) => [...current, trace])
  const feed = async (values: number[], delay: number, token: number) => {
    for (const value of values) {
      if (runRef.current !== token) return false
      setRates((current) => [...current, value])
      await sleep(delay)
    }
    return true
  }

  const reset = () => {
    runRef.current += 1
    setStage(-1); setStatus('No active incident'); setStatusTone('idle'); setTraces([]); setLogs([]); setRates([])
    setShowDiagnosis(false); setConfidence(0); setApproval(false); setPostMortem(''); setRunning(false); setCopied(false)
  }

  const startIncident = async () => {
    const token = ++runRef.current
    startedAt.current = Date.now()
    setRunning(true); setTraces([]); setLogs([]); setRates([]); setShowDiagnosis(false); setApproval(false); setPostMortem('')
    setStage(0); setStatus('CRITICAL: high 500 error rate'); setStatusTone('critical')
    addTrace({ who: 'alertmanager', text: 'Alert received: High 500 error rate on /api/v1/payments', tone: 'critical' })
    if (!(await feed([0, 0, 3, 18, 36, 42], 220, token))) return
    setStage(1); addTrace({ who: 'collector agent', text: 'Fetching logs, git diffs and deployment manifest.' }); await sleep(700)
    if (runRef.current !== token) return
    const now = new Date().toLocaleTimeString()
    setLogs([
      { time: now, level: 'INFO ', message: 'payment-service deployed release v2.4.1' },
      { time: now, level: 'INFO ', message: 'config loaded: DATABASE_POOL_SIZE=0', tone: 'highlight' },
      { time: now, level: 'ERROR', message: 'DBConnectionTimeoutException: no connections available (pool=0)', tone: 'error' },
      { time: now, level: 'ERROR', message: 'POST /api/v1/payments 500 in 30002ms', tone: 'error' },
      { time: now, level: 'WARN ', message: 'health check degraded: error_rate=41.8%', tone: 'warning' },
    ])
    addTrace({ who: 'collector agent', text: 'Found DBConnectionTimeoutException in logs. v2.4.1 shipped recently.', tone: 'warning' })
    await feed([43, 41], 280, token); await sleep(500)
    setStage(2); addTrace({ who: 'analyzer agent', text: 'Comparing the v2.4.1 commit diff with the error surge.' }); await sleep(800)
    if (runRef.current !== token) return
    setShowDiagnosis(true)
    for (let value = 0; value <= 95; value += 5) { if (runRef.current !== token) return; setConfidence(value); await sleep(25) }
    addTrace({ who: 'analyzer agent', text: 'Diagnosis ready with 95% confidence.', tone: 'success' })
    setStage(3); setStatus('Waiting for approval'); setStatusTone('warning'); setApproval(true); setRunning(false)
    addTrace({ who: 'guard agent', text: 'Rollback is HIGH_RISK. Waiting for a human decision.', tone: 'warning' })
  }

  const decideRollback = async (approved: boolean) => {
    setApproval(false)
    if (!approved) { addTrace({ who: 'guard agent', text: 'Rollback rejected. Escalated to on-call.', tone: 'critical' }); setStatus('Escalated to on-call'); setStatusTone('critical'); return }
    const token = ++runRef.current
    setRunning(true); addTrace({ who: 'you', text: 'Approved rollback to v2.4.0.', tone: 'success' }); setStage(4); setStatus('Rolling back'); setStatusTone('working')
    addTrace({ who: 'guard agent', text: 'Running deployment_tool.rollback("payment-service", "v2.4.0")' })
    if (!(await feed([38, 30, 20], 300, token))) return
    setStage(5); setStatus('Verifying recovery'); addTrace({ who: 'verifier agent', text: 'Polling /health for 10 seconds.' })
    if (!(await feed([9, 3, 1, 0, 0, 0], 380, token))) return
    addTrace({ who: 'verifier agent', text: 'Error rate is back to 0%. Service is stable.', tone: 'success' })
    setStage(6); setStatus('Resolved'); setStatusTone('success'); setRunning(false)
    const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
    setPostMortem(`# Post-mortem: payment-service 500 errors\n\n**Severity:** Critical\n**Resolved by:** Rollback v2.4.1 to v2.4.0\n**Copilot handling time (demo):** ${seconds}s\n\n## Summary\nRelease v2.4.1 set DATABASE_POOL_SIZE=0. payment-service could not open database connections and returned 500 errors on /api/v1/payments (peak 43%).\n\n## Follow-ups\n- Add a config check that rejects DATABASE_POOL_SIZE below 1\n- Add a canary stage for payment-service releases`)
    addTrace({ who: 'reporter agent', text: 'Post-mortem generated and incident archived.', tone: 'success' })
  }

  useEffect(() => { return () => { runRef.current += 1 } }, [])

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3"><div className="mt-1 flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Terminal aria-hidden="true" /></div><div><h1 className="text-xl font-semibold tracking-tight">DevOps Copilot</h1><p className="text-sm text-muted-foreground">Incident console · production operations workspace</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><span className={`status-pill ${statusTone}`}>{status}</span><Button onClick={startIncident} disabled={running || stage >= 0} className="gap-2"><Sparkles data-icon="inline-start" />Trigger payment incident</Button><Button variant="outline" onClick={reset} disabled={running} aria-label="Reset incident"><RotateCcw data-icon="inline-start" />Reset</Button></div>
        </header>

        <div className="mb-4 grid grid-cols-2 overflow-x-auto rounded-xl border bg-card sm:grid-cols-7">{stages.map((item, index) => <div key={item} className={`stage-cell ${index < stage ? 'done' : index === stage ? 'now' : ''}`}>{index < stage && <Check aria-hidden="true" />} {item}</div>)}</div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-4">
            <section className="panel"><div className="section-heading"><div><p className="eyebrow">Live stream</p><h2>Agent trace</h2></div><span className="live-dot">{running ? 'LIVE' : stage >= 0 ? 'PAUSED' : 'IDLE'}</span></div>{traces.length ? <ol className="trace-list">{traces.map((trace, index) => <li key={`${trace.who}-${index}`} className={trace.tone}><span className="trace-dot" /><div><div className="mono-label">{trace.who}</div><p>{trace.text}</p></div></li>)}</ol> : <div className="empty-state">Trigger an incident to watch the agents work.</div>}</section>
            <section className="panel"><div className="section-heading"><div><p className="eyebrow">Service telemetry</p><h2>Error rate on <code>/api/v1/payments</code></h2></div><strong className="metric-value">{latestRate.toFixed(1)}%</strong></div><svg className="chart" viewBox="0 0 300 90" role="img" aria-label="Error rate over time"><line x1="0" y1="80" x2="300" y2="80" stroke="currentColor" opacity=".15" /><line x1="0" y1="10" x2="300" y2="10" stroke="currentColor" opacity=".15" strokeDasharray="3 3" /><polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={chartPoints} /></svg><div className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>50% error threshold</span></div></section>
          </div>

          <div className="space-y-4">
            {logs.length > 0 && <section className="panel"><div className="section-heading"><div><p className="eyebrow">Evidence</p><h2>Logs from payment-service</h2></div><span className="mono-label">v2.4.1</span></div><div className="log-box">{logs.map((log, index) => <div key={index} className={log.tone}><span>{log.time} {log.level}</span> {log.message}</div>)}</div></section>}
            {showDiagnosis && <section className="panel"><div className="section-heading"><div><p className="eyebrow">AI analysis</p><h2>Root cause diagnosis</h2></div><span className="confidence">{confidence}%</span></div><p className="diagnosis">Release <b>v2.4.1</b> set <code>DATABASE_POOL_SIZE=0</code>, so payment-service cannot open database connections.</p><div className="progress-track"><div style={{ width: `${confidence}%` }} /></div><ul className="evidence-list">{diagnosisEvidence.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></section>}
            {approval && <section className="panel approval"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="eyebrow">Human-in-the-loop guard</p><h2>Approval needed: high-risk action</h2><p className="mt-1 text-sm text-muted-foreground">Roll back <b className="text-foreground">payment-service</b> from <b className="text-foreground">v2.4.1</b> to <b className="text-foreground">v2.4.0</b>. This restarts the production service.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => decideRollback(true)} className="gap-2"><Check data-icon="inline-start" />Approve rollback</Button><Button variant="outline" onClick={() => decideRollback(false)} className="gap-2 text-destructive"><X data-icon="inline-start" />Reject and page on-call</Button></div></div></div></section>}
            {postMortem && <section className="panel"><div className="section-heading"><div><p className="eyebrow">Archive</p><h2>Post-mortem</h2></div><span className="status-pill success">RESOLVED</span></div><div className="postmortem">{postMortem.split('\n').map((line, index) => line.startsWith('# ') ? <h3 key={index}>{line.slice(2)}</h3> : line.startsWith('## ') ? <h4 key={index}>{line.slice(3)}</h4> : line.startsWith('- ') ? <li key={index}>{line.slice(2)}</li> : line ? <p key={index}>{line.replaceAll('**', '')}</p> : <div key={index} className="h-2" />)}</div><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(postMortem); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="mt-4 gap-2"><Clipboard data-icon="inline-start" />{copied ? 'Copied' : 'Copy as Markdown'}</Button></section>}
            {!logs.length && !showDiagnosis && !approval && !postMortem && <section className="panel empty-state">Logs, diagnosis, approval and post-mortem appear here as the incident progresses.</section>}
          </div>
        </div>
      </div>
    </main>
  )
}
