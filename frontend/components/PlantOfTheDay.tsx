"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PlantOfTheDay() {
  const [plantOfTheDay, setPlantOfTheDay] = useState<any>(null) // Adjust type as needed

  useEffect(() => {
    const fetchPlantOfTheDay = async () => {
      try {
        const response = await fetch('/api/user/plant_of_the_day', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Failed to fetch plant of the day')
        }
        const data = await response.json()
        setPlantOfTheDay(data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchPlantOfTheDay()
  }, [])

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
            <div className="w-full h-32 bg-white/20 rounded-xl overflow-hidden perspective-1000">
              <div className="w-full h-full flex items-center justify-center transform rotateY-6 rotateX-6">
                <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                  <Leaf className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold">{plantOfTheDay.name}</h3>
              <p className="text-sm text-teal-100">{plantOfTheDay.description}</p>
            </div>
            <Button variant="secondary" size="sm" className="w-full">
              Learn More
            </Button>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </CardContent>
    </Card>
  )
}
