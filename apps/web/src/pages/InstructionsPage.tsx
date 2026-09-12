import { useNavigate } from 'react-router-dom'
import { CenterShell, Wordmark } from '../components/Shell'
import { Panel, Button, Badge } from '../components/ui'

export default function InstructionsPage() {
  const navigate = useNavigate()
  return (
    <CenterShell>
      <div className="mb-8 flex justify-center">
        <Wordmark />
      </div>
      <Panel className="p-8">
        <h1 className="text-2xl font-semibold text-ink">Before you start</h1>

        <div className="mt-5 space-y-4">
          <Rule tone="signal" label="Allowed">
            Using DevTools, the Network/Sources/Console tabs, and your own terminal or local
            tools — several challenges expect it.
          </Rule>
          <Rule tone="alert" label="Not allowed">
            Leaving the assessment tab/window for unrelated reasons, using a second device to
            search for answers, or having another person assist you.
          </Rule>
          <Rule tone="warn" label="Monitored, not blocked">
            Tab switches, window focus loss, fullscreen exits, paste events, and camera presence
            are logged for a human reviewer — none of these will auto-fail you.
          </Rule>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm text-ink-dim">
          You'll have a fixed time limit for the full set of challenges, visible as a countdown
          throughout. You can move between challenges freely and submit in any order.
        </div>

        <Button className="mt-6 w-full" onClick={() => navigate('/assessment')}>
          Start assessment
        </Button>
      </Panel>
    </CenterShell>
  )
}

function Rule({
  tone,
  label,
  children,
}: {
  tone: 'signal' | 'alert' | 'warn'
  label: string
  children: string
}) {
  return (
    <div className="flex gap-3">
      <Badge tone={tone}>{label}</Badge>
      <p className="text-sm text-ink-dim">{children}</p>
    </div>
  )
}
