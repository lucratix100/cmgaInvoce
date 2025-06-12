import { InvoiceStatus, InvoicePaymentStatus } from "@/types/enums"
import { InvoiceProduct } from "@/lib/types"

export interface Invoice {
  id: number
  invoiceNumber: string
  accountNumber: string
  date: string | Date
  status: InvoiceStatus
  isCompleted: boolean
  isCompleteDelivery: boolean
  order: InvoiceProduct[]
  customer: {
    id: number
    name: string
    phone: string
  } | null
  depotId: number
  totalTtc: number
  statusPayment: InvoicePaymentStatus
  depot?: {
    id: number
    name: string
  } | null
  deliveries?: Array<{
    id: number
    date: string
    status: string
    quantity: number
  }>
  history?: Array<{
    date: string
    status: string
    user: string
    details: string
  }>
} 