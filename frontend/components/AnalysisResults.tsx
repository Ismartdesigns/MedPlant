import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Camera, Save } from "lucide-react"
import { useState } from "react"

interface AnalysisResult {
  name: string
  commonName: string
  confidence: number
  description: string
  careInstructions: string[]
}

interface AnalysisResultsProps {
  analysisResult: AnalysisResult
  capturedImage: string
  onRetake: () => void
  onSave: () => Promise<void>
}

export function AnalysisResults({
  analysisResult,
  capturedImage,
  onRetake,
  onSave
}: AnalysisResultsProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <span>Identification Complete</span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700">
            {analysisResult.confidence}% Match
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <img
              src={capturedImage || "/placeholder.svg"}
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
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3 flex-shrink-0"></div>
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button onClick={onRetake} variant="outline" className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                New Photo
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save to Collection'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}