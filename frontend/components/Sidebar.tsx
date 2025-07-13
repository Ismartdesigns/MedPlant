"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, Star } from "lucide-react"
import { PlantOfTheDay } from "./PlantOfTheDay"
import { ActivityFeed } from "./ActivityFeed"

export function Sidebar() {
  return (
    <div className="space-y-6">
      <PlantOfTheDay />
      <ActivityFeed />
    </div>
  )
}