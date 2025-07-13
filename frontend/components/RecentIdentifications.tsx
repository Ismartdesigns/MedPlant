"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Leaf,
  Search,
  History,
  MapPin,
  Heart,
  Share2,
  MoreHorizontal,
  Filter,
  Eye,
  Trash2,
  AlertCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PlantIdentification {
  id: number
  plant_name: string
  common_name: string
  confidence_score: number
  created_at: string
  location: string
  is_favorite: boolean
  image_url: string
  scientific_name: string
  local_names?: string
  parts_used?: string
  uses?: string
  benefits?: string
  side_effects?: string
}

export function RecentIdentifications() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [identifications, setIdentifications] = useState<PlantIdentification[]>([])
  const [selectedPlant, setSelectedPlant] = useState<PlantIdentification | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [plantDetails, setPlantDetails] = useState<any>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'confidence'>('date')
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/user/identifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to delete identification')
      setIdentifications(prev => prev.filter(item => item.id !== id))
      toast({
        title: "Success",
        description: "Plant identification deleted successfully",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to delete plant identification",
        variant: "destructive",
      })
    }
  }

  const handleView = async (plant: PlantIdentification) => {
    setSelectedPlant(plant)
    try {
      const response = await fetch(`/api/plants/${plant.scientific_name}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const details = await response.json()
        setPlantDetails(details)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to fetch plant details",
        variant: "destructive",
      })
    }
    setIsModalOpen(true)
  }

  const handleFavorite = async (id: number) => {
    try {
      const response = await fetch(`/api/user/identifications/${id}/favorite`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to update favorite status')
      const data = await response.json()
      
      setIdentifications(prev =>
        prev.map(item =>
          item.id === id ? { ...item, is_favorite: data.is_favorite } : item
        )
      )
      
      toast({
        title: "Success",
        description: data.is_favorite ? "Plant added to favorites" : "Plant removed from favorites",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const fetchIdentifications = async () => {
      try {
        const response = await fetch('/api/user/identifications', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) throw new Error('Failed to fetch identifications')
        const data = await response.json()
        setIdentifications(data)
      } catch (error) {
        console.error(error)
        toast({
          title: "Error",
          description: "Failed to fetch plant identifications",
          variant: "destructive",
        })
      }
    }
    fetchIdentifications()
  }, [])

  const filteredIdentifications = identifications
    .filter(plant => {
      const matchesSearch = searchQuery === "" || [
        plant.plant_name,
        plant.common_name,
        plant.scientific_name,
        plant.local_names,
        plant.location,
        plant.uses,
      ].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesFavorite = !showFavoritesOnly || plant.is_favorite

      const matchesConfidence = confidenceFilter === 'all' ||
        (confidenceFilter === 'high' && plant.confidence_score >= 0.9) ||
        (confidenceFilter === 'medium' && plant.confidence_score >= 0.7 && plant.confidence_score < 0.9) ||
        (confidenceFilter === 'low' && plant.confidence_score < 0.7)

      return matchesSearch && matchesFavorite && matchesConfidence
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else {
        return b.confidence_score - a.confidence_score
      }
    })

  return (
    <>
      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Recent Identifications</CardTitle>
            <CardDescription>Your latest plant discoveries</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showFavoritesOnly ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={showFavoritesOnly ? "bg-rose-500 hover:bg-rose-600" : ""}
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? "fill-white" : ""}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={confidenceFilter !== 'all' ? "default" : "ghost"}
                  size="sm"
                  className={confidenceFilter !== 'all' ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setConfidenceFilter('all')}>
                  All Confidence Levels
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfidenceFilter('high')}>
                  High Confidence (90%+)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfidenceFilter('medium')}>
                  Medium Confidence (70-89%)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfidenceFilter('low')}>
                  Low Confidence (70%)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, location, or uses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-4">
            {filteredIdentifications.map((plant) => (
              <div
                key={plant.id}
                className="flex items-center space-x-4 p-4 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 transition-colors group"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-emerald-100 flex-shrink-0 transform group-hover:scale-105 transition-transform">
                  {plant.image_url ? (
                    <img
                      src={plant.image_url}
                      alt={plant.plant_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-200 flex items-center justify-center perspective-1000">
                      <div className="w-8 h-8 transform rotateY-12 rotateX-12">
                        <Leaf className="w-8 h-8 text-emerald-600" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{plant.plant_name}</h3>
                    {plant.is_favorite && <Heart className="w-4 h-4 text-rose-500 fill-current" />}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{plant.common_name}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {plant.location}
                    </span>
                    <span>{new Date(plant.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    className={`${plant.confidence_score >= 0.95 ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}
                  >
                    {Math.round(plant.confidence_score * 100)}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="transition-colors"
                    onClick={() => handleFavorite(plant.id)}
                  >
                    <Heart
                      className={`w-4 h-4 ${plant.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500 hover:text-rose-500'}`}
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(plant)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(plant.id)}>
                        <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {filteredIdentifications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery
                  ? "No identifications found matching your search"
                  : showFavoritesOnly
                  ? "No favorite identifications yet"
                  : "No recent identifications"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedPlant?.plant_name}</DialogTitle>
            <DialogDescription className="text-gray-600 italic">
              {selectedPlant?.scientific_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <img
                src={selectedPlant?.image_url}
                alt={selectedPlant?.plant_name}
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="bg-emerald-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Identification Details</h3>
                <p className="text-sm text-gray-600">Confidence Score: {selectedPlant && Math.round(selectedPlant.confidence_score * 100)}%</p>
                <p className="text-sm text-gray-600">Identified on: {selectedPlant && new Date(selectedPlant.created_at).toLocaleDateString()}</p>
                {selectedPlant?.local_names && (
                  <p className="text-sm text-gray-600">Local Names: {selectedPlant.local_names}</p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {selectedPlant?.parts_used && (
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    Parts Used
                  </h3>
                  <p className="text-sm text-gray-600">{selectedPlant.parts_used}</p>
                </div>
              )}
              {selectedPlant?.uses && (
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    Medicinal Uses
                  </h3>
                  <p className="text-sm text-gray-600">{selectedPlant.uses}</p>
                </div>
              )}
              {selectedPlant?.benefits && (
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-600" />
                    Benefits
                  </h3>
                  <p className="text-sm text-gray-600">{selectedPlant.benefits}</p>
                </div>
              )}
              {selectedPlant?.side_effects && (
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Side Effects
                  </h3>
                  <p className="text-sm text-gray-600">{selectedPlant.side_effects}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}