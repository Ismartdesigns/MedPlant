"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Star, MapPin, Calendar, ChevronRight } from "lucide-react"
import type { NigerianPlant } from "@/lib/nigerian-plants-data"
import Image from "next/image"

interface NigerianPlantListItemProps {
  plant: NigerianPlant
  onClick: () => void
}

export function NigerianPlantListItem({ plant, onClick }: NigerianPlantListItemProps) {
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
    <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm overflow-hidden cursor-pointer">
      <CardContent className="p-0" onClick={onClick}>
        <div className="flex items-center p-4 space-x-4">
          {/* Plant Image */}
          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transform group-hover:scale-105 transition-transform">
            <Image
              src={plant.imageUrl || "/placeholder.svg"}
              alt={plant.plantName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Plant Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  {plant.plantName}
                </h3>
                <p className="text-sm text-gray-600 italic">{plant.scientificName}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-white/90 text-gray-700">
                  <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                  {plant.popularity}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle favorite toggle
                  }}
                >
                  <Heart className="w-4 h-4 text-gray-600" />
                </Button>
              </div>
            </div>

            {/* Local Names */}
            <div className="text-sm text-emerald-600 font-medium">
              {plant.localNames.length > 80 ? `${plant.localNames.substring(0, 80)}...` : plant.localNames}
            </div>

            <p className="text-sm text-gray-500 line-clamp-1">
              <span className="font-medium">Parts used:</span> {plant.partsUsed}
            </p>

            {/* Info Row */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center text-blue-600">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{plant.locationFound}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Calendar className="w-3 h-3 mr-1" />
                <span>{plant.dateCollected}</span>
              </div>
              <Badge variant="outline" className={getCategoryColor(plant.category)}>
                {plant.category}
              </Badge>
              <Badge variant="secondary" className={getDifficultyColor(plant.difficulty)}>
                {plant.difficulty}
              </Badge>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}
