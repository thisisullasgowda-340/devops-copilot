[README.md](https://github.com/user-attachments/files/32881635/README.md)
# DevOps Copilot — AI Incident Response Agent

A hackathon-ready functional MVP that demonstrates an agentic incident-response workflow:

**Detect → Collect → Analyze → Guard → Human Approval → Remediate → Verify → Post-Mortem → Close**

## What is implemented

- Payment API incident trigger
- Simulated production telemetry and logs
- Collector Agent
- Analyzer Agent with evidence-based RCA and confidence score
- Guard Agent with high-risk human approval
- Remediation Agent that performs a simulated production rollback
- Verification Agent that validates recovery
- Adaptive rejection path that pages on-call
- AI-generated post-mortem and preventive action
- Live agent trace and telemetry dashboard
- No external API keys required

## Demo scenario

Release `v2.4.1` changes:

`DATABASE_POOL_SIZE: 20 → 0`

The payment service then produces `DBConnectionTimeoutException` and the payment API reaches 41% errors.

The Analyzer correlates deployment timing, configuration diff and logs and produces a 95% confidence RCA.

The Guard Agent classifies rollback as high-risk and waits for a human decision.

After approval:

`v2.4.1 → v2.4.0`

Verification checks:

- Error rate: 41.0% → 0.2%
- DB connections: 0 → 20
- Payment success: 59.0% → 99.8%
- API latency: 2800 ms → 180 ms

The incident is then closed and a preventive action is generated.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Open:

`http://localhost:3000`

## Deploy

This is a standard Node/Express application. It can be deployed to any platform that supports Node.js, such as Render, Railway, Fly.io, Azure App Service, or a similar service.

Start command:

```bash
npm start
```

No environment variables are required.

## Suggested 3-minute demo

1. Open the deployed URL.
2. Explain that all data is simulated for the MVP.
3. Click **Trigger payment incident**.
4. Show Alert → Collector → Analyzer.
5. Point to the evidence and 95% RCA confidence.
6. Explain why the Guard Agent blocks automatic rollback.
7. Click **Approve rollback**.
8. Show Remediation.
9. Show Verification passing.
10. Finish with the AI post-mortem and preventive action.

## Architecture

```text
              ┌─────────────────────┐
              │ Production Telemetry│
              │ logs / metrics / CI │
              └──────────┬──────────┘
                         ↓
                ┌─────────────────┐
                │ Alert Manager   │
                └────────┬────────┘
                         ↓
                ┌─────────────────┐
                │ Collector Agent │
                └────────┬────────┘
                         ↓
                ┌─────────────────┐
                │ Analyzer Agent  │
                │ RCA + confidence│
                └────────┬────────┘
                         ↓
                ┌─────────────────┐
                │ Guard Agent     │
                │ risk assessment │
                └────────┬────────┘
                         ↓
                   HUMAN APPROVAL
                    ↙         ↘
                Reject        Approve
                  ↓              ↓
              On-call       Remediation
                                 ↓
                            Verification
                           ↙           ↘
                       Failed        Passed
                         ↓              ↓
                      Escalate       Close
                                        ↓
                                  Post-mortem
```

## Hackathon note

The MVP deliberately uses simulated telemetry and deterministic agent reasoning so the project works without organizer-provided API keys. The agent boundaries, state transitions, evidence collection, approval gate, remediation and verification are implemented as executable application logic.
