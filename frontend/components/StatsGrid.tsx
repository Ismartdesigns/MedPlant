"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Leaf, TrendingUp, Heart, Calendar, LucideIcon } from "lucide-react"

interface StatItem {
  label: string
  value: string
  icon: LucideIcon
  color: string
}

export function StatsGrid() {
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Plants Identified", value: "0", icon: Leaf, color: "emerald" },
    { label: "Accuracy Rate", value: "0%", icon: TrendingUp, color: "teal" },
    { label: "Favorites", value: "0", icon: Heart, color: "rose" },
    { label: "This Month", value: "0", icon: Calendar, color: "blue" },
  ])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/user/stats', {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
        })
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setStats([
          { label: "Plants Identified", value: data.plants_identified.toString(), icon: Leaf, color: "emerald" },
          { label: "Accuracy Rate", value: data.accuracyRate, icon: TrendingUp, color: "teal" },
          { label: "Favorites", value: data.saved_plants.toString(), icon: Heart, color: "rose" },
          { label: "This Month", value: data.thisMonth.toString(), icon: Calendar, color: "blue" },
        ])
      } catch (error) {
        console.error(error)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="border-0 bg-white/80 backdrop-blur-sm transform hover:scale-105 transition-transform duration-300"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center transform rotateY-6 rotateX-6">
                <stat.icon className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}