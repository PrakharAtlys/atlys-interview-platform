// Shared webcam-frame-grab used to attach a visual snapshot to a flag at the
// moment it fires. Keeps one hidden <video> bound to the proctor stream alive
// for the whole session rather than creating/tearing one down per capture.
let hiddenVideo: HTMLVideoElement | null = null
let hiddenCanvas: HTMLCanvasElement | null = null
let boundStream: MediaStream | null = null

function ensureBound(stream: MediaStream) {
  if (boundStream === stream && hiddenVideo) return
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  video.play().catch(() => {})
  hiddenVideo = video
  hiddenCanvas = document.createElement('canvas')
  boundStream = stream
}

export async function captureWebcamFrameBase64(): Promise<string | undefined> {
  const stream = window.__proctorStream
  if (!stream) return undefined
  ensureBound(stream)
  const video = hiddenVideo
  const canvas = hiddenCanvas
  if (!video || !canvas || video.videoWidth === 0) return undefined

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  // Strip the "data:image/jpeg;base64," prefix — the backend expects raw base64.
  return canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
}
