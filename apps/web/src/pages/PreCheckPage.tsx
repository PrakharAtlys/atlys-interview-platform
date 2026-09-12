import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CenterShell, Wordmark } from '../components/Shell'
import { Panel, Button, Badge } from '../components/ui'

type CheckState = 'pending' | 'ok' | 'fail'

export default function PreCheckPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camStream, setCamStream] = useState<MediaStream | null>(null)
  const [camState, setCamState] = useState<CheckState>('pending')
  const [screenState, setScreenState] = useState<CheckState>('pending')
  const [browserOk, setBrowserOk] = useState<CheckState>('pending')
  const [error, setError] = useState<string | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)

  useEffect(() => {
    const supported =
      'mediaDevices' in navigator &&
      'MediaRecorder' in window &&
      'IntersectionObserver' in window
    setBrowserOk(supported ? 'ok' : 'fail')
  }, [])

  // The <video> element is always mounted (see below) so this ref is never
  // null by the time a stream exists — binding it here rather than inline
  // in requestCamera() avoids a race where srcObject gets set before the
  // element has rendered.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = camStream
    }
  }, [camStream])

  async function requestCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      window.__proctorStream = stream
      setCamStream(stream)
      setCamState('ok')
    } catch {
      setCamState('fail')
      setError(
        'Camera/microphone access was denied or unavailable. This assessment requires both to proceed — please allow access in your browser settings and retry.',
      )
    }
  }

  async function requestScreenShare() {
    setScreenError(null)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      // If the candidate stops sharing mid-session, we log it — never silently
      // re-request or block, since the browser controls this permission entirely.
      window.__proctorScreenStream = stream
      setScreenState('ok')
    } catch {
      setScreenState('fail')
      setScreenError(
        'Screen sharing was denied or unavailable. This assessment requires it to proceed — please allow it and retry, sharing your entire screen (not just this tab).',
      )
    }
  }

  const canProceed = camState === 'ok' && screenState === 'ok' && browserOk === 'ok'

  return (
    <CenterShell>
      <div className="mb-8 flex justify-center">
        <Wordmark />
      </div>
      <Panel className="p-8">
        <h1 className="text-2xl font-semibold text-ink">System check</h1>
        <p className="mt-2 text-sm text-ink-dim">
          We verify your setup before anything is recorded. Nothing is uploaded at this stage.
        </p>

        <div className="mt-6 relative overflow-hidden rounded-xl border border-border bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover -scale-x-100 ${camState === 'ok' ? '' : 'hidden'}`}
          />
          {camState !== 'ok' && (
            <span className="text-sm text-ink-faint">Camera preview will appear here</span>
          )}
        </div>

        <div className="mt-5 space-y-2.5">
          <CheckRow label="Browser compatibility" state={browserOk} />
          <CheckRow label="Camera & microphone" state={camState} />
          <CheckRow label="Screen sharing" state={screenState} />
        </div>

        {error && <p className="mt-4 text-sm text-alert">{error}</p>}
        {screenError && <p className="mt-2 text-sm text-alert">{screenError}</p>}

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-3">
            {camState !== 'ok' && (
              <Button className="flex-1" onClick={requestCamera}>
                Enable camera & mic
              </Button>
            )}
            {camState === 'ok' && screenState !== 'ok' && (
              <Button className="flex-1" onClick={requestScreenShare}>
                Enable screen sharing
              </Button>
            )}
          </div>
          <Button
            variant={canProceed ? 'primary' : 'ghost'}
            disabled={!canProceed}
            onClick={() => navigate('/consent')}
          >
            Continue
          </Button>
        </div>
      </Panel>
    </CenterShell>
  )
}

function CheckRow({ label, state }: { label: string; state: CheckState }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
      <span className="text-sm text-ink">{label}</span>
      {state === 'pending' && <Badge tone="warn">Pending</Badge>}
      {state === 'ok' && <Badge tone="signal">Ready</Badge>}
      {state === 'fail' && <Badge tone="alert">Blocked</Badge>}
    </div>
  )
}

declare global {
  interface Window {
    __proctorStream?: MediaStream
    __proctorScreenStream?: MediaStream
  }
}
