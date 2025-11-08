import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { useAuthStore } from '../store/auth'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/attendance', label: 'Attendance', icon: Clock },
  { path: '/leaves', label: 'Time Off', icon: Calendar },
  { path: '/payroll', label: 'Payroll', icon: DollarSign },
  { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'hr'] },
  { path: '/settings', label: 'Settings', icon: Settings },
]

/**
 * LeftNav component - Sidebar navigation
 */
export default function LeftNav() {
  const location = useLocation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user } = useAuthStore()

  const NavContent = () => {
    // Filter nav items based on user role
    const filteredItems = navItems.filter((item) => {
      if (item.roles && user?.role) {
        return item.roles.includes(user.role)
      }
      return true
    })

    return (
      <nav className="flex flex-col space-y-1 p-4">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-card border-r shadow-lg">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">WorkZen HRMS</h2>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">WorkZen HRMS</h2>
        </div>
        <NavContent />
      </aside>
    </>
  )
}

