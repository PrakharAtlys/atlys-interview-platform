import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { captureWebcamFrameBase64 } from '../lib/captureFrame'

// Attaches a webcam snapshot to the flags worth a reviewer glancing at a
// picture for — not every routine window_focus/blur toggle, just the ones
// ProctorAlerts actually surfaces to the candidate as suspicious.
async function logFlagWithScreenshot(
  sessionId: string,
  type: string,
  meta?: Record<string, unknown>,
) {
  const screenshot = await captureWebcamFrameBase64()
  api.logEvent(sessionId, type, meta, screenshot)
}

/**
 * Central proctoring hook: webcam + screen chunked recording, plus activity
 * event logging. Every signal is logged for reviewer visibility — nothing
 * here blocks the candidate. Live booleans (tabHidden, fullscreen, ...) are
 * returned so the UI can surface gentle, non-blocking warnings.
 */
export function useProctoring(sessionId: string | null) {
  const [fullscreen, setFullscreen] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [screenShareActive, setScreenShareActive] = useState(true)
  const [multiMonitor, setMultiMonitor] = useState(false)
  const [recording, setRecording] = useState(false)
  const webcamSeqRef = useRef(0)
  const screenSeqRef = useRef(0)
  const webcamRecorderRef = useRef<MediaRecorder | null>(null)
  const screenRecorderRef = useRef<MediaRecorder | null>(null)

  // Webcam chunked recording
  useEffect(() => {
    if (!sessionId) return
    const stream = window.__proctorStream
    if (!stream) return

    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        api.uploadChunk(sessionId, e.data, webcamSeqRef.current++, 'webcam')
      }
    }
    recorder.start(10_000) // flush a chunk every 10s so a crash loses at most 10s
    webcamRecorderRef.current = recorder
    setRecording(true)

    return () => {
      if (recorder.state !== 'inactive') recorder.stop()
      setRecording(false)
    }
  }, [sessionId])

  // Screen chunked recording — candidate granted this in the pre-check step.
  // If they stop sharing mid-session (browser's native "stop sharing" control),
  // we log it and surface a banner, but never force a re-prompt or block them.
  useEffect(() => {
    if (!sessionId) return
    const stream = window.__proctorScreenStream
    if (!stream) return

    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        api.uploadChunk(sessionId, e.data, screenSeqRef.current++, 'screen')
      }
    }
    recorder.start(10_000)
    screenRecorderRef.current = recorder

    const track = stream.getVideoTracks()[0]
    const onEnded = () => {
      setScreenShareActive(false)
      logFlagWithScreenshot(sessionId, 'screen_share_stopped')
    }
    track?.addEventListener('ended', onEnded)

    return () => {
      track?.removeEventListener('ended', onEnded)
      if (recorder.state !== 'inactive') recorder.stop()
    }
  }, [sessionId])

  // Tab visibility + window focus/blur
  useEffect(() => {
    if (!sessionId) return
    const onVisibility = () => {
      setTabHidden(document.hidden)
      if (document.hidden) {
        // Capture the frame right before they switch away — the moment
        // itself, not whatever's in frame once they're already gone.
        logFlagWithScreenshot(sessionId, 'tab_hidden')
      } else {
        api.logEvent(sessionId, 'tab_visible')
      }
    }
    const onBlur = () => api.logEvent(sessionId, 'window_blur')
    const onFocus = () => api.logEvent(sessionId, 'window_focus')

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [sessionId])

  // Fullscreen tracking
  useEffect(() => {
    if (!sessionId) return
    const onChange = () => {
      const isFs = !!document.fullscreenElement
      setFullscreen(isFs)
      if (isFs) {
        api.logEvent(sessionId, 'fullscreen_enter')
      } else {
        logFlagWithScreenshot(sessionId, 'fullscreen_exit')
      }
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [sessionId])

  // Multi-monitor detection (best-effort)
  useEffect(() => {
    if (!sessionId) return
    ;(async () => {
      try {
        const w = window as unknown as {
          getScreenDetails?: () => Promise<{ screens: unknown[] }>
        }
        if (w.getScreenDetails) {
          const details = await w.getScreenDetails()
          if (details.screens.length > 1) {
            setMultiMonitor(true)
            logFlagWithScreenshot(sessionId, 'multi_monitor_detected', { count: details.screens.length })
          }
        }
      } catch {
        // permission denied or unsupported — not fatal, just no signal
      }
    })()
  }, [sessionId])

  // Viewport-resize heuristic for devtools open/close (never blocks, just logs)
  useEffect(() => {
    if (!sessionId) return
    let wasOpen = false
    const threshold = 160
    const check = () => {
      const isOpen =
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      if (isOpen !== wasOpen) {
        wasOpen = isOpen
        api.logEvent(sessionId, isOpen ? 'devtools_likely_open' : 'devtools_likely_closed')
      }
    }
    const interval = window.setInterval(check, 2000)
    return () => window.clearInterval(interval)
  }, [sessionId])

  // beforeunload guard
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  async function requestFullscreen() {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // user dismissed — we just re-prompt via UI, never force
    }
  }

  function logPaste(sessionId: string, fieldName: string, contentLength: number) {
    api.logEvent(sessionId, 'paste', { field: fieldName, length: contentLength })
  }

  // Called once the candidate hits "Submit & finish" — releases the camera
  // and screen-share OS indicators immediately rather than leaving them lit
  // until the tab/page is torn down.
  function stopAllRecording() {
    if (webcamRecorderRef.current && webcamRecorderRef.current.state !== 'inactive') {
      webcamRecorderRef.current.stop()
    }
    if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
      screenRecorderRef.current.stop()
    }
    window.__proctorStream?.getTracks().forEach((t) => t.stop())
    window.__proctorScreenStream?.getTracks().forEach((t) => t.stop())
    window.__proctorStream = undefined
    window.__proctorScreenStream = undefined
    setRecording(false)
  }

  return {
    fullscreen,
    tabHidden,
    screenShareActive,
    multiMonitor,
    recording,
    requestFullscreen,
    logPaste,
    stopAllRecording,
  }
}

function pickMimeType() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ''
}
