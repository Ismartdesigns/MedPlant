"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Leaf, Camera, Brain, Users, ArrowRight, Sparkles, Search, Database } from "lucide-react"
import Link from "next/link"
import Head from "next/head"
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'

function PlantModel() {
  const { scene } = useGLTF('/An_animated_yoruba_pl_0527073105_texture.glb')
  return <primitive object={scene} />
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Add model-viewer script */}
      <Head>
        <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js" />
      </Head>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-emerald-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center transform rotate-12">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">MedPlant</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-emerald-600">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Advanced CSS */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered Plant Identification
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Identify Plants with
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    {" "}
                    AI Precision
                  </span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Discover, learn, and explore the botanical world with our advanced AI plant identification system.
                  Simply snap a photo and unlock nature's secrets.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3">
                    Start Identifying
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-8 py-3"
                >
                  Watch Demo
                </Button>
              </div>
            </div>

            {/* Hero Image with Modern Effects */}
            <div className="relative">
              <div className="w-full h-96 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-emerald-100 to-teal-100 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-grid-emerald-100 animate-grid-fade"></div>
                </div>
                
                {/* Main Image */}
                <div className="relative h-full w-full">
                  <img
                    src="/placeholder.jpg"
                    alt="Medicinal Plant"
                    style={{ width: '100%', height: '100%' }}
                    className="object-cover transform hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </div>

                {/* Floating Elements */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg transform hover:scale-105 transition-transform">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">AI Scanning</span>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-emerald-600 text-white rounded-xl p-3 shadow-lg transform hover:scale-105 transition-transform">
                  <div className="text-sm font-medium">99% Match</div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-200 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-200 rounded-full blur-3xl opacity-60 animate-pulse delay-300"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with 3D Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced AI technology meets intuitive design for the ultimate plant identification experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: "Instant Recognition",
                description: "Snap a photo and get instant plant identification with 99% accuracy",
                color: "emerald",
              },
              {
                icon: Database,
                title: "Vast Database",
                description: "Access information on over 10,000 plant species worldwide",
                color: "teal",
              },
              {
                icon: Brain,
                title: "AI Learning",
                description: "Our AI continuously learns and improves identification accuracy",
                color: "green",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-4 hover:rotateY-5 border-0 bg-white/80 backdrop-blur-sm overflow-hidden perspective-1000"
              >
                <CardContent className="p-0">
                  {/* 3D Header */}
                  <div className="h-48 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
                    <div className="absolute inset-0 perspective-1000">
                      <div className="absolute inset-0 transform-gpu preserve-3d">
                        {/* Background Layers */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full opacity-30 blur-xl animate-pulse-slow"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-emerald-300 to-teal-300 rounded-full opacity-40 blur-lg animate-pulse-slow"></div>

                        {/* Main Icon */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center transform rotateY-12 rotateX-12 group-hover:scale-110 group-hover:rotateY-45 transition-all duration-500">
                          <feature.icon className="w-8 h-8 text-emerald-600" />
                        </div>

                        {/* Orbiting Dots */}
                        <div className="absolute top-1/2 left-1/2 w-24 h-24 transform -translate-x-1/2 -translate-y-1/2 animate-orbit-slow">
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full"></div>
                        </div>
                        <div className="absolute top-1/2 left-1/2 w-32 h-32 transform -translate-x-1/2 -translate-y-1/2 animate-orbit-reverse-slow">
                          <div className="absolute bottom-0 right-0 w-2 h-2 bg-teal-400 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 text-center space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to unlock the secrets of any plant
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Capture",
                description: "Take a clear photo of the plant you want to identify",
                icon: Camera,
              },
              {
                step: "02",
                title: "Analyze",
                description: "Our AI processes the image using advanced machine learning",
                icon: Search,
              },
              {
                step: "03",
                title: "Discover",
                description: "Get detailed information about the plant species and care tips",
                icon: Leaf,
              },
            ].map((step, index) => (
              <div key={index} className="relative text-center group">
                <div className="relative z-10 space-y-6">
                  {/* Step Number */}
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg transform group-hover:scale-110 group-hover:rotateY-12 transition-all duration-500 shadow-2xl perspective-1000">
                    <span className="transform group-hover:rotateY-12">{step.step}</span>
                  </div>

                  {/* 3D Icon Container */}
                  <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 perspective-1000">
                    <div className="w-full h-full preserve-3d flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center transform rotateY-12 rotateX-12 group-hover:scale-110 group-hover:rotateY-45 transition-all duration-500">
                        <step.icon className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>

                {/* Connection Line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-emerald-200 to-teal-200 transform translate-x-4">
                    <div className="absolute top-1/2 left-0 w-2 h-2 bg-emerald-400 rounded-full transform -translate-y-1/2 animate-pulse"></div>
                    <div className="absolute top-1/2 right-0 w-2 h-2 bg-teal-400 rounded-full transform -translate-y-1/2 animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900">About MedPlant</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                MedPlant combines cutting-edge artificial intelligence with botanical expertise to create the most
                accurate plant identification system available. Our mission is to make plant knowledge accessible to
                everyone, from curious beginners to professional botanists.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-white/60 rounded-2xl backdrop-blur-sm transform hover:scale-105 hover:rotateY-5 transition-all duration-300 perspective-1000">
                  <div className="text-3xl font-bold text-emerald-600">99%</div>
                  <div className="text-sm text-gray-600">Accuracy Rate</div>
                </div>
                <div className="text-center p-4 bg-white/60 rounded-2xl backdrop-blur-sm transform hover:scale-105 hover:rotateY-minus-5 transition-all duration-300 perspective-1000">
                  <div className="text-3xl font-bold text-teal-600">10K+</div>
                  <div className="text-sm text-gray-600">Plant Species</div>
                </div>
              </div>
            </div>

            {/* 3D Community Visualization */}
            <div className="relative">
              <div className="w-full h-80 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-emerald-100 to-teal-100 perspective-1000">
                <div className="w-full h-full preserve-3d flex items-center justify-center">
                  <div className="relative preserve-3d">
                    {/* Background Elements */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-2xl animate-pulse-slow"></div>

                    {/* Main Content */}
                    <div className="text-center space-y-4 transform rotateY-6 rotateX-6">
                      <div className="w-20 h-20 mx-auto bg-white rounded-full shadow-2xl flex items-center justify-center transform hover:scale-110 hover:rotateY-12 transition-all duration-500">
                        <Users className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Join Our Community</h3>
                      <p className="text-gray-600 px-8">Connect with plant enthusiasts worldwide</p>
                    </div>

                    {/* Floating User Icons */}
                    <div className="absolute top-0 left-0 w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center animate-float-particle">
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="absolute top-4 right-0 w-6 h-6 bg-teal-200 rounded-full flex items-center justify-center animate-float-particle-delayed">
                      <Users className="w-3 h-3 text-teal-600" />
                    </div>
                    <div className="absolute bottom-0 left-4 w-7 h-7 bg-emerald-300 rounded-full flex items-center justify-center animate-float-particle-slow">
                      <Users className="w-3 h-3 text-emerald-700" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Stats */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg transform hover:scale-105 transition-transform">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">50K+</div>
                    <div className="text-xs text-gray-600">Active Users</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-600 to-teal-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl animate-float-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-float-slow-delayed"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse-slow"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <h2 className="text-4xl font-bold text-white">Ready to Explore Nature?</h2>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
            Join thousands of plant enthusiasts who trust MedPlant for accurate plant identification
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-emerald-600 hover:bg-gray-50 px-8 py-3 transform hover:scale-105 transition-all duration-300"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8 py-3 transform hover:scale-105 transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center transform rotate-12">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">MedPlant</span>
              </div>
              <p className="text-gray-400">AI-powered plant identification for everyone</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">Features</li>
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">Pricing</li>
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">API</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">About</li>
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">Blog</li>
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">Careers</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">Help Center</li>
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">Contact</li>
                <li className="hover:text-emerald-400 transition-colors cursor-pointer">Privacy</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MedPlant. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
