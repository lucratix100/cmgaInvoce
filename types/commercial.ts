export type CommercialClientType = "MAGASIN" | "INDIVIDUEL"
export type CommercialPlanningDay =
  | "LUNDI"
  | "MARDI"
  | "MERCREDI"
  | "JEUDI"
  | "VENDREDI"
  | "SAMEDI"
  | "DIMANCHE"

export interface CommercialUser {
  id: number
  firstname: string
  lastname: string
  email?: string | null
  phone: string
  role: string
  isActive: boolean
}

export interface CommercialClientLocation {
  id: number
  commercialClientId: number
  name: string
  address?: string | null
  phone?: string | null
  phone2?: string | null
  email?: string | null
  responsable?: string | null
  notes?: string | null
  isActive: boolean
  client?: CommercialClient
}

export interface CommercialClient {
  id: number
  name: string
  type: CommercialClientType
  phone?: string | null
  address?: string | null
  email?: string | null
  accountNumber?: string | null
  contactName?: string | null
  notes?: string | null
  isActive: boolean
  locations?: CommercialClientLocation[]
  assignments?: CommercialAssignment[]
}

export interface CommercialAssignment {
  id: number
  agentId: number
  commercialClientId?: number | null
  commercialClientLocationId?: number | null
  note?: string | null
  isActive: boolean
  agent?: CommercialUser
  client?: CommercialClient
  location?: CommercialClientLocation
  commercialClientLocation?: CommercialClientLocation
}

export interface CommercialPlanningItem {
  id: number
  agentId: number
  commercialClientId?: number | null
  commercialClientLocationId?: number | null
  dayOfWeek: CommercialPlanningDay
  sortOrder: number
  instructions?: string | null
  isActive: boolean
  agent?: CommercialUser
  client?: CommercialClient
  location?: CommercialClientLocation
  commercialClientLocation?: CommercialClientLocation
}

export interface CommercialAlertData {
  unassignedClients: Array<{ id: number; name: string; type: CommercialClientType }>
  unassignedLocations: Array<{ id: number; name: string; clientName?: string | null }>
  agentsWithoutPlanning: Array<{ id: number; name: string; phone?: string | null }>
  daysWithoutPlanning: CommercialPlanningDay[]
  overdueFollowUps: Array<{
    planningItemId: number
    agentId: number
    agentName: string
    clientName: string
    dueAt: string | null
    daysLate: number
  }>
}

export interface CommercialDashboardData {
  stats: {
    activeAgents: number
    activeClients: number
    activeLocations: number
    activeAssignments: number
    invoicesCount: number
    planningToday: number
  }
  alerts: CommercialAlertData
}

export type CommercialTeamStatsPeriod = "today" | "7d" | "30d" | "month" | "custom"

export interface CommercialTeamStatsParams {
  period?: CommercialTeamStatsPeriod
  from?: string
  to?: string
}

export interface CommercialTeamStatsData {
  period: CommercialTeamStatsPeriod
  periodRange: { from: string; to: string }
  portfolio: CommercialDashboardData["stats"]
  todayTour: {
    planned: number
    completed: number
    pending: number
    executionRate: number
    followUpsDue: number
    followUpsOverdue: number
    byStatus: Record<CommercialExecutionStatus, number>
  }
  periodStats: {
    total: number
    byAction: Record<CommercialExecutionStatus, number>
    totalProducts: number
    clientsTouched: number
    responseRate: number
    orders: number
    relances: number
    monthlyTrend: {
      currentMonth: number
      previousMonth: number
      difference: number
      percent: number
      direction: "up" | "down" | "stable"
    }
  }
  dailyTrend: Array<{ date: string; actions: number; orders: number }>
  agentRanking: Array<{
    agentId: number
    name: string
    total: number
    orders: number
    relances: number
    responseRate: number
    todayPlanned: number
    todayCompleted: number
    todayRate: number
  }>
  bcPipeline: {
    pendingEditRequests: number
    brouillon: number
    confirme: number
    modificationDemandee: number
    valideAdmin: number
    rejeteAdmin: number
    facture: number
    annule: number
    total: number
  }
  alerts: CommercialAlertData
}

export interface CommercialImportRow {
  name: string
  type: CommercialClientType
  phone?: string | null
  address?: string | null
  email?: string | null
  accountNumber?: string | null
  contactName?: string | null
  notes?: string | null
  locationName?: string | null
  locationAddress?: string | null
  locationPhone?: string | null
  locationResponsable?: string | null
}

export interface CommercialProduct {
  id: number
  reference?: string | null
  name: string
  price?: number
  imgUrl?: string | null
  categoryProductId?: number
  categoryName?: string | null
  createdAt?: string
  updatedAt?: string | null
}

export type CommercialExecutionStatus = "APPELE" | "NON_REPONDU" | "COMMANDE_PRISE" | "A_RELANCER"

export interface CommercialAgentHistoryEntry {
  id: string
  planningItemId: number | null
  clientName: string
  clientAddress: string
  clientPhone: string
  clientCode: string
  parentName: string | null
  status: CommercialExecutionStatus
  comment: string | null
  orderTaken: boolean
  nextFollowUpAt: string | null
  resolvedFollowUpAt?: string | null
  followUpResolved?: boolean
  createdAt: string
  orderLines: Array<{
    id: number
    productId: number
    productName: string
    productReference: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}
