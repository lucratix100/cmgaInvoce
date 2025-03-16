import { InvoiceStatus } from "@/types/enums"

export interface Invoice {
  id: number
  invoiceNumber: string
  accountNumber: string
  date: string | Date
  status: InvoiceStatus
  order?: Array<{
    reference: string
    designation: string
    quantity: number
    unitPrice: number
    totalHT: number
  }>
  customer: {
    id: number
    name: string
    phone: string
  } | null
  depot: {
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