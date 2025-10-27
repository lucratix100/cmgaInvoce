// Types pour les factures urgentes
export interface UrgentInvoice {
  id: number
  invoiceNumber: string
  accountNumber: string
  date: string
  status: string
  isCompleted: boolean
  isCompleteDelivery: boolean
  totalTtc: number
  statusPayment: string
  isUrgent: boolean
  customer: {
    id: number
    name: string
    phone: string
  } | null
  depot?: {
    id: number
    name: string
  } | null
}

// Types pour les paramètres de recouvrement
export interface RecoverySetting {
  id: number
  rootId: number | null
  defaultDays: number
  isActive: boolean
  root?: {
    id: number
    name: string
  } | null
}

// Types pour les racines
export interface Root {
  id: number
  name: string
  createdAt?: string
  updatedAt?: string
}

// Réponse pour les factures urgentes
export interface UrgentInvoicesResponse {
  success: boolean
  urgentInvoices?: UrgentInvoice[]
  count?: number
  error?: string
  message?: string
  settings?: {
    defaultDays: number
    cutoffDate: string
  } | null
}

// Réponse pour les paramètres de recouvrement
export interface RecoverySettingsResponse {
  success: boolean
  data?: RecoverySetting | null
  settings?: RecoverySetting[]
  error?: string
  message?: string
}

// Réponse pour la mise à jour des statuts urgents
export interface UpdateUrgentStatusResponse {
  success: boolean
  message?: string
  updatedCount?: number
  error?: string
}

// Réponse pour les racines
export interface RootsResponse {
  success: boolean
  data: Root[]
  error?: string
} 