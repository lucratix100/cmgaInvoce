import Bl from '#models/bl'
import Confirmation from '#models/confirmation'
import Depot from '#models/depot'
import Invoice from '#models/invoice'
import type { HttpContext } from '@adonisjs/core/http'
import { calculateQuantityDifferences } from '../utils/helpers.js'
import { InvoiceStatus } from '../enum/index.js'
import { DateTime } from 'luxon'

export default class ProcessDeliveriesController {
    async confirmBl({ request, response, auth }: HttpContext) {
        const { id: authUserId } = auth.getUserOrFail()
        const { invoiceNumber, driverId } = request.body()
        console.log("invoiceNumber", invoiceNumber)
        // return console.log("driverId", driverId)
        const invoice = await Invoice.findBy('invoice_number', invoiceNumber)
        if (!invoice) {
            return response.status(404).json({ message: 'Facture non trouvée.' })
        }
        if (invoice.isCompleted) {
            return response.status(400).json({ message: 'La facture a déjà été livrée.' })
        }
        const bl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
        console.log(bl)
        if (!bl) {
            return response.status(400).json({ message: 'en attente du 1 ere confirmation' })
        }
        // Vérifier si le BL est déjà validé
        if (bl.status === 'validée') {
            return response.status(400).json({ message: 'BL déjà validée.' })
        }

        if (!invoice.isCompleteDelivery) {
            await Confirmation.create({
                userId: authUserId,
                blId: bl.id,
            })
            bl.merge({ status: 'validée', isDelivered: true, driverId: Number(driverId) })
            await bl.save()
            // Vérifier si la facture doit être marquée comme complétée
            const blProducts = bl.products
            const remainingQty = blProducts.reduce((acc: number, curr: any) => acc + parseInt(curr.remainingQty || 0), 0)
            if (remainingQty === 0) {
                invoice.merge({ isCompleted: true, status: InvoiceStatus.LIVREE, deliveredAt: DateTime.now() })
                await invoice.save()
                return response.status(200).json({ message: 'Facture livrée.' })
            }
            return response.status(200).json({ message: 'BL validée.' })
        } else {
            await Confirmation.create({
                userId: authUserId,
                blId: bl.id,
            })
            bl.merge({ status: 'validée', isDelivered: true, driverId: Number(driverId) })
            await bl.save()
            invoice.merge({ isCompleted: true, status: InvoiceStatus.LIVREE, deliveredAt: DateTime.now() })
            await invoice.save()
            return response.status(200).json({ message: 'BL validée.' })

        }
    }
    async processDeliveries({ request, response, auth }: HttpContext) {
        const { invoiceNumber, products, isCompleteDelivery, driverId } = request.body()
        const invoice = await Invoice.findBy('invoice_number', invoiceNumber)
        if (!invoice) {
            return response.status(404).json({ message: 'Facture non trouvée.' })
        }
        if (invoice.isCompleted) {
            return response.status(400).json({ message: 'La facture a déjà été livrée.' })
        }
        const { depotId, id: userId } = auth.getUserOrFail()
        const depot = await Depot.find(depotId)
        if (!depot) {
            return response.status(404).json({ message: 'Depot non trouvé.' })
        }
        const { needDoubleCheck } = depot
        if (!needDoubleCheck) {
            const newBlproducts = await this.calculateNewBlProducts(invoice, isCompleteDelivery, products)
            const bl = await this.createBl(isCompleteDelivery, invoice, newBlproducts, driverId, needDoubleCheck)
            await Confirmation.create({
                userId: userId,
                blId: bl.id,
            })
            //   une seule confirmation
            bl.merge({ status: 'validée' })
            await bl.save()
            if (isCompleteDelivery) {

                invoice.merge({ isCompleted: true })
                await invoice.save()
                return response.status(200).json({ message: 'Facture livrée.' })
            } else {
                const remainingQty = JSON.parse(newBlproducts).reduce((acc: number, curr: any) => acc + parseInt(curr.remainingQty), 0);
                if (remainingQty === 0) {
                    invoice.merge({ isCompleted: true })
                    await invoice.save()
                    return response.status(200).json({ message: 'Facture livrée.' })
                } else {
                    return response.status(200).json({ message: 'Livraison partielle.' })
                }
            }
        } else {
            if (isCompleteDelivery) {
                if (invoice.status === InvoiceStatus.EN_COURS) {
                    const lastBl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
                    // return console.log("lastBl", lastBl?.products)
                    if (lastBl) {
                        const bl = await this.createBl(isCompleteDelivery, invoice, lastBl.products, driverId, needDoubleCheck)
                        await Confirmation.create({
                            userId: userId,
                            blId: bl.id,
                        })
                        bl.merge({ status: 'en attente de confirmation' })
                        await bl.save()
                        return response.status(200).json({ message: 'En attente de la confirmation du bon de livraison.' })
                    }
                }
            }
            const newBlproducts = await this.calculateNewBlProducts(invoice, isCompleteDelivery, products)
            const lastBl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
            if (lastBl && lastBl.status === 'en attente de confirmation') {
                return response.status(200).json({ message: 'En attente de la 2 éme confirmation.' })
            }
            const bl = await this.createBl(isCompleteDelivery, invoice, newBlproducts, driverId, needDoubleCheck)
            await Confirmation.create({
                userId: userId,
                blId: bl.id,
            })

            if (!isCompleteDelivery) {
                invoice.merge({ isCompleteDelivery: false, status: InvoiceStatus.EN_COURS })
                await invoice.save()
            } else {
                invoice.merge({ isCompleteDelivery: true })
                await invoice.save()
            }
            return response.status(200).json({ message: 'En attente de la 2 eme confirmation.' })
        }
    }

    private async createBl(isCompleteDelivery: boolean, invoice: any, products: string, driverId: number, needDoubleCheck: boolean) {
        if (isCompleteDelivery) {
            if (invoice.status === InvoiceStatus.EN_COURS) {
                console.log("products", products)
                const formatedProducts = products.map((product: any) => ({
                    reference: product.reference,
                    designation: product.designation,
                    quantite: product.remainingQty,
                    prixUnitaire: product.prixUnitaire,
                    total: product.quantite * product.prixUnitaire,
                    remainingQty: 0,
                }))
                return await Bl.create({
                    invoiceId: invoice.id,
                    products: JSON.stringify(formatedProducts),
                    driverId,
                    total: formatedProducts.reduce((acc: number, curr: any) => acc + curr.total, 0),
                    isDelivered: !needDoubleCheck,
                    status: 'en attente de confirmation',
                })
            }
        }
        const formatedProducts = products.map((product: any) => ({
            reference: product.reference,
            designation: product.designation,
            quantite: product.remainingQty,
            prixUnitaire: product.prixUnitaire,
            total: product.quantite * product.prixUnitaire,

        }))
        return await Bl.create({
            invoiceId: invoice.id,
            products: JSON.stringify(formatedProducts),
            driverId,
            total: formatedProducts.reduce((acc: number, curr: any) => acc + curr.total, 0),
            isDelivered: !needDoubleCheck,
            status: 'en attente de confirmation',
        })
    }

    private async calculateNewBlProducts(invoice: any, isCompleteDelivery: boolean, products: any) {
        if (isCompleteDelivery) {
            return JSON.stringify(invoice.order)
        } else {
            const lastBl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
            return lastBl
                ? JSON.stringify(calculateQuantityDifferences(true, lastBl.products, products))
                : JSON.stringify(calculateQuantityDifferences(false, invoice.order, products))
        }
    }
}