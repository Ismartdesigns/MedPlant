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

interface AnalysisResult {
  name: string
  commonName: string
  confidence: number
  description: string
  careInstructions: string[]
}

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
}

export default function IdentifyPage() {
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

  // Validate user session on page load
  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Session invalid')
        }
        const data = await response.json()
        setUserData(data)
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please log in again to continue.",
        })
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
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Mock analysis result - in real app, this would be an API call
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
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Unable to analyze the image. Please try again.",
      })
    } finally {
      setIsAnalyzing(false)
      clearInterval(progressInterval)
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
  isLoading={isLoading} 
  variant="identify" 
  showBackButton={true} 
/>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Identify Your Plant
          </h1>
          <p className="text-gray-600">
            Take a clear photo or upload an image for instant AI identification
          </p>
        </div>

        {!capturedImage && !analysisResult && (
          <div className="grid lg:grid-cols-2 gap-8">
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
            <UploadSection onFileUpload={handleFileUpload} />
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