"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface PlantOfTheDay {
  name: string
  scientific_name: string
  image_url: string
  description: string
}

export function PlantOfTheDay() {
  const [plantOfTheDay, setPlantOfTheDay] = useState<PlantOfTheDay | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlantOfTheDay = async () => {
      try {
        const response = await fetch('/api/user/plant_of_the_day', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.detail || 'Failed to fetch plant of the day')
        }
        const data = await response.json()
        setPlantOfTheDay(data)
        setError(null)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
        console.error(error)
      }
    }
    fetchPlantOfTheDay()
  }, [])

  if (error) {
    return (
      <Card className="border-0 bg-gradient-to-br from-teal-500 to-emerald-600 text-white overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Plant of the Day</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-teal-500 to-emerald-600 text-white overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="w-5 h-5" />
          <span>Plant of the Day</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {plantOfTheDay ? (
          <>
            <div className="w-full h-48 relative rounded-xl overflow-hidden">
              <Image
                src={plantOfTheDay.image_url}
                alt={plantOfTheDay.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{plantOfTheDay.name}</h3>
              <p className="text-sm text-teal-100 italic">{plantOfTheDay.scientific_name}</p>
              <p className="text-sm text-teal-100 mt-2">{plantOfTheDay.description}</p>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Leaf className="w-8 h-8 mx-auto mb-4 animate-pulse" />
            <p>Loading your plant of the day...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
