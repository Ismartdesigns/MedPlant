"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Star, MapPin, Calendar } from "lucide-react"
import type { NigerianPlant } from "@/lib/nigerian-plants-data"
import Image from "next/image"

interface NigerianPlantCardProps {
  plant: NigerianPlant
  onClick: () => void
}

export function NigerianPlantCard({ plant, onClick }: NigerianPlantCardProps) {
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
    <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm overflow-hidden cursor-pointer">
      <CardContent className="p-0" onClick={onClick}>
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
          <Image
            src={plant.imageUrl || "/placeholder.svg"}
            alt={plant.plantName}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Floating Elements */}
          <div className="absolute top-4 right-4 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-lg animate-float-particle">
            <MapPin className="w-3 h-3 text-emerald-600" />
          </div>

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 left-2 w-8 h-8 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              // Handle favorite toggle
            }}
          >
            <Heart className="w-4 h-4 text-gray-600" />
          </Button>

          {/* Popularity Badge */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="secondary" className="bg-white/90 text-gray-700">
              <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
              {plant.popularity}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
              {plant.plantName}
            </h3>
            <p className="text-xs text-gray-500 italic">{plant.scientificName}</p>
          </div>

          {/* Local Names */}
          <div className="text-xs text-emerald-600 font-medium">
            {plant.localNames.length > 60 ? `${plant.localNames.substring(0, 60)}...` : plant.localNames}
          </div>

          {/* Parts Used */}
          <p className="text-xs text-gray-500 line-clamp-2">
            <span className="font-medium">Parts used:</span> {plant.partsUsed}
          </p>

          {/* Location and Date Info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center text-blue-600">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{plant.locationFound}</span>
            </div>
            <div className="flex items-center text-gray-500">
              <Calendar className="w-3 h-3 mr-1" />
              <span>{plant.dateCollected}</span>
            </div>
          </div>

          {/* Category and Difficulty */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={getCategoryColor(plant.category)}>
              {plant.category}
            </Badge>
            <Badge variant="secondary" className={getDifficultyColor(plant.difficulty)}>
              {plant.difficulty}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
