import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RotateCcw, Eye, Brain, Sparkles } from "lucide-react"

interface ImagePreviewProps {
  capturedImage: string
  isAnalyzing: boolean
  analysisProgress: number
  onRetake: () => void
  onAnalyze: () => void
}

export function ImagePreview({
  capturedImage,
  isAnalyzing,
  analysisProgress,
  onRetake,
  onAnalyze
}: ImagePreviewProps) {
  return (
    <Card className="border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-emerald-600" />
            <span>Photo Preview</span>
          </div>
          {!isAnalyzing && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={onRetake} 
                size="sm"
                className="hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button 
                onClick={onAnalyze} 
                className="bg-emerald-600 hover:bg-emerald-700 transition-colors" 
                size="sm"
              >
                <Brain className="w-4 h-4 mr-2" />
                Analyze Plant
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden shadow-lg">
          <img
            src={capturedImage || "/placeholder.svg"}
            alt="Captured plant"
            className="w-full h-full object-cover"
          />
          
          {/* Analysis Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center space-y-6 p-6">
                {/* Animated AI Icon */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <Sparkles className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                
                <div className="text-white space-y-3">
                  <h3 className="text-xl font-semibold">AI is Analyzing Your Plant</h3>
                  <p className="text-sm text-emerald-200 opacity-90">
                    Processing image and identifying species...
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="w-64 mx-auto">
                    <Progress 
                      value={analysisProgress} 
                      className="h-2 bg-gray-700"
                    />
                    <p className="text-xs text-emerald-300 mt-2 font-medium">
                      {Math.round(analysisProgress)}% complete
                    </p>
                  </div>
                  
                  {/* Dynamic status messages */}
                  <div className="text-xs text-gray-300 mt-4">
                    {analysisProgress < 30 && "Scanning leaf patterns..."}
                    {analysisProgress >= 30 && analysisProgress < 60 && "Comparing with plant database..."}
                    {analysisProgress >= 60 && analysisProgress < 90 && "Identifying species characteristics..."}
                    {analysisProgress >= 90 && "Finalizing results..."}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Image quality indicator */}
          {!isAnalyzing && (
            <div className="absolute top-4 right-4">
              <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                Ready to Analyze
              </div>
            </div>
          )}
        </div>
        
        {/* Analysis tip */}
        {!isAnalyzing && (
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-sm text-emerald-700 text-center">
              <Brain className="w-4 h-4 inline mr-1" />
              Make sure the plant is clearly visible and well-lit for best results
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}