"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Check, Clock, Truck } from "lucide-react"
import {
  BarChart3, FileText, PieChart as PieChartIcon, CircleDollarSign, Users,
  CreditCard, DollarSign, Banknote, HelpCircle
} from "lucide-react"
import RecentActivities from "@/components/recent-activities"
import { useEffect, useState } from "react"
import { getDashboardStats, DashboardStats, getAdvancedStats, AdvancedStats } from "@/actions/dashboard-stats"
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts"
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'


// Statistiques globales
// const statistiques = {
//   factures: { total: 1248, pourcentage: 5.2, tendance: "hausse" },
//   livraisons: { total: 892, pourcentage: 12.4, tendance: "hausse" },
//   revenus: { total: "45,782,500", pourcentage: 8.7, tendance: "hausse" },
//   depots: { total: 4, pourcentage: 0, tendance: "stable" },
//   conducteurs: { total: 12, pourcentage: 20, tendance: "hausse" },
//   utilisateurs: { total: 24, pourcentage: 4.5, tendance: "hausse" },
// }

// Ajouter cette interface pour typer les props
interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  trend: "up" | "down" | "stable";
  color?: "primary" | "green" | "amber" | "blue" | "purple" | "rose";
}

const PAYMENT_MODE_COLORS: Record<string, string> = {
  'Espece': '#FFBB28',
  'Cheque': '#A020F0',
  'Virement': '#0088FE',
  'Mobile Money': '#00C49F',
  'Retour': '#FF8042',
  'OD': '#8884d8',
}
const PAYMENT_MODE_ICONS: Record<string, any> = {
  'Espece': DollarSign,
  'Cheque': CircleDollarSign,
  'Virement': Banknote,
  'Mobile Money': CreditCard,
  'Retour': HelpCircle,
  'OD': HelpCircle,
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly')
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [tempStartDate, setTempStartDate] = useState<string>("")
  const [tempEndDate, setTempEndDate] = useState<string>("")
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null)

  useEffect(() => {
    const periodParam = searchParams.get('period')
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    if (periodParam) setPeriod(periodParam as any)
    if (startParam) setStartDate(startParam)
    if (endParam) setEndDate(endParam)
  }, [])

  const updateSearchParams = (newPeriod: string, newStart: string, newEnd: string) => {
    const params = new URLSearchParams()
    if (newPeriod) params.set('period', newPeriod)
    if (newStart) params.set('start', newStart)
    if (newEnd) params.set('end', newEnd)
    router.replace(`?${params.toString()}`)
  }

  // Fonction pour obtenir les dates automatiques selon la période
  const getAutoDates = (selectedPeriod: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date()

    switch (selectedPeriod) {
      case 'daily':
        const today = now.toISOString().split('T')[0]
        return { start: today, end: today }
      case 'weekly':
        const startOfWeek = new Date(now)
        const dayOfWeek = now.getDay()
        // En France, la semaine commence le lundi (1), pas le dimanche (0)
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startOfWeek.setDate(now.getDate() - daysToSubtract)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // +6 jours = dimanche
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        }
      case 'monthly':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        }
      default:
        return { start: "", end: "" }
    }
  }

  useEffect(() => {
    // Annuler le timer précédent s'il existe
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Créer un nouveau timer pour retarder l'exécution
    const timer = setTimeout(() => {
      setLoading(true)

      let finalStartDate = startDate
      let finalEndDate = endDate

      // Si ce n'est pas personnalisé, utiliser les dates automatiques
      if (period !== 'custom') {
        const autoDates = getAutoDates(period)
        finalStartDate = autoDates.start
        finalEndDate = autoDates.end
      } else {
        // Validation des dates pour le mode personnalisé
        if (startDate && !endDate) {
          finalEndDate = startDate
        }
        if (endDate && !startDate) {
          finalStartDate = endDate
        }
      }

      getDashboardStats(period === 'custom' ? 'monthly' : period, finalStartDate, finalEndDate)
        .then((data) => {
          setStats(data)
          setError(null)
        })
        .catch((err) => {
          setError("Impossible de charger les statistiques")
        })
        .finally(() => setLoading(false))
      // Appel dynamique pour les widgets avancés
      getAdvancedStats(period === 'custom' ? 'monthly' : period, finalStartDate, finalEndDate)
        .then(setAdvancedStats)
    }, period === 'custom' ? 1000 : 300)

    setDebounceTimer(timer)

    // Cleanup function
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [period, startDate, endDate])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <Image
            src="/logo.png"
            alt="CMGA Logo"
            width={80}
            height={80}
            className="animate-pulse"
            style={{
              animationDuration: '1.5s',
              transform: 'scale(1)',
              transition: 'transform 0.3s ease-in-out'
            }}
          />
        </div>
        <div className="text-lg font-medium text-gray-600 animate-pulse">Chargement des statistiques...</div>
        <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ animationDuration: '1s' }}></div>
        </div>
      </div>
    )
  }
  if (error || !stats) {
    return <div className="text-center text-red-500 py-8">{error || "Erreur inconnue"}</div>
  }

  // Préparation des données pour le graphique
  let chartData = []
  if (period === 'monthly') {
    chartData = (stats.monthlyStats ?? []).map(m => ({ name: m.month, total: m.total }))
  } else if (period === 'weekly') {
    chartData = (stats.weeklyStats ?? []).map(w => ({ name: w.week, total: w.total }))
  } else {
    chartData = (stats.dailyStats ?? []).map(d => ({ name: d.date, total: d.total }))
  }

  console.log('paymentModes:', advancedStats?.paymentModes)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="font-medium">Période :</label>
        <select
          value={period}
          onChange={e => {
            const newPeriod = e.target.value
            setPeriod(newPeriod as any)
            updateSearchParams(newPeriod, startDate, endDate)
            if (newPeriod !== 'custom') {
              setStartDate("")
              setEndDate("")
              setTempStartDate("")
              setTempEndDate("")
            }
          }}
          className="border rounded px-2 py-1"
        >
          <option value="daily">Aujourd'hui</option>
          <option value="weekly">Cette semaine</option>
          <option value="monthly">Ce mois</option>
          <option value="custom">Personnalisé</option>
        </select>

        {period === 'custom' && (
          <>
            <label className="font-medium ml-4">Date de début :</label>
            <input
              type="date"
              value={tempStartDate}
              onChange={e => {
                setTempStartDate(e.target.value)
                updateSearchParams(period, e.target.value, tempEndDate)
              }}
              className="border rounded px-2 py-1"
            />
            <label className="font-medium ml-2">Date de fin :</label>
            <input
              type="date"
              value={tempEndDate}
              onChange={e => {
                setTempEndDate(e.target.value)
                updateSearchParams(period, tempStartDate, e.target.value)
              }}
              className="border rounded px-2 py-1"
            />
            <button
              className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => {
                setStartDate(tempStartDate)
                setEndDate(tempEndDate)
              }}
            >
              Appliquer
            </button>
            {(tempStartDate || tempEndDate) && (
              <button
                className="ml-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => {
                  setTempStartDate("")
                  setTempEndDate("")
                  setStartDate("")
                  setEndDate("")
                }}
              >
                Réinitialiser
              </button>
            )}
          </>
        )}
      </div>

      {/* Affichage du filtre actif */}
      {period !== 'custom' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          <strong>Période actuelle :</strong>
          {(() => {
            const autoDates = getAutoDates(period)
            const startDate = new Date(autoDates.start).toLocaleDateString('fr-FR')
            const endDate = new Date(autoDates.end).toLocaleDateString('fr-FR')

            if (period === 'daily') {
              return ` Aujourd'hui (${startDate})`
            } else if (period === 'weekly') {
              return ` Cette semaine (du ${startDate} au ${endDate})`
            } else {
              return ` Ce mois (du ${startDate} au ${endDate})`
            }
          })()}
        </div>
      )}

      {period === 'custom' && (tempStartDate || tempEndDate) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          <strong>Filtre personnalisé :</strong>
          {tempStartDate && tempEndDate ? ` Du ${new Date(tempStartDate).toLocaleDateString('fr-FR')} au ${new Date(tempEndDate).toLocaleDateString('fr-FR')}` :
            tempStartDate ? ` Le ${new Date(tempStartDate).toLocaleDateString('fr-FR')}` :
              ` Le ${new Date(tempEndDate).toLocaleDateString('fr-FR')}`}
          <span className="ml-2 text-blue-600">(Cliquez sur "Appliquer" pour valider)</span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-gradient-to-br from-primary-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2 ">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
              <div className="p-2 bg-primary-100 rounded-full text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {/* Pourcentage à calculer si besoin */}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures livrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.deliveredInvoices}</div>
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                <Check className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {/* Pourcentage à calculer si besoin */}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente de livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
              <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {/* Pourcentage à calculer si besoin */}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En cours de livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.inProgressInvoices}</div>
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {/* Pourcentage à calculer si besoin */}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures payées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.paidInvoices}</div>
              <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                <Check className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures impayées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.unpaidInvoices}</div>
              <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widgets avancés */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* Répartition des paiements par mode */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChartIcon className="w-6 h-6 text-blue-400" />
            <CardTitle>Répartition des paiements par mode</CardTitle>
          </CardHeader>
          <CardContent>
            {advancedStats && advancedStats.paymentModes.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={advancedStats.paymentModes}
                    dataKey="count"
                    nameKey="mode"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ mode, percent }) => `${mode ?? 'Inconnu'} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {advancedStats.paymentModes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PAYMENT_MODE_COLORS[entry.mode] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const { mode, count } = payload[0].payload
                    const Icon = PAYMENT_MODE_ICONS[mode] || HelpCircle
                    return (
                      <div className="p-2 bg-white rounded shadow text-xs flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{mode} : <b>{count}</b> paiement(s)</span>
                      </div>
                    )
                  }} />
                  <Legend formatter={(value) => value ?? 'Inconnu'} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <PieChartIcon className="w-12 h-12 text-blue-200 mb-2 animate-pulse" />
                <span className="text-gray-400 text-base font-medium">Aucune donnée</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Taux de paiement */}
        <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-green-400" />
            <CardTitle>Taux de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            {advancedStats && advancedStats.paymentRate.total > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Payées", value: advancedStats.paymentRate.paid },
                      { name: "Impayées", value: advancedStats.paymentRate.unpaid }
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    label
                  >
                    <Cell fill="#00C49F" />
                    <Cell fill="#FF8042" />
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const { name, value } = payload[0].payload
                    return (
                      <div className="p-2 bg-white rounded shadow text-xs">
                        <span>{name} : <b>{value}</b></span>
                      </div>
                    )
                  }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CircleDollarSign className="w-12 h-12 text-green-200 mb-2 animate-pulse" />
                <span className="text-gray-400 text-base font-medium">Aucune donnée</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 clients les plus actifs */}
        <Card className="bg-gradient-to-br from-purple-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <CardTitle>Top 5 clients les plus actifs</CardTitle>
          </CardHeader>
          <CardContent>
            {advancedStats && advancedStats.topCustomers.length > 0 ? (
              <ul className="space-y-2">
                {advancedStats.topCustomers.map((client, idx) => (
                  <li key={client.id} className="flex justify-between items-center">
                    <span className="font-medium">{idx + 1}. {client.name}</span>
                    <span className="text-sm text-gray-500">{client.total} factures</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="w-12 h-12 text-purple-200 mb-2 animate-pulse" />
                <span className="text-gray-400 text-base font-medium">Aucune donnée</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aperçu des revenus</CardTitle>
            <CardDescription>Évolution des factures traitées ({period === 'monthly' ? 'par mois' : period === 'weekly' ? 'par semaine' : 'par jour'})</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                Aucune donnée à afficher pour cette période.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <RecentActivities />
      </div>
    </div>
  )
}

// Utiliser l'interface dans la déclaration du composant
function StatCard({ title, value, percentage, trend, color = "primary" }: StatCardProps) {
  const getColorClass = (color: StatCardProps["color"]) => {
    const colorMap: Record<string, string> = {
      primary: "bg-primary-100 text-primary",
      green: "bg-green-100 text-green-600",
      amber: "bg-amber-100 text-amber-600",
      blue: "bg-blue-100 text-blue-600",
      purple: "bg-purple-100 text-purple-600",
      rose: "bg-rose-100 text-rose-600",
    }
    return color && colorMap[color] ? colorMap[color] : colorMap.primary
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${getColorClass(color)}`}>
            {/* Ici vous pouvez ajouter une icône selon le type de carte */}
          </div>
        </div>
        <div className="mt-4">
          <p className={`text-xs ${trend === "up" ? "text-green-500" : "text-rose-500"}`}>
            {percentage} par rapport au mois dernier
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

