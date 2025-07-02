"use client"

import { useState, useEffect, useMemo } from "react"
import { NigerianPlantFilters } from "./plant-filters"
import { NigerianPlantGrid } from "./plant-grid"
import { NigerianPlantDetails } from "./plant-details"
import { useToast } from "@/hooks/use-toast"

export interface NigerianPlant {
  id: number
  plantName: string
  scientificName: string
  localNames: string
  category: string
  difficulty: string
  popularity: number
  imageUrl: string
  partsUsed: string
  locationFound: string
  dateCollected: string
  uses: string
  benefits: string
  sideEffects: string
  deviceUsed?: string
}

export function NigerianPlantBrowser() {
  const [plants, setPlants] = useState<NigerianPlant[]>([])
  const [selectedPlant, setSelectedPlant] = useState<NigerianPlant | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPlants = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/plants', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Failed to fetch plants')
        }
        const data = await response.json()
        setPlants(data)
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message,
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlants()
  }, [toast])

  // Get unique categories from plants
  const getPlantCategories = () => {
    const categories = Array.from(new Set(plants.map(plant => plant.category)))
    return ["all", ...categories]
  }

  // Filter and sort plants
  const filteredPlants = useMemo(() => {
    const filtered = plants.filter((plant) => {
      const matchesSearch =
        plant.plantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.localNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.benefits.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.uses.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === "all" || plant.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === "all" || plant.difficulty === selectedDifficulty

      return matchesSearch && matchesCategory && matchesDifficulty
    })

    // Sort plants
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.plantName.localeCompare(b.plantName)
        case "popularity":
          return b.popularity - a.popularity
        case "difficulty":
          const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 }
          return (
            difficultyOrder[a.difficulty as keyof typeof difficultyOrder] -
            difficultyOrder[b.difficulty as keyof typeof difficultyOrder]
          )
        default:
          return 0
      }
    })

    return filtered
  }, [plants, searchQuery, selectedCategory, selectedDifficulty, sortBy])

  if (isLoading) {
    return <div>Loading plants...</div>
  }

  return (
    <div className="space-y-6">
      <NigerianPlantFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedDifficulty={selectedDifficulty}
        onDifficultyChange={setSelectedDifficulty}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalResults={filteredPlants.length}
        categories={getPlantCategories()}
      />

      <NigerianPlantGrid plants={filteredPlants} viewMode={viewMode} onPlantSelect={setSelectedPlant} />

      {selectedPlant && <NigerianPlantDetails plant={selectedPlant} onClose={() => setSelectedPlant(null)} />}
    </div>
  )
}