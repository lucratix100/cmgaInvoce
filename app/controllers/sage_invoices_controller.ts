// import type { HttpContext } from '@adonisjs/core/http'
import Customer from '#models/customer'
import Invoice from '#models/invoice'
import { readFile } from 'node:fs/promises'
import xmljs from 'xml-js'
import { InvoiceStatus } from '../enum/index.js'
import Depot from '#models/depot'
export default class SageInvoicesController {
    async invoice_xml_to_json() {
        try {
            const invoiceXml = await readFile('database/sql-server/invoice-cmga.xml', 'utf8')
            const invoiceJson = xmljs.xml2js(invoiceXml, { compact: true }) as any
            const depots = await Depot.all()
            // Vérifier que factures existe et est un tableau
            if (!invoiceJson.factures?.facture) {
                console.log('Aucune facture trouvée dans le XML')
                return { success: true, message: 'Aucune facture à traiter' }
            }

            const factures = Array.isArray(invoiceJson.factures.facture)
                ? invoiceJson.factures.facture
                : [invoiceJson.factures.facture]

            // Utiliser Promise.all pour traiter les factures en parallèle
            await Promise.all(factures.map(async (invoice: any) => {

                // Vérifier que la facture a un numéro valide
                if (!invoice._attributes?.numeroFacture) {
                    console.log('Facture ignorée: numéro de facture manquant')
                    return
                }

                const isInvoiceExist = await Invoice.findBy('invoice_number', invoice._attributes.numeroFacture)
                if (isInvoiceExist) {
                    console.log(`Facture ${invoice._attributes.numeroFacture} existe déjà, ignorée`)
                    return
                }

                if (!invoice.orders || (invoice?._attributes?.numeroFacture[0]?.toUpperCase() !== "F")) return // Ignorer si pas d'orders ou ne commence pas par F

                // Extraire les données client
                const customerData = {
                    accountNumber: invoice.client.code._text,
                    name: invoice.client.nom._text,
                    phone: invoice.client?.telephone?._text?.replace(/\s+/g, ''),
                }
                const isCustomerExist = await Customer.findBy('account_number', customerData.accountNumber)
                let customerId = null
                if (isCustomerExist) {
                    customerId = isCustomerExist.id
                } else {
                    const { id } = await Customer.create(customerData)
                    customerId = id
                }

                // Normaliser les produits en tableau
                let products = invoice?.orders ? invoice?.orders?.produit : null
                if (products && !Array.isArray(products)) {
                    products = [products];
                }

                if (!products || !invoice.orders) return // Ignorer si pas de produits

                // Formater les produits avec validation des nombres
                const formattedProducts = products.map((product: any) => {
                    // Validation et parsing sécurisé des nombres
                    const tva = Math.abs(parseInt(product._attributes.tva) || 0)
                    const tva2 = Math.abs(parseInt(product._attributes.tva2) || 0)
                    const tvaMax = Math.max(tva, tva2) // Prendre la TVA la plus élevée
                    const remise = Math.abs(parseInt(product._attributes.remise) || 0) // Convertir la remise en pourcentage

                    const prixUnitaire = Math.abs(parseFloat(product._attributes.prixUnitaire) || 0)
                    const montantTva = Math.abs((tvaMax / 100) * prixUnitaire)
                    const prixUnitaireTva = Math.round(prixUnitaire + montantTva)
                    const quantite = Math.abs(parseInt(product._attributes.quantite, 10) || 0)

                    // Appliquer la remise si elle existe
                    const prixAvecRemise = remise > 0 ? Math.abs((prixUnitaireTva * quantite) * (1 - remise / 100)) : prixUnitaireTva * quantite

                    // Si la référence contient "FRAIS", le prix unitaire doit être négatif
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
                        total: Math.round(prixFinal), // Arrondir pour éviter les décimales
                    }
                })

                // Validation du totalTTC
                const totalTTC = Math.round(formattedProducts.reduce((acc: number, product: any) => {
                    const productTotal = product.total || 0
                    return acc + productTotal
                }, 0))

                // Vérifier que totalTTC est un nombre valide
                if (isNaN(totalTTC)) {
                    console.log(`Facture ${invoice._attributes.numeroFacture} ignorée: totalTTC invalide`)
                    return
                }

                const depot = depots.find((depot: any) => depot.name === invoice._attributes.nomBase)

                // Vérifier si le numéro de facture contient la lettre "R" pour déterminer le statut et le montant
                const hasReturnReference = invoice._attributes.numeroFacture?.toUpperCase().includes('R')
                const REGUL_REFERENCE = ["REGUL", "REGULE", "RGL", "REGULATION", "REGU"]
                const isRegulReference = REGUL_REFERENCE.some((reference) => invoice._attributes.ref_regul?.toUpperCase().includes(reference))

                // Déterminer le statut et le montant total
                let finalStatus = InvoiceStatus.NON_RECEPTIONNEE
                let finalTotalTTC = totalTTC

                if (hasReturnReference) {
                    finalStatus = InvoiceStatus.RETOUR
                    finalTotalTTC = -Math.abs(totalTTC)
                    // Rendre le montant négatif
                }

                if (isRegulReference) {
                    finalStatus = InvoiceStatus.REGULE
                    finalTotalTTC = totalTTC
                }

                // Préparer les données de la facture
                const invoiceData = {
                    customerId: customerId,
                    accountNumber: invoice._attributes.codeClient,
                    depotId: depot?.id,
                    invoiceNumber: invoice._attributes.numeroFacture,
                    date: invoice._attributes.dateFacture,
                    order: JSON.stringify(formattedProducts),
                    totalTTC: finalTotalTTC,
                    status: finalStatus,
                    isCompleteDelivery: true
                }

                // Créer une nouvelle facture
                await Invoice.create(invoiceData)
                console.log(`Nouvelle facture ${invoice._attributes.numeroFacture} créée`)
            }))

            return { success: true, message: 'Importation des factures terminée' }
        } catch (error) {
            console.error('Erreur lors de l\'importation des factures:', error)
            return { success: false, message: 'Erreur lors de l\'importation des factures', error }
        }
    }
}