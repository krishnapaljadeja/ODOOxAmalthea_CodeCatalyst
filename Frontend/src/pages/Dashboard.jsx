import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Users, Clock, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import apiClient from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import { Skeleton } from '../components/ui/skeleton'

/**
 * Dashboard page component
 */
export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back!</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Employees',
      value: stats?.totalEmployees || 0,
      icon: Users,
      description: 'Active employees',
      trend: '+12%',
    },
    {
      title: 'Present Today',
      value: stats?.presentToday || 0,
      icon: Clock,
      description: 'Employees at work',
      trend: '+5%',
    },
    {
      title: 'Pending Leaves',
      value: stats?.pendingLeaves || 0,
      icon: Calendar,
      description: 'Awaiting approval',
      trend: '-3%',
    },
    {
      title: 'Last Payrun',
      value: stats?.lastPayrunAmount
        ? formatCurrency(stats.lastPayrunAmount)
        : '-',
      icon: DollarSign,
      description: stats?.lastPayrunDate
        ? formatDate(stats.lastPayrunDate)
        : 'No payrun yet',
      trend: '+8%',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {stat.trend} from last month
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Additional dashboard content can be added here */}
    </div>
  )
}

