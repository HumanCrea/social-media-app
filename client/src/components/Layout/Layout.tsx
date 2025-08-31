import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import RightSidebar from './RightSidebar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto flex">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-64 xl:w-72 fixed h-screen">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-64 xl:ml-72 lg:mr-80 xl:mr-96">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
        
        {/* Right Sidebar */}
        <div className="hidden lg:block w-80 xl:w-96 fixed right-0 h-screen">
          <RightSidebar />
        </div>
      </div>
    </div>
  )
}