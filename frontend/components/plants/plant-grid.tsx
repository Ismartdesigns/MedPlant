"use client"

import { NigerianPlantCard } from "./plant-card"
import { NigerianPlantListItem } from "./plant-list-item"
import type { NigerianPlant } from "@/lib/nigerian-plants-data"

interface NigerianPlantGridProps {
  plants: NigerianPlant[]
  viewMode: "grid" | "list"
  onPlantSelect: (plant: NigerianPlant) => void
}

export function NigerianPlantGrid({ plants, viewMode, onPlantSelect }: NigerianPlantGridProps) {
  if (plants.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
          <div className="w-12 h-12 text-emerald-400">🌱</div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No plants found</h3>
        <p className="text-gray-600">Try adjusting your search or filters</p>
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {plants.map((plant) => (
          <NigerianPlantListItem key={plant.id} plant={plant} onClick={() => onPlantSelect(plant)} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {plants.map((plant) => (
        <NigerianPlantCard key={plant.id} plant={plant} onClick={() => onPlantSelect(plant)} />
      ))}
    </div>
  )
}
