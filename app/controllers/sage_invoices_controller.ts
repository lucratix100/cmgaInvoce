// import type { HttpContext } from '@adonisjs/core/http'

import Customer from '#models/customer'
import Invoice from '#models/invoice'
import { readFile } from 'node:fs/promises'
import xmljs from 'xml-js'
export default class SageInvoicesController {
    async invoice_xml_to_json() {
        const invoiceXml = await readFile('database/sql-server/invoice-cmga.xml', 'utf8')
        const invoiceJson = xmljs.xml2js(invoiceXml, { compact: true })
        // return invoiceJson
        invoiceJson.factures.facture.forEach(async (invoice: any) => {
            const invoiceData = await Invoice.findBy('invoice_number', invoice._attributes.numeroFacture)
            if (!invoiceData) {
                const { id: customerId } = await Customer.create({
                    accountNumber: invoice.client.code._text,
                    name: invoice.client.nom._text,
                    phone: invoice.client?.telephone?._text?.replace(/\s+/g, ''),
                })
                let products = invoice?.orders ? invoice?.orders?.produit : null
                if (products && !Array.isArray(products)) {
                    products = [products];
                    console.log(products);
                }

                // Convertir l'objet products en JSON valide avant de l'enregistrer
                const productsJson = products ? JSON.stringify(products) : null;

                await Invoice.create({
                    customerId: customerId,
                    accountNumber: invoice._attributes.codeClient,
                    depotId: 1,
                    invoiceNumber: invoice._attributes.numeroFacture,
                    date: invoice._attributes.dateFacture,
                    order: productsJson,

                })
            }
        })
    }
}
