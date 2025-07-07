"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/plants/Header"
import { NigerianPlantBrowser } from "@/components/plants/plant-browser"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/Spinner"

interface UserData {
  first_name: string
  last_name: string
  email: string
}

export default function PlantsPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Logout failed')
      }
      router.push('/login')
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message,
      })
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }
        const data = await response.json()
        console.log("Fetched User Data:", data)
        setUserData(data)
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message,
        })
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    fetchUserData()
  }, [router, toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Header 
  userData={userData} 
  onLogout={handleLogout} 
  isLoading={isLoading} 
  variant="plants" 
  showBackButton={true} 
/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLoading ? <Spinner /> : "Browse Plants"}
          </h1>
          <p className="text-gray-600">Explore our comprehensive database of medicinal plant species</p>
        </div>
        <NigerianPlantBrowser />
      </div>
    </div>
  )
}