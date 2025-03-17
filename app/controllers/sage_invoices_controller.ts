// import type { HttpContext } from '@adonisjs/core/http'

import Customer from '#models/customer'
import Invoice from '#models/invoice'
import { readFile } from 'node:fs/promises'
import xmljs from 'xml-js'
import { InvoiceStatus } from '../enum/invoice-status.js'
export default class SageInvoicesController {
    async invoice_xml_to_json() {
        try {
            const invoiceXml = await readFile('database/sql-server/invoice-cmga.xml', 'utf8')
            const invoiceJson = xmljs.xml2js(invoiceXml, { compact: true })

            // Utiliser Promise.all pour traiter les factures en parallèle
            await Promise.all(invoiceJson.factures.facture.map(async (invoice: any) => {
                const isInvoiceExist = await Invoice.findBy('invoice_number', invoice._attributes.numeroFacture)
                if (isInvoiceExist || !invoice.orders) return // Ignorer si la facture existe déjà

                // Extraire les données client
                const customerData = {
                    accountNumber: invoice.client.code._text,
                    name: invoice.client.nom._text,
                    phone: invoice.client?.telephone?._text?.replace(/\s+/g, ''),
                }

                const { id: customerId } = await Customer.create(customerData)

                // Normaliser les produits en tableau
                let products = invoice?.orders ? invoice?.orders?.produit : null
                if (products && !Array.isArray(products)) {
                    products = [products];
                }

                if (!products || !invoice.orders) return // Ignorer si pas de produits

                // Formater les produits
                const formattedProducts = products.map((product: any) => {
                    const prixUnitaire = Math.round(parseFloat(product._attributes.prixUnitaire) * 1.18)
                    const quantite = parseInt(product._attributes.quantite, 10)

                    return {
                        reference: product._attributes.reference,
                        designation: product._attributes.designation,
                        quantite: quantite,
                        prixUnitaire: prixUnitaire,
                        total: quantite * prixUnitaire,
                    }
                })

                const totalTTC = formattedProducts.reduce((acc: number, product: any) => acc + product.total, 0)

                // Créer la facture
                await Invoice.create({
                    customerId: customerId,
                    accountNumber: invoice._attributes.codeClient,
                    depotId: 1,
                    invoiceNumber: invoice._attributes.numeroFacture,
                    date: invoice._attributes.dateFacture,
                    order: JSON.stringify(formattedProducts),
                    totalTTC: totalTTC,
                    status: InvoiceStatus.PENDING,
                    isCompleteDelivery: true
                })
            }))

            return { success: true, message: 'Importation des factures terminée' }
        } catch (error) {
            console.error('Erreur lors de l\'importation des factures:', error)
            return { success: false, message: 'Erreur lors de l\'importation des factures', error }
        }
    }
}