import type React from "react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"

interface UploadSectionProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function UploadSection({ onFileUpload }: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
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
            onChange={onFileUpload}
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
  )
}