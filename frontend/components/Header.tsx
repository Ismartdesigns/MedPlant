"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Leaf, Bell, Settings, LogOut, ArrowLeft, Zap } from "lucide-react"
import { Spinner } from "@/components/Spinner"
import Link from "next/link"

interface HeaderProps {
  userData: { first_name: string; last_name: string; email: string } | null
  onLogout: () => void
  isLoading: boolean
  showBackButton?: boolean
  backUrl?: string
  pageBadge?: {
    icon: typeof Leaf | typeof Zap
    text: string
  }
}

export function Header({ 
  userData, 
  onLogout, 
  isLoading,
  showBackButton = false,
  backUrl = "/dashboard",
  pageBadge
}: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link 
                href={backUrl} 
                className="flex items-center text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center transform rotate-12">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">MedPlant</span>
            </div>
            {pageBadge && (
              <Badge className="bg-emerald-100 text-emerald-700">
                {React.createElement(pageBadge.icon, { className: "w-3 h-3 mr-1" })}
                {pageBadge.text}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-4">
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {userData ? userData.first_name.charAt(0) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    {isLoading ? (
                      <Spinner />
                    ) : (
                      <>
                        <p className="text-sm font-medium leading-none">
                          {userData ? `${userData.first_name} ${userData.last_name}` : 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userData ? userData.email : 'user@example.com'}
                        </p>
                      </>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}