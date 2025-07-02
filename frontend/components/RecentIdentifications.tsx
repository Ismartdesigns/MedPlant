"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Leaf,
  Search,
  History,
  MapPin,
  Heart,
  Share2,
  MoreHorizontal,
  Filter,
} from "lucide-react"

interface PlantIdentification {
  id: number
  name: string
  commonName: string
  confidence: number
  date: string
  location: string
  isFavorite: boolean
}

export function RecentIdentifications() {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [identifications, setIdentifications] = useState<PlantIdentification[]>([])

  useEffect(() => {
    const fetchIdentifications = async () => {
      try {
        const response = await fetch('/api/user/identifications', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Failed to fetch identifications')
        }
        const data = await response.json()
        setIdentifications(data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchIdentifications()
  }, [])

  return (
    <Card className="border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold text-gray-900">Recent Identifications</CardTitle>
          <CardDescription>Your latest plant discoveries</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <History className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search your identifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-4">
          {identifications.map((plant) => (
            <div
              key={plant.id}
              className="flex items-center space-x-4 p-4 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 transition-colors group"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-emerald-100 flex-shrink-0 transform group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-emerald-200 flex items-center justify-center perspective-1000">
                  <div className="w-8 h-8 transform rotateY-12 rotateX-12">
                    <Leaf className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{plant.name}</h3>
                  {plant.isFavorite && <Heart className="w-4 h-4 text-rose-500 fill-current" />}
                </div>
                <p className="text-sm text-gray-600 mb-1">{plant.commonName}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {plant.location}
                  </span>
                  <span>{plant.date}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge
                  variant="secondary"
                  className={`${plant.confidence >= 95 ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}
                >
                  {plant.confidence}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}