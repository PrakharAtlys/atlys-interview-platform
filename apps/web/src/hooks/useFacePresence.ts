import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { api } from '../lib/api'

export type FaceStatus = 'initializing' | 'ok' | 'no_face' | 'multiple_faces' | 'looking_away'

let modelsLoadedPromise: Promise<void> | null = null

function loadModels() {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    ]).then(() => undefined)
  }
  return modelsLoadedPromise
}

const CHECK_INTERVAL_MS = 3000
// A sustained flag (not a single blip) is what's worth surfacing — cameras drop
// frames and lighting flickers constantly, so we require this many consecutive
// bad reads before we tell the candidate or log an event.
const SUSTAINED_READS_REQUIRED = 3
// Yaw heuristic: how far the nose can drift from the eye-line midpoint (as a
// fraction of inter-eye distance) before we call it "looking away" rather than
// normal head micro-movement.
const YAW_RATIO_THRESHOLD = 0.55

/**
 * Runs a lightweight in-browser face-presence + head-pose check against the
 * candidate's own webcam stream. Never blocks anything — every sustained
 * anomaly (no face, multiple faces, looking away) is surfaced to the candidate
 * as a gentle non-blocking banner AND logged as a flag for reviewer context.
 * False positives from lighting/camera angle are expected; humans make the call.
 */
export function useFacePresence(sessionId: string | null) {
  const [status, setStatus] = useState<FaceStatus>('initializing')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streakRef = useRef<{ status: FaceStatus; count: number }>({ status: 'ok', count: 0 })
  const loggedStatusRef = useRef<FaceStatus>('ok')

  useEffect(() => {
    if (!sessionId) return
    const stream = window.__proctorStream
    if (!stream) return

    let cancelled = false
    let interval: number | undefined

    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    videoRef.current = video

    const canvas = document.createElement('canvas')

    function captureFrameBase64(): string | undefined {
      if (video.videoWidth === 0) return undefined
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return undefined
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      // Strip the "data:image/jpeg;base64," prefix — the backend expects raw base64.
      return canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
    }

    loadModels()
      .then(() => video.play())
      .then(() => {
        if (cancelled) return
        interval = window.setInterval(async () => {
          const reading = await detectOnce(video)
          applyReading(reading)
        }, CHECK_INTERVAL_MS)
      })
      .catch(() => {
        // Model failed to load (offline, blocked) — face-presence signal is
        // best-effort only, so we just stop trying rather than blocking anything.
      })

    function applyReading(reading: FaceStatus) {
      const streak = streakRef.current
      if (reading === streak.status) {
        streak.count += 1
      } else {
        streak.status = reading
        streak.count = 1
      }

      if (streak.count < SUSTAINED_READS_REQUIRED) return

      setStatus(reading)
      if (reading !== loggedStatusRef.current && sessionId) {
        loggedStatusRef.current = reading
        if (reading !== 'ok') {
          api.logEvent(sessionId, `face_${reading}`, undefined, captureFrameBase64())
        }
      }
    }

    return () => {
      cancelled = true
      if (interval) window.clearInterval(interval)
      video.pause()
      video.srcObject = null
    }
  }, [sessionId])

  return { status }
}

async function detectOnce(video: HTMLVideoElement): Promise<FaceStatus> {
  if (video.readyState < 2) return 'no_face'

  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
    .withFaceLandmarks(true)

  if (detections.length === 0) return 'no_face'
  if (detections.length > 1) return 'multiple_faces'

  const landmarks = detections[0].landmarks
  const leftEye = average(landmarks.getLeftEye())
  const rightEye = average(landmarks.getRightEye())
  const nose = average(landmarks.getNose())

  const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)
  const eyeMidpointX = (leftEye.x + rightEye.x) / 2
  const yawOffset = Math.abs(nose.x - eyeMidpointX)

  if (eyeDistance > 0 && yawOffset / eyeDistance > YAW_RATIO_THRESHOLD) {
    return 'looking_away'
  }

  return 'ok'
}

function average(points: { x: number; y: number }[]) {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}
