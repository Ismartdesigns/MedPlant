"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Leaf,
  Camera,
  RotateCcw,
  FlashlightOffIcon as FlashOff,
  FlashlightIcon as Flash,
  SwitchCamera,
  X,
  Check,
  Upload,
  ArrowLeft,
  Zap,
  Eye,
  Brain,
} from "lucide-react"
import Link from "next/link"

interface CameraConstraints {
  video: {
    width: { ideal: number }
    height: { ideal: number }
    facingMode: "user" | "environment"
  }
}

export default function IdentifyPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Mock analysis result
  const [analysisResult, setAnalysisResult] = useState<{
    name: string
    commonName: string
    confidence: number
    description: string
    careInstructions: string[]
  } | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const constraints: CameraConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: facingMode,
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setHasPermission(false)
      setCameraError("Unable to access camera. Please check permissions.")
    }
  }, [facingMode, stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and create URL
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob)
          setCapturedImage(imageUrl)
          stopCamera()
        }
      },
      "image/jpeg",
      0.9,
    )
  }, [stopCamera])

  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage)
      setCapturedImage(null)
    }
    setAnalysisResult(null)
    startCamera()
  }, [capturedImage, startCamera])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file && file.type.startsWith("image/")) {
        const imageUrl = URL.createObjectURL(file)
        setCapturedImage(imageUrl)
        stopCamera()
      }
    },
    [stopCamera],
  )

  const analyzeImage = useCallback(async () => {
    if (!capturedImage) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    // Simulate AI analysis with progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Mock analysis result
    setAnalysisResult({
      name: "Monstera Deliciosa",
      commonName: "Swiss Cheese Plant",
      confidence: 98,
      description: "A popular tropical houseplant known for its distinctive split leaves and easy care requirements.",
      careInstructions: [
        "Bright, indirect light",
        "Water when top inch of soil is dry",
        "High humidity preferred",
        "Temperature 65-80°F (18-27°C)",
        "Monthly fertilizing during growing season",
      ],
    })

    setIsAnalyzing(false)
    clearInterval(progressInterval)
  }, [capturedImage])

  const toggleFlash = useCallback(async () => {
    if (!stream) return

    try {
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashOn } as any],
        })
        setIsFlashOn(!isFlashOn)
      }
    } catch (error) {
      console.error("Flash not supported:", error)
    }
  }, [stream, isFlashOn])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

  useEffect(() => {
    if (facingMode && hasPermission !== false) {
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [facingMode])

  useEffect(() => {
    return () => {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage)
      }
    }
  }, [capturedImage])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center text-emerald-600 hover:text-emerald-700">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center transform rotate-12">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">MedPlant</span>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">
              <Zap className="w-3 h-3 mr-1" />
              AI Identify
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Identify Your Plant</h1>
          <p className="text-gray-600">Take a clear photo or upload an image for instant AI identification</p>
        </div>

        {!capturedImage && !analysisResult && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Camera Section */}
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
                          onClick={capturePhoto}
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

            {/* Upload Section */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span>Upload Image</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-200 rounded-lg p-8 hover:border-emerald-300 transition-colors cursor-pointer group"
                  >
                    <Upload className="w-12 h-12 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Image</h3>
                    <p className="text-gray-600 mb-4">Select a photo from your device</p>
                    <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      Browse Files
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Tips */}
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-900 mb-2">📸 Photo Tips</h4>
                  <ul className="text-sm text-emerald-800 space-y-1">
                    <li>• Ensure good lighting</li>
                    <li>• Focus on leaves and flowers</li>
                    <li>• Avoid blurry images</li>
                    <li>• Include the whole plant if possible</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && !analysisResult && (
          <Card className="border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-emerald-600" />
                  <span>Photo Preview</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={retakePhoto} size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button onClick={analyzeImage} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden">
                <img
                  src={capturedImage || "/placeholder.svg"}
                  alt="Captured plant"
                  className="w-full h-full object-cover"
                />
                {/* Analysis Overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <div className="text-white space-y-2">
                        <h3 className="text-lg font-semibold">Analyzing Plant...</h3>
                        <Progress value={analysisProgress} className="w-48 mx-auto" />
                        <p className="text-sm text-emerald-200">{Math.round(analysisProgress)}% complete</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <Card className="border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span>Identification Complete</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">{analysisResult.confidence}% Match</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <img
                    src={capturedImage! || "/placeholder.svg"}
                    alt="Identified plant"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Results */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{analysisResult.name}</h2>
                    <p className="text-lg text-emerald-600">{analysisResult.commonName}</p>
                  </div>

                  <p className="text-gray-600">{analysisResult.description}</p>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Care Instructions:</h3>
                    <ul className="space-y-1">
                      {analysisResult.careInstructions.map((instruction, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <Button onClick={retakePhoto} variant="outline" className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      New Photo
                    </Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">Save to Collection</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hidden Canvas for Image Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
