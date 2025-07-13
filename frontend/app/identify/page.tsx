"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Header } from "@/components/Header"
import { CameraSection } from "@/components/CameraSection"
import { UploadSection } from "@/components/UploadSection"
import { ImagePreview } from "@/components/ImagePreview"
import { AnalysisResults } from "@/components/AnalysisResults"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/Spinner"
import { useIsMobile } from "@/hooks/use-mobile"

interface AnalysisResult {
  name: string
  commonName: string
  confidence: number
  description: string
  careInstructions: string[]
  medicinalUses?: string[]
  benefits?: string[]
  sideEffects?: string[]
}

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
}

export default function IdentifyPage() {
  const isMobile = useIsMobile()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Logout failed')
      }
      router.push('/login')
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message,
      })
    }
  }

  // Validate user session on page load
  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include', // Important for sending cookies
        })

        if (!response.ok) {
          throw new Error('Session validation failed')
        }

        const data = await response.json()
        setUserData(data)
      } catch (error) {
        router.push('/login')
      } finally {
        setIsLoadingUser(false)
      }
    }
    validateSession()
  }, [router, toast])

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
    // Camera will restart automatically due to useEffect
  }, [capturedImage])

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
    if (!capturedImage || !userData) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    // Simulate AI analysis with progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 90) {
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 200)

    try {
      // Convert base64 image URL to File object
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], 'captured_image.jpg', { type: 'image/jpeg' })

      // Create FormData and append file
      const formData = new FormData()
      formData.append('file', file)

      // Send to backend API through Next.js API route
      const result = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!result.ok) {
        throw new Error(`Failed to analyze image: ${result.statusText}`)
      }

      const data = await result.json()

      setAnalysisResult({
        name: data.data.plant_name,
        commonName: data.data.details.scientific_name,
        confidence: Math.round(data.data.confidence * 100),
        description: data.data.details.local_names.join(', '),
        careInstructions: data.data.details.uses,
        medicinalUses: data.data.details.uses,
        benefits: data.data.details.benefits,
        sideEffects: data.data.details.side_effects
      })

      setAnalysisProgress(100)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Unable to analyze the image. Please try again.",
      })
    } finally {
      clearInterval(progressInterval)
      setIsAnalyzing(false)
    }
  }, [capturedImage, userData, toast])

  const saveToCollection = useCallback(async () => {
    if (!analysisResult || !userData) return

    try {
      const response = await fetch('/api/user/identifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: analysisResult.name,
          commonName: analysisResult.commonName,
          confidence: analysisResult.confidence,
          description: analysisResult.description,
          careInstructions: analysisResult.careInstructions,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save identification')
      }

      toast({
        title: "Saved Successfully",
        description: "Plant identification saved to your collection.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Unable to save identification. Please try again.",
      })
    }
  }, [analysisResult, userData, toast])

  useEffect(() => {
    return () => {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage)
      }
    }
  }, [capturedImage])

  // Show loading spinner while validating session
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Header
        userData={userData}
        onLogout={handleLogout}
        isLoading={isLoadingUser}
        showBackButton={true}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Identify Your Plant
          </h1>
          <p className="text-gray-600">
            {isMobile ? "Take a clear photo or upload an image" : "Upload an image"} for instant AI identification
          </p>
        </div>

        {!capturedImage && !analysisResult && (
          <div className={`grid ${isMobile ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-8`}>
            {isMobile && (
              <CameraSection
                stream={stream}
                setStream={setStream}
                isFlashOn={isFlashOn}
                setIsFlashOn={setIsFlashOn}
                facingMode={facingMode}
                setFacingMode={setFacingMode}
                cameraError={cameraError}
                setCameraError={setCameraError}
                hasPermission={hasPermission}
                setHasPermission={setHasPermission}
                onCapture={capturePhoto}
              />
            )}
            <div className={`${!isMobile ? 'max-w-md mx-auto w-full' : ''}`}>
              <UploadSection onFileUpload={handleFileUpload} />
            </div>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && !analysisResult && (
          <ImagePreview
            capturedImage={capturedImage}
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
            onRetake={retakePhoto}
            onAnalyze={analyzeImage}
          />
        )}

        {/* Analysis Results */}
        {analysisResult && capturedImage && (
          <AnalysisResults
            analysisResult={analysisResult}
            capturedImage={capturedImage}
            onRetake={retakePhoto}
            onSave={saveToCollection}
          />
        )}

        {/* Hidden Canvas for Image Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}