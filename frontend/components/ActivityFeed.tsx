"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

interface UserActivity {
  id: number
  action: string
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className="border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Activity Feed</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length > 0 ? (
          activities.map(activity => (
            <div key={activity.id} className="flex items-start space-x-3 text-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 animate-pulse"></div>
              <div className="flex-1">
                <p className="text-gray-700">{activity.action}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>No recent activities.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
