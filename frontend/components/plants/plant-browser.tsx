"use client"

import { useState, useEffect } from "react"
import { NigerianPlantFilters } from "./plant-filters"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

interface PlantIdentification {
  id: string
  plant_name: string
  scientific_name: string
  confidence_score: number
  created_at: string
  image_url: string
  uses: string
}

export function NigerianPlantBrowser() {
  const [plants, setPlants] = useState<PlantIdentification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { toast } = useToast()

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response = await fetch("/api/plants")
        if (!response.ok) throw new Error("Failed to fetch plant identifications")
        const data = await response.json()
        setPlants(data)
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load plant identifications",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPlants()
  }, [])

  const getConfidenceCategory = (score: number) => {
    if (score >= 0.9) return "High Confidence"
    if (score >= 0.7) return "Medium Confidence"
    return "Low Confidence"
  }

  const categories = ["all", "High Confidence", "Medium Confidence", "Low Confidence"]

  const filteredPlants = plants
    .filter((plant) => {
      const matchesSearch =
        searchQuery === "" ||
        plant.plant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plant.uses && plant.uses.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory =
        selectedCategory === "all" ||
        getConfidenceCategory(plant.confidence_score) === selectedCategory

      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "name":
          return a.plant_name.localeCompare(b.plant_name)
        case "confidence":
          return b.confidence_score - a.confidence_score
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <NigerianPlantFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalResults={filteredPlants.length}
        categories={categories}
      />

      <div
        className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}`}
      >
        {filteredPlants.map((plant) => (
          <Card key={plant.id} className={`overflow-hidden ${viewMode === "list" ? "flex" : ""}`}>
            <div className={`${viewMode === "list" ? "w-48 h-48" : "w-full h-48"} relative`}>
              <img
                src={plant.image_url}
                alt={plant.plant_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-sm font-medium">
                {Math.round(plant.confidence_score * 100)}% Match
              </div>
            </div>
            <CardContent className={`p-4 ${viewMode === "list" ? "flex-1" : ""}`}>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{plant.plant_name}</h3>
                <p className="text-sm text-gray-500 italic">{plant.scientific_name}</p>
                <p className="text-sm text-gray-600">
                  Identified on {format(new Date(plant.created_at), "MMM d, yyyy")}
                </p>
                {plant.uses && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Common Uses:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {plant.uses.split(", ").slice(0, 3).map((use, index) => (
                        <li key={index}>{use}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlants.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No plant identifications found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}