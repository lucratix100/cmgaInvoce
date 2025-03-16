"use client"
import Header from "@/components/navbar/navbar"
import SideBar from "@/components/side-bar"


export default function DashboardLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <SideBar />
      {/* Main content */}
      <div className="flex-1">
        {/* Header */}
        <header className="border-b bg-white shadow-sm sticky top-0 z-40">
          <Header />
        </header>  
        <main className="p-4 md:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  )
} 