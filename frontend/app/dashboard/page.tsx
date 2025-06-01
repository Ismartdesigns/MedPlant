import { useEffect, useState } from "react"
import { Header } from "@/components/Header"
import { QuickActions } from "@/components/QuickActions"
import { StatsGrid } from "@/components/StatsGrid"
import { RecentIdentifications } from "@/components/RecentIdentifications"
import { Sidebar } from "@/components/Sidebar"
import { useRouter } from "next/router"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  first_name: string;
  email: string; // Add other properties as needed
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
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
      }
    }
    fetchUserData()
  }, [router, toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Header userData={userData} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {userData ? userData.first_name : 'User'}!</h1>
          <p className="text-gray-600">Ready to discover more plants today?</p>
        </div>

        <QuickActions />
        <StatsGrid />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Identifications */}
          <div className="lg:col-span-2">
            <RecentIdentifications />
          </div>

          <Sidebar />
        </div>
      </div>
    </div>
  )
}