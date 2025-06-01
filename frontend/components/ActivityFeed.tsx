"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react" // Assuming you have an icon for activity

interface UserActivity {
  id: number
  description: string
  timestamp: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<UserActivity[]>([])

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/user/activity_feed', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Failed to fetch activities')
        }
        const data = await response.json()
        setActivities(data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchActivities()
  }, [])

  return (
    <Card className="border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Activity Feed</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length > 0 ? (
          activities.map(activity => (
            <div key={activity.id} className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">{activity.description}</span>
            </div>
          ))
        ) : (
          <p>No recent activities.</p>
        )}
      </CardContent>
    </Card>
  )
}
