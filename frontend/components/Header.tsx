"use client"

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
import { Leaf, Bell, Settings, LogOut } from "lucide-react"

interface HeaderProps {
  userData: { first_name: string; email: string } | null;
  onLogout: () => void;
}

export function Header({ userData, onLogout }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center transform rotate-12">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">MedPlant</span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Pro</Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full"></span>
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-5 h-5 text-gray-600" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">{userData ? userData.first_name.charAt(0) : 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData ? userData.first_name : 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userData ? userData.email : 'user@example.com'}
                    </p>
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