"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf } from "lucide-react"

export function ProgressCard() {
  const [progress, setProgress] = useState<{ plants_identified: number; saved_plants: number } | null>(null)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/user/progress', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Failed to fetch progress')
        }
        const data = await response.json()
        setProgress(data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchProgress()
  }, [])

  return (
    <Card className="border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Leaf className="w-5 h-5" />
          <span>User Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress ? (
          <div>
            <p>Plants Identified: {progress.plants_identified}</p>
            <p>Saved Plants: {progress.saved_plants}</p>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </CardContent>
    </Card>
  )
}
