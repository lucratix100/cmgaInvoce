"use client"

import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Minus,
  Phone,
  ShoppingCart,
  Store,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import { getCommercialTeamStats } from "@/actions/commercial-admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { activePageRefetchOptions, queryKeys } from "@/lib/query-keys"
import type { CommercialTeamStatsPeriod } from "@/types/commercial"

const PERIOD_OPTIONS: Array<{ value: CommercialTeamStatsPeriod; label: string }> = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "month", label: "Ce mois" },
  { value: "custom", label: "Personnalisé" },
]

const ACTION_CHART_CONFIG = {
  appele: { label: "Non commandé", color: "hsl(142 76% 36%)" },
  nonRepondu: { label: "Non répondu", color: "hsl(25 95% 53%)" },
  commande: { label: "Commande prise", color: "hsl(221 83% 53%)" },
  relance: { label: "À relancer", color: "hsl(45 93% 47%)" },
}

const TREND_CHART_CONFIG = {
  actions: { label: "Actions", color: "hsl(221 83% 53%)" },
  orders: { label: "Commandes", color: "hsl(142 76% 36%)" },
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value))
}

function formatPeriodLabel(period: CommercialTeamStatsPeriod, from: string, to: string) {
  if (period === "today") return "Aujourd'hui"
  if (period === "month") return "Ce mois"
  if (period === "custom" || from !== to) {
    return `Du ${formatShortDate(from)} au ${formatShortDate(to)}`
  }
  return formatShortDate(from)
}

function trendChartTitle(from: string, to: string) {
  const start = new Date(from)
  const end = new Date(to)
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (days <= 1) return "Évolution du jour"
  if (days <= 7) return `Évolution sur ${days} jours`
  return `Évolution du ${formatShortDate(from)} au ${formatShortDate(to)}`
}

interface CommercialDashboardClientProps {
  userName: string
}

