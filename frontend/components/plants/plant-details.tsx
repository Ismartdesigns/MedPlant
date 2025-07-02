"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Heart,
  Share2,
  MapPin,
  Calendar,
  Smartphone,
  Star,
  Camera,
  AlertTriangle,
  CheckCircle,
  Leaf,
  Info,
} from "lucide-react"
import type { NigerianPlant } from "@/lib/nigerian-plants-data"
import Image from "next/image"

interface NigerianPlantDetailsProps {
  plant: NigerianPlant
  onClose: () => void
}

export function NigerianPlantDetails({ plant, onClose }: NigerianPlantDetailsProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700"
      case "Medium":
        return "bg-yellow-100 text-yellow-700"
      case "Hard":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "medicinal":
        return "bg-emerald-100 text-emerald-700"
      case "fruit":
        return "bg-orange-100 text-orange-700"
      case "vegetable":
        return "bg-green-100 text-green-700"
      case "herb":
        return "bg-purple-100 text-purple-700"
      default:
        return "bg-blue-100 text-blue-700"
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden">
                <Image
                  src={plant.imageUrl || "/placeholder.svg"}
                  alt={plant.plantName}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{plant.plantName}</h2>
                <p className="text-lg text-emerald-600 italic">{plant.scientificName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plant Image */}
          <div className="relative h-64 rounded-lg overflow-hidden">
            <Image
              src={plant.imageUrl || "/placeholder.svg"}
              alt={plant.plantName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
            />
          </div>

          {/* Header Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getCategoryColor(plant.category)}>
              {plant.category}
            </Badge>
            <Badge variant="secondary" className={getDifficultyColor(plant.difficulty)}>
              {plant.difficulty}
            </Badge>
            <Badge variant="secondary" className="bg-white text-gray-700">
              <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
              {plant.popularity} popularity
            </Badge>
          </div>

          {/* Local Names */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Local Names</h3>
            <p className="text-emerald-700 font-medium bg-emerald-50 p-3 rounded-lg">{plant.localNames}</p>
          </div>

          {/* Collection Info Grid */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Information</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-emerald-100">
                <CardContent className="p-4 text-center">
                  <MapPin className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Location</h4>
                  <p className="text-sm text-gray-600">{plant.locationFound}</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-100">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Date Collected</h4>
                  <p className="text-sm text-gray-600">{plant.dateCollected}</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-100">
                <CardContent className="p-4 text-center">
                  <Smartphone className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Device Used</h4>
                  <p className="text-sm text-gray-600">{plant.deviceUsed}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Parts Used */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Parts Used</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Leaf className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">{plant.partsUsed}</p>
              </div>
            </div>
          </div>

          {/* Uses and Benefits */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Info className="w-5 h-5 text-emerald-600 mr-2" />
                  Traditional Uses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">{plant.uses}</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Health Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">{plant.benefits}</p>
              </CardContent>
            </Card>
          </div>

          {/* Side Effects Warning */}
          <Card className="border-red-100 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-base text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                Important Safety Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700 leading-relaxed">
                <span className="font-medium">Potential Side Effects:</span> {plant.sideEffects}
              </p>
              <div className="mt-3 p-3 bg-red-100 rounded-lg">
                <p className="text-xs text-red-800">
                  <strong>Disclaimer:</strong> This information is for educational purposes only and should not replace
                  professional medical advice. Always consult with a healthcare provider before using any plant for
                  medicinal purposes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Separator />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <Camera className="w-4 h-4 mr-2" />
              Identify Similar Plant
            </Button>
            <Button variant="outline" className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              Add to Collection
            </Button>
            <Button variant="outline" className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              Share Knowledge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
