"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Camera, Upload, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function QuickActions() {
  const [image, setImage] = useState<File | null>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImage(file)
      console.log("Uploaded Image:", file)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <Link href="/identify">
        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white cursor-pointer overflow-hidden">
          <CardContent className="p-0 relative">
            {/* 3D CSS Background */}
            <div className="h-32 relative overflow-hidden">
              <div className="absolute inset-0 perspective-1000">
                <div className="absolute inset-0 transform-gpu preserve-3d">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/30 rounded-full shadow-xl flex items-center justify-center transform rotateY-12 rotateX-12 group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center space-y-4 relative z-10">
              <div>
                <h3 className="text-xl font-semibold">Identify Plant</h3>
                <p className="text-emerald-100">Take a photo to identify</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm cursor-pointer overflow-hidden">
        <CardContent className="p-0">
          {/* 3D CSS Scene */}
          <div className="h-32 relative overflow-hidden bg-gradient-to-br from-teal-50 to-emerald-50">
            <div className="absolute inset-0 perspective-1000">
              <div className="absolute inset-0 transform-gpu preserve-3d">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-teal-200 to-emerald-200 rounded-full opacity-40 blur-xl animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center transform rotateY-12 rotateX-12 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-8 h-8 text-teal-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Upload Image</h3>
              <p className="text-gray-600">Upload from gallery</p>
              <label className="mt-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Link href="/plants">
        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm cursor-pointer overflow-hidden">
          <CardContent className="p-0">
            {/* 3D CSS Scene */}
            <div className="h-32 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
              <div className="absolute inset-0 perspective-1000">
                <div className="absolute inset-0 transform-gpu preserve-3d">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full opacity-40 blur-xl animate-pulse"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center transform rotateY-12 rotateX-12 group-hover:scale-110 transition-transform duration-300">
                    <Search className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Browse Plants</h3>
                <p className="text-gray-600">Explore plant database</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}