export default function CommercialDashboardClient({ userName }: CommercialDashboardClientProps) {
  const [period, setPeriod] = useState<CommercialTeamStatsPeriod>("7d")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ from: string; to: string } | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)

  const statsParams = useMemo(() => {
    if (period === "custom" && appliedCustomRange) {
      return {
        period: "custom" as const,
        from: appliedCustomRange.from,
        to: appliedCustomRange.to,
      }
    }
    return { period }
  }, [period, appliedCustomRange])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.commercialTeamStats(
      statsParams.period,
      "from" in statsParams ? statsParams.from : undefined,
      "to" in statsParams ? statsParams.to : undefined
    ),
    queryFn: () => getCommercialTeamStats(statsParams),
    enabled: period !== "custom" || Boolean(appliedCustomRange),
    ...activePageRefetchOptions,
  })

  const handlePeriodChange = (nextPeriod: CommercialTeamStatsPeriod) => {
    setPeriod(nextPeriod)
    setRangeError(null)
    if (nextPeriod !== "custom") {
      setAppliedCustomRange(null)
    }
  }

  const handleApplyCustomRange = () => {
    if (!customFrom) {
      setRangeError("Choisissez au minimum une date de début.")
      return
    }

    const from = customFrom
    const to = customTo || customFrom

    if (to < from) {
      setRangeError("La date de fin doit être postérieure ou égale à la date de début.")
      return
    }

    setRangeError(null)
    setAppliedCustomRange({ from, to })
  }

  const handleResetCustomRange = () => {
    setCustomFrom("")
    setCustomTo("")
    setAppliedCustomRange(null)
    setRangeError(null)
    setPeriod("7d")
  }

  const actionChartData = useMemo(() => {
    if (!data) return []
    return [
      { key: "appele", value: data.periodStats.byAction.APPELE },
      { key: "nonRepondu", value: data.periodStats.byAction.NON_REPONDU },
      { key: "commande", value: data.periodStats.byAction.COMMANDE_PRISE },
      { key: "relance", value: data.periodStats.byAction.A_RELANCER },
    ].filter((item) => item.value > 0)
  }, [data])

  const trendChartData = useMemo(
    () =>
      (data?.dailyTrend || []).map((row) => ({
        ...row,
        label: formatShortDate(row.date),
      })),
    [data?.dailyTrend]
  )

  if (isLoading && !data) {
    if (period === "custom" && !appliedCustomRange) {
      return (
        <div className="space-y-6 p-4 md:p-6">
          <DashboardHeader
            userName={userName}
            period={period}
            onPeriodChange={handlePeriodChange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onApplyCustomRange={handleApplyCustomRange}
            onResetCustomRange={handleResetCustomRange}
            rangeError={rangeError}
            isFetching={false}
          />
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-muted-foreground">
            Sélectionnez une intervalle de dates puis cliquez sur <strong className="mx-1">Appliquer</strong>.
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm">Chargement du tableau de bord…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    if (period === "custom" && !appliedCustomRange) {
      return (
        <div className="space-y-6 p-4 md:p-6">
          <DashboardHeader
            userName={userName}
            period={period}
            onPeriodChange={handlePeriodChange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onApplyCustomRange={handleApplyCustomRange}
            onResetCustomRange={handleResetCustomRange}
            rangeError={rangeError}
            isFetching={false}
          />
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-muted-foreground">
            Sélectionnez une intervalle de dates puis cliquez sur <strong className="mx-1">Appliquer</strong>.
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        Impossible de charger les statistiques. Réessayez plus tard.
      </div>
    )
  }

  const trend = data.periodStats.monthlyTrend
  const TrendIcon = trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : Minus

  if (period === "custom" && !appliedCustomRange) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <DashboardHeader
          userName={userName}
          period={period}
          onPeriodChange={handlePeriodChange}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          onApplyCustomRange={handleApplyCustomRange}
          onResetCustomRange={handleResetCustomRange}
          rangeError={rangeError}
          isFetching={false}
        />
        <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-muted-foreground">
          Sélectionnez une intervalle de dates puis cliquez sur <strong className="mx-1">Appliquer</strong>.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardHeader
        userName={userName}
        period={period}
        onPeriodChange={handlePeriodChange}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onApplyCustomRange={handleApplyCustomRange}
        onResetCustomRange={handleResetCustomRange}
        rangeError={rangeError}
        isFetching={isFetching}
        activeRangeLabel={
          data.periodRange.from && data.periodRange.to
            ? formatPeriodLabel(data.period, data.periodRange.from, data.periodRange.to)
            : undefined
        }
      />

      {/* Tournée du jour */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  Tournée du jour
                </CardTitle>
                <CardDescription>Avancement des appels prévus aujourd&apos;hui</CardDescription>
              </div>
              <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                {data.todayTour.executionRate}% exécuté
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.todayTour.completed} / {data.todayTour.planned} clients traités
                </span>
                <span className="font-semibold text-blue-700">{data.todayTour.pending} en attente</span>
              </div>
              <Progress value={data.todayTour.executionRate} className="h-3 bg-blue-100" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MiniStat label="Prévus" value={data.todayTour.planned} tone="blue" />
              <MiniStat label="Traités" value={data.todayTour.completed} tone="green" />
              <MiniStat label="En attente" value={data.todayTour.pending} tone="amber" />
              <MiniStat label="Relances dues" value={data.todayTour.followUpsDue} tone="orange" />
              <MiniStat label="Relances retard" value={data.todayTour.followUpsOverdue} tone="orange" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance — {formatPeriodLabel(period, data.periodRange.from, data.periodRange.to)}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <KpiTile
              label="Actions"
              value={data.periodStats.total}
              icon={Phone}
              gradient="from-slate-50 to-white"
              iconColor="text-slate-600"
            />
            <KpiTile
              label="Commandes"
              value={data.periodStats.orders}
              icon={ShoppingCart}
              gradient="from-blue-50 to-white"
              iconColor="text-blue-600"
            />
            <KpiTile
              label="Taux réponse"
              value={`${data.periodStats.responseRate}%`}
              icon={TrendingUp}
              gradient="from-emerald-50 to-white"
              iconColor="text-emerald-600"
            />
            <KpiTile
              label="Clients touchés"
              value={data.periodStats.clientsTouched}
              icon={Target}
              gradient="from-violet-50 to-white"
              iconColor="text-violet-600"
            />
          </CardContent>
        </Card>
      </section>

      {/* KPIs période + tendance mensuelle */}
      <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Relances"
          value={data.periodStats.relances}
          subtitle="à suivre sur la période"
          icon={Clock3}
          accent="amber"
        />
        <MetricCard
          title="Articles commandés"
          value={data.periodStats.totalProducts}
          subtitle="quantités totales"
          icon={ShoppingCart}
          accent="blue"
        />
        <MetricCard
          title="Activité ce mois"
          value={trend.currentMonth}
          subtitle={`vs ${trend.previousMonth} le mois dernier`}
          icon={TrendingUp}
          accent="emerald"
          badge={
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.direction === "up" && "bg-emerald-100 text-emerald-700",
                trend.direction === "down" && "bg-red-100 text-red-700",
                trend.direction === "stable" && "bg-slate-100 text-slate-600"
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {trend.percent > 0 ? "+" : ""}
              {trend.percent}%
            </span>
          }
          badgeInline
        />
        <MetricCard
          title="Demandes BC"
          value={data.bcPipeline.pendingEditRequests}
          subtitle="modifications en attente"
          icon={ClipboardCheck}
          accent="rose"
          href="/commercial-dashboard/demandes-bl"
        />
      </section>

      {/* Graphiques */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-0 shadow-md xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {trendChartTitle(data.periodRange.from, data.periodRange.to)}
            </CardTitle>
            <CardDescription>Actions et commandes par jour sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={TREND_CHART_CONFIG} className="h-[260px] w-full">
              <AreaChart data={trendChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillActions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-actions)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-actions)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="actions"
                  stroke="var(--color-actions)"
                  fill="url(#fillActions)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-orders)"
                  fill="url(#fillOrders)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Répartition des actions</CardTitle>
            <CardDescription>Sur la période sélectionnée</CardDescription>
          </CardHeader>
          <CardContent>
            {actionChartData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Aucune action sur cette période
              </div>
            ) : (
              <ChartContainer config={ACTION_CHART_CONFIG} className="h-[200px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={actionChartData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {actionChartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={ACTION_CHART_CONFIG[entry.key as keyof typeof ACTION_CHART_CONFIG].color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(data.periodStats.byAction).map(([status, count]) => (
                <ActionLegend key={status} status={status} count={count} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Classement commerciaux */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Performance par commercial
          </CardTitle>
          <CardDescription>Comparaison sur la période et avancement de la tournée du jour</CardDescription>
        </CardHeader>
        <CardContent>
          {data.agentRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun commercial actif.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Commercial</th>
                    <th className="pb-3 pr-4 font-medium">Actions</th>
                    <th className="pb-3 pr-4 font-medium">Commandes</th>
                    <th className="pb-3 pr-4 font-medium">Relances</th>
                    <th className="pb-3 pr-4 font-medium">Taux réponse</th>
                    <th className="pb-3 font-medium">Tournée jour</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentRanking.map((agent, index) => (
                    <tr key={agent.agentId} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              index === 0 && "bg-amber-100 text-amber-700",
                              index === 1 && "bg-slate-200 text-slate-700",
                              index === 2 && "bg-orange-100 text-orange-700",
                              index > 2 && "bg-slate-100 text-slate-600"
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-900">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{agent.total}</td>
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-blue-700">{agent.orders}</span>
                      </td>
                      <td className="py-3 pr-4 text-amber-700">{agent.relances}</td>
                      <td className="py-3 pr-4">
                        <ResponseRateBadge rate={agent.responseRate} />
                      </td>
                      <td className="py-3">
                        {agent.todayPlanned > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{ width: `${agent.todayRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {agent.todayCompleted}/{agent.todayPlanned}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline BC */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pipeline bons de commande</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <PipelineCard label="En attente" value={data.bcPipeline.pendingEditRequests} tone="rose" />
          <PipelineCard label="Brouillon" value={data.bcPipeline.brouillon} tone="slate" />
          <PipelineCard label="Confirmés" value={data.bcPipeline.confirme} tone="blue" />
          <PipelineCard label="Modifications" value={data.bcPipeline.modificationDemandee} tone="amber" />
          <PipelineCard label="Validés admin" value={data.bcPipeline.valideAdmin} tone="emerald" />
          <PipelineCard label="Facturés" value={data.bcPipeline.facture} tone="green" />
          <PipelineCard label="Total BC" value={data.bcPipeline.total} tone="indigo" />
        </div>
      </section>

      {/* Portefeuille */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Portefeuille</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <PortfolioCard title="Commerciaux" value={data.portfolio.activeAgents} icon={Users} />
          <PortfolioCard title="Clients" value={data.portfolio.activeClients} icon={Store} />
          <PortfolioCard title="Locaux" value={data.portfolio.activeLocations} icon={MapPin} />
          <PortfolioCard title="Cibles" value={data.portfolio.activeAssignments} icon={Target} />
          <PortfolioCard title="Appels jour" value={data.portfolio.planningToday} icon={CalendarDays} />
          <PortfolioCard title="Factures" value={data.portfolio.invoicesCount} icon={FileText} />
        </div>
      </section>

      {/* Bar chart actions par type - optional small bar */}
      {data.periodStats.total > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Volume par type d&apos;action</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ACTION_CHART_CONFIG} className="h-[200px] w-full">
              <BarChart
                data={[
                  { name: "appele", value: data.periodStats.byAction.APPELE },
                  { name: "nonRepondu", value: data.periodStats.byAction.NON_REPONDU },
                  { name: "commande", value: data.periodStats.byAction.COMMANDE_PRISE },
                  { name: "relance", value: data.periodStats.byAction.A_RELANCER },
                ]}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value) =>
                    ACTION_CHART_CONFIG[value as keyof typeof ACTION_CHART_CONFIG]?.label || value
                  }
                />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {["appele", "nonRepondu", "commande", "relance"].map((key) => (
                    <Cell
                      key={key}
                      fill={ACTION_CHART_CONFIG[key as keyof typeof ACTION_CHART_CONFIG].color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Alertes */}
      <Card className="border-amber-200/60 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Alertes & points d&apos;attention
          </CardTitle>
          <CardDescription>Éléments nécessitant une action de votre part</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AlertBlock
            title="Clients hors portefeuille"
            count={data.alerts.unassignedClients.length}
            items={data.alerts.unassignedClients.map((item) => item.name)}
            href="/commercial-dashboard/affectations"
          />
          <AlertBlock
            title="Locaux hors portefeuille"
            count={data.alerts.unassignedLocations.length}
            items={data.alerts.unassignedLocations.map((item) => `${item.clientName || "Magasin"} — ${item.name}`)}
            href="/commercial-dashboard/affectations"
          />
          <AlertBlock
            title="Sans programme"
            count={data.alerts.agentsWithoutPlanning.length}
            items={data.alerts.agentsWithoutPlanning.map((item) => item.name)}
            href="/commercial-dashboard/planning"
          />
          <AlertBlock
            title="Jours sans planning"
            count={data.alerts.daysWithoutPlanning.length}
            items={data.alerts.daysWithoutPlanning}
            href="/commercial-dashboard/planning"
          />
          <AlertBlock
            title="Relances non honorées"
            count={data.alerts.overdueFollowUps?.length || 0}
            items={
              data.alerts.overdueFollowUps?.map(
                (item) => `${item.agentName} — ${item.clientName} (${item.daysLate}j de retard)`
              ) || []
            }
            href="/commercial-dashboard/historique-tournees"
            variant="destructive"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardHeader({
  userName,
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustomRange,
  onResetCustomRange,
  rangeError,
  isFetching,
  activeRangeLabel,
}: {
  userName: string
  period: CommercialTeamStatsPeriod
  onPeriodChange: (period: CommercialTeamStatsPeriod) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  onApplyCustomRange: () => void
  onResetCustomRange: () => void
  rangeError: string | null
  isFetching: boolean
  activeRangeLabel?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-xl md:p-8">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-blue-500/10" />
      <div className="relative space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200/80">Pilotage commercial</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Bonjour, {userName}</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Suivez la performance de votre équipe, l&apos;avancement des tournées et le pipeline des commandes.
            </p>
            {activeRangeLabel && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-blue-100">
                <CalendarDays className="h-3.5 w-3.5" />
                Période active : {activeRangeLabel}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPeriodChange(option.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all",
                  period === option.value
                    ? "bg-white text-slate-900 shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {period === "custom" && (
          <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p className="mb-3 text-sm font-medium text-blue-100">Intervalle personnalisé</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1.5">
                <label htmlFor="stats-from" className="text-xs text-blue-200/80">
                  Date de début
                </label>
                <Input
                  id="stats-from"
                  type="date"
                  value={customFrom}
                  onChange={(event) => onCustomFromChange(event.target.value)}
                  className="h-10 border-white/20 bg-white/95 text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="stats-to" className="text-xs text-blue-200/80">
                  Date de fin
                </label>
                <Input
                  id="stats-to"
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(event) => onCustomToChange(event.target.value)}
                  className="h-10 border-white/20 bg-white/95 text-slate-900"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={onApplyCustomRange}
                  className="h-10 bg-white text-slate-900 hover:bg-blue-50"
                >
                  Appliquer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onResetCustomRange}
                  className="h-10 border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
            {rangeError && <p className="mt-2 text-xs text-rose-200">{rangeError}</p>}
            <p className="mt-2 text-xs text-blue-200/70">
              Laissez la date de fin vide pour analyser une seule journée.
            </p>
          </div>
        )}

        {isFetching && <p className="text-xs text-blue-200/70">Mise à jour en cours…</p>}
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "blue" | "green" | "amber" | "orange"
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-800",
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    orange: "bg-orange-50 text-orange-800",
  }

  return (
    <div className={cn("rounded-xl px-3 py-2.5 text-center", tones[tone])}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  )
}

function KpiTile({
  label,
  value,
  icon: Icon,
  gradient,
  iconColor,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
  gradient: string
  iconColor: string
}) {
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-3", gradient)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  badge,
  badgeInline = false,
  href,
}: {
  title: string
  value: number
  subtitle: string
  icon: ComponentType<{ className?: string }>
  accent: "amber" | "blue" | "emerald" | "rose"
  badge?: ReactNode
  badgeInline?: boolean
  href?: string
}) {
  const accents = {
    amber: "from-amber-50 to-white border-amber-100",
    blue: "from-blue-50 to-white border-blue-100",
    emerald: "from-emerald-50 to-white border-emerald-100",
    rose: "from-rose-50 to-white border-rose-100",
  }
  const iconColors = {
    amber: "text-amber-600 bg-amber-100",
    blue: "text-blue-600 bg-blue-100",
    emerald: "text-emerald-600 bg-emerald-100",
    rose: "text-rose-600 bg-rose-100",
  }

  const formattedValue = value.toLocaleString("fr-FR")

  const content = (
    <Card className={cn("h-full border bg-gradient-to-br shadow-sm transition-shadow hover:shadow-md", accents[accent])}>
      <CardContent className="flex h-full items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold leading-none">{formattedValue}</p>
          {badgeInline && badge ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">{subtitle}</p>
              {badge}
            </div>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
              {badge && <div className="mt-2">{badge}</div>}
            </>
          )}
        </div>
        <div className={cn("shrink-0 rounded-xl p-2.5", iconColors[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    )
  }

  return content
}

function PipelineCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "slate" | "blue" | "amber" | "emerald" | "green" | "rose" | "indigo"
}) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-slate-50",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    green: "border-green-200 bg-green-50",
    rose: "border-rose-200 bg-rose-50",
    indigo: "border-indigo-200 bg-indigo-50",
  }

  return (
    <div className={cn("rounded-xl border p-3 text-center", tones[tone])}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function PortfolioCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-0 bg-slate-50 shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-slate-400" />
      </CardContent>
    </Card>
  )
}

function ResponseRateBadge({ rate }: { rate: number }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        rate >= 70 && "bg-emerald-100 text-emerald-700",
        rate >= 40 && rate < 70 && "bg-amber-100 text-amber-700",
        rate < 40 && "bg-red-100 text-red-700"
      )}
    >
      {rate}%
    </span>
  )
}

const ACTION_LABELS: Record<string, string> = {
  APPELE: "Non commandé",
  NON_REPONDU: "Non répondu",
  COMMANDE_PRISE: "Commande",
  A_RELANCER: "Relance",
}

const ACTION_COLORS: Record<string, string> = {
  APPELE: "bg-emerald-500",
  NON_REPONDU: "bg-orange-500",
  COMMANDE_PRISE: "bg-blue-500",
  A_RELANCER: "bg-amber-500",
}

function ActionLegend({ status, count }: { status: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("h-2 w-2 rounded-full", ACTION_COLORS[status])} />
      <span className="text-muted-foreground">{ACTION_LABELS[status]}</span>
      <span className="ml-auto font-semibold">{count}</span>
    </div>
  )
}

function AlertBlock({
  title,
  count,
  items,
  href,
  variant = "default",
}: {
  title: string
  count: number
  items: string[]
  href: string
  variant?: "default" | "destructive"
}) {
  return (
    <div className={cn("rounded-xl border bg-white p-4", variant === "destructive" && count > 0 && "border-red-200")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge variant={count > 0 ? (variant === "destructive" ? "destructive" : "destructive") : "outline"}>
          {count}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Aucune alerte
        </p>
      ) : (
        <>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {items.slice(0, 4).map((item) => (
              <li key={item} className="truncate">
                {item}
              </li>
            ))}
            {items.length > 4 && <li className="text-xs">+{items.length - 4} autres</li>}
          </ul>
          <Link href={href} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            Voir et corriger →
          </Link>
        </>
      )}
    </div>
  )
}
