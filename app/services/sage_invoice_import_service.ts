import Customer from '#models/customer'
import Depot from '#models/depot'
import Invoice from '#models/invoice'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import { readFile } from 'node:fs/promises'
import xmljs from 'xml-js'
import { DateTime } from 'luxon'
import { InvoiceStatus } from '../enum/index.js'

const DEFAULT_GESTION_DATABASES = [
  'GESTION_ZIGUINCHOR',
  'GESTION_PIKINE',
  'GESTION_CMGA_TH2021',
  'GESTION_CMGA_KH2021',
  'GESTION_CMGA_FD2021',
  'GESTION_CMGA_KLK2023',
  'GESTION_CMGA_2020',
]
const DEFAULT_COMPTA_DATABASE = 'COMPTA_CMGA_2021'
const REGUL_REFERENCE = ['REGUL', 'REGULE', 'RGL', 'REGULATION', 'REGU']
// Nom de colonne attribué par SQL Server au résultat d'un FOR XML
const FOR_XML_COLUMN = 'XML_F52E2B61-18A1-11d1-B105-00805F49916B'

export type SageImportSource = 'mssql' | 'file'

export interface SageImportResult {
  source: SageImportSource
  total: number
  created: number
  skipped: number
  failed: number
}

export default class SageInvoiceImportService {
  private static running = false

  /**
   * Lance un import complet. Un seul import tourne à la fois : un appel
   * pendant qu'un autre est en cours est ignoré (retourne null).
   */
  static async run(options: { source?: SageImportSource; file?: string; days?: number } = {}) {
    if (SageInvoiceImportService.running) {
      console.log('[Sage] Import déjà en cours, appel ignoré')
      return null
    }
    SageInvoiceImportService.running = true
    try {
      const service = new SageInvoiceImportService()
      const source = options.source ?? env.get('SAGE_IMPORT_SOURCE', 'mssql')
      const xml =
        source === 'file'
          ? await readFile(options.file ?? env.get('SAGE_IMPORT_FILE', 'database/sql-server/invoice-cmga.xml'), 'utf8')
          : await service.fetchXmlFromSqlServer(options.days ?? env.get('SAGE_IMPORT_DAYS', 1))
      return { source, ...(await service.importXml(xml)) } as SageImportResult
    } finally {
      SageInvoiceImportService.running = false
    }
  }

