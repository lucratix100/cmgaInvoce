import type { InvoiceReminder } from "@/lib/types"
import { Role } from "@/types/roles"

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function getNotificationTargetHref(notification: InvoiceReminder, role?: string | null) {
  const invoiceNumber = notification.invoice?.invoiceNumber
  if (invoiceNumber) {
    if (role === Role.AGENT_COMMERCIAL || role === Role.COMMERCIAL_DETAILLANT) {
      return `/agent-factures?search=${encodeURIComponent(invoiceNumber)}`
    }
    if (role === Role.COMMERCIAL_ADMIN || role === Role.ADMIN_DETAILLANT) {
      return `/commercial-dashboard/factures?search=${encodeURIComponent(invoiceNumber)}`
    }
    if (role === Role.RECOUVREMENT) {
      return `/factures/${invoiceNumber}`
    }
    return `/dashboard/invoices/${invoiceNumber}`
  }

  const comment = normalizeText(notification.comment || "")

  if (role === Role.ADMIN) {
    if (comment.includes("utilisateur sensible")) return "/dashboard/users"
    if (comment.includes("bc commercial confirme") || comment.includes("attend votre validation")) {
      return "/dashboard/commercial-bls?status=CONFIRME"
    }
    if (comment.includes("bc commercial valide")) return "/dashboard/commercial-bls?status=VALIDE_ADMIN"
    if (comment.includes("bc commercial rejete")) return "/dashboard/commercial-bls?status=REJETE_ADMIN"
    if (
      comment.includes("bc valide annule") ||
      comment.includes("fiche verrouillee") ||
      comment.includes("bc commercial sans lignes") ||
      comment.includes("facturation bc impossible")
    ) {
      return "/dashboard/commercial-bls"
    }
  }

  if (role === Role.COMMERCIAL_ADMIN || role === Role.ADMIN_DETAILLANT) {
    if (
      comment.includes("demande modification bc") ||
      comment.includes("demande bc") ||
      comment.includes("bc commercial modifie")
    ) {
      return "/commercial-dashboard/demandes-bl"
    }
    if (comment.includes("bc commercial annule")) return "/commercial-dashboard/historique-tournees"
    if (comment.includes("relances non honorees") || comment.includes("relance non honoree")) {
      return "/commercial-dashboard/historique-tournees"
    }
    return "/commercial-dashboard"
  }

  if (role === Role.AGENT_COMMERCIAL || role === Role.COMMERCIAL_DETAILLANT) {
    if (
      comment.includes("bc commercial") ||
      comment.includes("modification bc") ||
      comment.includes("commande")
    ) {
      return "/commandes"
    }
    if (comment.includes("relance") || comment.includes("fiche verrouillee")) return "/agents?relances=1"
  }

  if (role === Role.FACTURATION) return "/facturation"

  return "/notifications"
}
