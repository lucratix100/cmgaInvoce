import { create } from 'zustand'
import { getInvoices } from '@/actions/invoice'
import { getDefaultDates } from '@/lib/date-utils'

interface InvoiceState {
  invoices: any[]
  filteredInvoices: any[]
  loading: boolean
  error: string | null
  status: string
  search: string
  startDate: string
  endDate: string | null
  user: any | null
  setStatus: (status: string) => void
  setSearch: (search: string) => void
  setDateRange: (startDate: string, endDate?: string) => void
  fetchInvoices: () => Promise<void>
  filterInvoices: () => void
  setInvoices: (invoices: any[]) => void
  setUser: (user: any) => void
}

export const useInvoiceStore = create<InvoiceState>((set, get): InvoiceState => ({
  invoices: [],
  filteredInvoices: [],
  loading: false,
  error: null,
  status: 'tous',
  search: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  user: null,

  setStatus: (status) => {
    set({ status })
    get().filterInvoices()
  },

  setSearch: (search) => {
    set({ search })
    get().filterInvoices()
  },

  setDateRange: (startDate, endDate = '') => {
    set({
      startDate,
      endDate: endDate || null,
      loading: true
    })

    const fetchData = async () => {
      try {
        const { status, search } = get()
        console.log('Fetching with dates:', { startDate, endDate: endDate || 'none' })
        const data = await getInvoices({
          status,
          search,
          startDate,
          ...(endDate ? { endDate } : {})
        })
        set({ invoices: data, filteredInvoices: data, loading: false })
      } catch (error) {
        set({
          error: "Erreur lors du chargement des factures",
          loading: false,
          invoices: [],
          filteredInvoices: []
        })
      }
    }

    fetchData()
  },

  fetchInvoices: async () => {
    set({ loading: true })
    try {
      const { status, search, startDate, endDate } = get()
      console.log('Fetching with params:', { status, search, startDate, endDate: endDate || 'none' })
      const data = await getInvoices({
        status,
        search,
        startDate,
        ...(endDate ? { endDate } : {})
      })
      set({ invoices: data, filteredInvoices: data, loading: false })
    } catch (error) {
      set({ error: "Erreur lors du chargement des factures", loading: false })
    }
  },

  filterInvoices: () => {
    const { invoices, status, search } = get()
    let result = [...invoices]

    if (status !== 'tous') {
      result = result.filter(invoice => invoice.status === status)
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase().trim()
      result = result.filter(invoice =>
        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
        invoice.accountNumber?.toLowerCase().includes(searchLower) ||
        (invoice.customer?.name?.toLowerCase().includes(searchLower) || false) ||
        (invoice.customer?.phone?.toLowerCase().includes(searchLower) || false)
      )
    }

    set({ filteredInvoices: result })
  },

  setInvoices: (invoices) => set({ invoices, filteredInvoices: invoices }),
  setUser: (user) => set({ user })
})) 