  /**
   * Récupère les factures des `days` derniers jours (+ aujourd'hui) dans toutes
   * les bases de gestion Sage, au même format XML que l'export invoice-cmga.xml.
   */
  async fetchXmlFromSqlServer(days: number) {
    const gestionDatabases = (env.get('SAGE_GESTION_DATABASES') ?? DEFAULT_GESTION_DATABASES.join(','))
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
    const comptaDatabase = env.get('SAGE_COMPTA_DATABASE', DEFAULT_COMPTA_DATABASE)

    // Les noms de base sont injectés dans le SQL : on n'accepte que des identifiants simples
    for (const name of [...gestionDatabases, comptaDatabase]) {
      if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Nom de base Sage invalide : ${name}`)
    }
    const safeDays = Math.max(0, Math.floor(Number(days) || 0))

    const selects = gestionDatabases.map(
      (base) => `
      SELECT
        '${base}' AS [@nomBase],
        entete.DO_Piece AS [@numeroFacture],
        entete.DO_Date AS [@dateFacture],
        client.CT_Num AS [@codeClient],
        entete.DO_Ref AS [@ref_regul],
        (
          SELECT client.CT_Telephone AS telephone, client.CT_Intitule AS nom, client.CT_Num AS code
          FOR XML PATH('client'), TYPE
        ),
        (
          SELECT
            l.AR_Ref AS [@reference],
            l.DL_Design AS [@designation],
            CAST(l.DL_Qte AS INT) AS [@quantite],
            l.DL_PrixUnitaire AS [@prixUnitaire],
            l.DL_MontantHT AS [@montantHT],
            l.DL_Taxe1 AS [@tva],
            l.DL_Taxe2 AS [@tva2],
            l.DL_Remise01REM_Valeur AS [@remise]
          FROM [${base}].dbo.F_DOCLIGNE l
          WHERE l.DO_Piece = entete.DO_Piece AND l.DO_Type = entete.DO_Type
          FOR XML PATH('produit'), ROOT('orders'), TYPE
        )
      FROM [${base}].dbo.F_DOCENTETE entete
      INNER JOIN [${comptaDatabase}].dbo.F_COMPTET client ON entete.DO_Tiers = client.CT_Num
      WHERE entete.DO_Type IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 17)
        AND entete.DO_Date >= DATEADD(DAY, -${safeDays}, CAST(GETDATE() AS date))`
    )
    const sql = `${selects.join('\n      UNION ALL')}\n      FOR XML PATH('facture'), ROOT('factures')`

    try {
      const rows = await db.connection('mssql').rawQuery(sql)
      // SQL Server découpe un long résultat FOR XML sur plusieurs lignes
      return (rows as any[]).map((row) => row[FOR_XML_COLUMN] ?? '').join('')
    } finally {
      await db.manager.close('mssql')
    }
  }

  async importXml(xml: string) {
    const result = { total: 0, created: 0, skipped: 0, failed: 0 }
    if (!xml.trim()) return result

    const invoiceJson = xmljs.xml2js(xml, { compact: true }) as any
    const factures = invoiceJson.factures?.facture
    if (!factures) return result

    const list = Array.isArray(factures) ? factures : [factures]
    result.total = list.length
    const depots = new Map<string, Depot>()

    // Traitement séquentiel : en parallèle, deux factures d'un même nouveau client le créeraient deux fois
    for (const invoice of list) {
      try {
        const created = await this.importInvoice(invoice, depots)
        created ? result.created++ : result.skipped++
      } catch (error) {
        result.failed++
        console.error(`[Sage] Erreur sur la facture ${invoice?._attributes?.numeroFacture}:`, error)
      }
    }
    return result
  }

  private async importInvoice(invoice: any, depots: Map<string, Depot>) {
    const attributes = invoice._attributes ?? {}
    const invoiceNumber: string | undefined = attributes.numeroFacture

    if (!invoiceNumber) return false
    if (!invoice.orders || invoiceNumber[0]?.toUpperCase() !== 'F') return false // Ignorer si pas d'orders ou ne commence pas par F
    if (await Invoice.findBy('invoice_number', invoiceNumber)) return false

    let products = invoice.orders.produit
    if (!products) return false
    if (!Array.isArray(products)) products = [products]

    // Formater les produits avec validation des nombres
    const formattedProducts = products.map((product: any) => {
      const tva = Math.abs(parseInt(product._attributes.tva) || 0)
      const tva2 = Math.abs(parseInt(product._attributes.tva2) || 0)
      const tvaMax = Math.max(tva, tva2) // Prendre la TVA la plus élevée
      const remise = Math.abs(parseInt(product._attributes.remise) || 0)

      const prixUnitaire = Math.abs(parseFloat(product._attributes.prixUnitaire) || 0)
      const montantTva = Math.abs((tvaMax / 100) * prixUnitaire)
      const prixUnitaireTva = Math.round(prixUnitaire + montantTva)
      const quantite = Math.abs(parseInt(product._attributes.quantite, 10) || 0)

      // Appliquer la remise si elle existe
      const prixAvecRemise =
        remise > 0 ? Math.abs(prixUnitaireTva * quantite * (1 - remise / 100)) : prixUnitaireTva * quantite

      // Si la référence contient "FRAIS", le prix doit être négatif
      const prixFinal = product?._attributes?.reference?.toUpperCase().includes('FRAIS')
        ? -prixAvecRemise
        : prixAvecRemise

      return {
        reference: product._attributes.reference,
        designation: product._attributes.designation,
        quantite: quantite,
        tva: `${tvaMax}%`,
        remise: `${remise}%`,
        prixUnitaire: prixUnitaireTva,
        total: Math.round(prixFinal),
      }
    })

    const totalTTC = Math.round(
      formattedProducts.reduce((acc: number, product: any) => acc + (product.total || 0), 0)
    )
    if (isNaN(totalTTC)) {
      console.log(`[Sage] Facture ${invoiceNumber} ignorée: totalTTC invalide`)
      return false
    }

    // Un numéro de facture contenant "R" est un retour (montant négatif), une référence REGUL une régule
    let status = InvoiceStatus.NON_RECEPTIONNEE
    let finalTotalTTC = totalTTC
    if (invoiceNumber.toUpperCase().includes('R')) {
      status = InvoiceStatus.RETOUR
      finalTotalTTC = -Math.abs(totalTTC)
    }
    if (REGUL_REFERENCE.some((reference) => attributes.ref_regul?.toUpperCase().includes(reference))) {
      status = InvoiceStatus.REGULE
      finalTotalTTC = totalTTC
    }

    const customer = await this.findOrCreateCustomer(invoice.client)
    const depot = attributes.nomBase ? await this.findOrCreateDepot(attributes.nomBase, depots) : null

    await Invoice.create({
      customerId: customer.id,
      accountNumber: attributes.codeClient,
      depotId: depot?.id,
      invoiceNumber,
      date: attributes.dateFacture,
      order: JSON.stringify(formattedProducts),
      totalTTC: finalTotalTTC,
      status,
      isCompleteDelivery: true,
      // createdAt n'est pas auto-rempli par le modèle Invoice, or la liste par période filtre dessus
      createdAt: DateTime.now(),
    } as any)
    console.log(`[Sage] Nouvelle facture ${invoiceNumber} créée`)
    return true
  }

  private async findOrCreateCustomer(client: any) {
    const accountNumber = client.code._text
    const existing = await Customer.findBy('account_number', accountNumber)
    if (existing) return existing
    return Customer.create({
      accountNumber,
      name: client.nom._text,
      phone: client?.telephone?._text?.replace(/\s+/g, ''),
    })
  }

  /**
   * Chaque base Sage correspond à un dépôt. S'il n'existe pas encore, il est créé
   * avec un nom lisible (GESTION_CMGA_FD2021 -> "CMGA FD2021"), modifiable ensuite.
   */
  private async findOrCreateDepot(sageBase: string, cache: Map<string, Depot>) {
    const cached = cache.get(sageBase)
    if (cached) return cached

    const depot =
      (await Depot.findBy('sage_base', sageBase)) ??
      (await Depot.create({ name: sageBase.replace(/^GESTION_/, '').replace(/_/g, ' '), sageBase }))
    cache.set(sageBase, depot)
    return depot
  }
}
