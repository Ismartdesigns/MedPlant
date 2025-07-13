import type React from "react"
import { useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Camera,
  FlashlightOffIcon as FlashOff,
  FlashlightIcon as Flash,
  SwitchCamera,
  X,
} from "lucide-react"

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean; // Optional property for torch capability
}

interface CameraConstraints {
  video: {
    width: { ideal: number }
    height: { ideal: number }
    facingMode: "user" | "environment"
  }
}

interface CameraSectionProps {
  stream: MediaStream | null
  setStream: (stream: MediaStream | null) => void
  isFlashOn: boolean
  setIsFlashOn: (isOn: boolean) => void
  facingMode: "user" | "environment"
  setFacingMode: (mode: "user" | "environment") => void
  cameraError: string | null
  setCameraError: (error: string | null) => void
  hasPermission: boolean | null
  setHasPermission: (permission: boolean | null) => void
  onCapture: () => void
}

export function CameraSection({
  stream,
  setStream,
  isFlashOn,
  setIsFlashOn,
  facingMode,
  setFacingMode,
  cameraError,
  setCameraError,
  hasPermission,
  setHasPermission,
  onCapture
}: CameraSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)

      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported on this device')
      }

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found')
      }

      // Set optimal constraints
      const constraints: CameraConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: facingMode,
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Verify stream is active and has video tracks
      if (!mediaStream || mediaStream.getVideoTracks().length === 0) {
        throw new Error('Failed to initialize camera stream')
      }

      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Handle video loading errors
        videoRef.current.onerror = () => {
          setCameraError('Failed to display camera stream')
          setHasPermission(false)
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setHasPermission(false)
      setCameraError(
        error instanceof Error
          ? error.message
          : 'Unable to access camera. Please check permissions.'
      )
    }
  }, [facingMode, stream, setStream, setCameraError, setHasPermission])

  const toggleFlash = useCallback(async () => {
    if (!stream) return

    try {
      const track = stream.getVideoTracks()[0]
      if (!track) {
        throw new Error('No video track available')
      }

      const capabilities = track.getCapabilities() as ExtendedMediaTrackCapabilities

      if (!capabilities.torch) {
        throw new Error('Flash is not supported on this device')
      }

      await track.applyConstraints({
        advanced: [{ torch: !isFlashOn } as any],
      })
      setIsFlashOn(!isFlashOn)
    } catch (error) {
      console.error('Flash error:', error)
      // Show toast or handle error appropriately
    }
  }, [stream, isFlashOn, setIsFlashOn])

  const switchCamera = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      if (videoDevices.length <= 1) {
        throw new Error('No alternative camera available')
      }

      setFacingMode(facingMode === 'user' ? 'environment' : 'user')
    } catch (error) {
      console.error('Camera switch error:', error)
      setCameraError(
        error instanceof Error
          ? error.message
          : 'Unable to switch camera'
      )
    }
  }, [facingMode, setFacingMode, setCameraError])

  useEffect(() => {
    if (facingMode && hasPermission !== false) {
      startCamera()
    }
  }, [facingMode, hasPermission, startCamera])

  return (
    <Card className="border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-emerald-600" />
          <span>Camera Capture</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-square bg-gray-900 rounded-b-lg overflow-hidden">
          {hasPermission === false ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center space-y-4">
                <Camera className="w-16 h-16 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Camera Access Required</h3>
                  <p className="text-gray-600 mt-2">Please allow camera access to take photos</p>
                </div>
                <Button onClick={startCamera} className="bg-emerald-600 hover:bg-emerald-700">
                  Enable Camera
                </Button>
              </div>
            </div>
          ) : cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center space-y-4">
                <X className="w-16 h-16 text-red-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Camera Error</h3>
                  <p className="text-gray-600 mt-2">{cameraError}</p>
                </div>
                <Button onClick={startCamera} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {/* Camera Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Focus Grid */}
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20"></div>
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20"></div>
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20"></div>
                </div>

                {/* Center Focus Point */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-16 h-16 border-2 border-emerald-400 rounded-full animate-pulse">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white text-sm text-center">
                    Position the plant in the center and ensure good lighting
                  </p>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 pointer-events-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFlash}
                  className="bg-black/50 border-white/30 text-white hover:bg-black/70"
                >
                  {isFlashOn ? <Flash className="w-4 h-4" /> : <FlashOff className="w-4 h-4" />}
                </Button>

                <Button
                  onClick={onCapture}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-16 h-16 p-0"
                >
                  <Camera className="w-6 h-6" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  className="bg-black/50 border-white/30 text-white hover:bg-black/70"
                >
                  <SwitchCamera className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}