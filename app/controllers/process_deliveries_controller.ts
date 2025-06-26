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
        const { id } = auth.getUserOrFail()
        const authUserId = Number(id)
        const { invoiceNumber } = request.body()
        const invoice = await Invoice.findBy('invoice_number', invoiceNumber)
        if (!invoice) {
            return response.status(404).json({ message: 'Facture non trouvée.' })
        }

        if (invoice.isCompleted) {
            return response.status(400).json({ message: 'La facture a déjà été livrée.' })
        }
        // const lastBlbeforeConfirmation = await Bl.query().where('invoice_id', invoice.id).where('is_delivered', true).orderBy('id', 'desc').first()
        const bl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
        // return console.log(bl?.products, "bl", driverId);
        if (!bl) {
            return response.status(400).json({ message: 'en attente du 1 ere confirmation' })
        }
        // Vérifier si le BL est déjà validé
        if (bl.status === 'validée') {
            return response.status(400).json({ message: 'BL déjà validée.' })
        }
        const newBlproducts = await this.calculateNewBlProducts(invoice, invoice.isCompleteDelivery, bl.products)
        if (!invoice.isCompleteDelivery) {
            await Confirmation.create({
                userId: Number(authUserId),
                blId: bl.id,
            })
            bl.merge({ status: 'validée', isDelivered: true, products: JSON.stringify(newBlproducts) })
            await bl.save()
            // Vérifier si la facture doit être marquée comme complétée
            const blProducts = JSON.parse(bl.products)
            const remainingQty = blProducts.reduce((acc: number, curr: any) => acc + (Number(curr.remainingQty) || 0), 0)
            if (remainingQty === 0) {
                invoice.merge({ isCompleted: true, status: InvoiceStatus.LIVREE, deliveredAt: DateTime.now() })
                await invoice.save()
                return response.status(200).json({ message: 'Facture livrée.' })
            }
            return response.status(200).json({ message: 'BL validée.' })
        } else {
            await Confirmation.create({
                userId: Number(authUserId),
                blId: bl.id,
            })
            bl.merge({ status: 'validée', isDelivered: true, products: newBlproducts })
            await bl.save()
            invoice.merge({ isCompleted: true, status: InvoiceStatus.LIVREE, deliveredAt: DateTime.now() })
            await invoice.save()
            return response.status(200).json({ message: 'BL validée.' })
        }
    }
    async processDeliveries({ request, response, auth }: HttpContext) {
        const { invoiceNumber, products, isCompleteDelivery, driverId } = request.body()
        // return console.log(products, isCompleteDelivery, "products", driverId)
        const invoice = await Invoice.findBy('invoice_number', invoiceNumber)
        if (!invoice) {
            return response.status(404).json({ message: 'Facture non trouvée.' })
        }
        if (invoice.status === InvoiceStatus.NON_RECEPTIONNE) {
            return response.status(400).json({ message: 'La facture n\'a pas été réceptionnée.' })
        }
        if (invoice.isCompleted) {
            return response.status(400).json({ message: 'La facture a déjà été livrée.' })
        }
        const { depotId, id } = auth.getUserOrFail()
        const userId = Number(id)

        const depot = await Depot.find(depotId)
        if (!depot) {
            return response.status(404).json({ message: 'Depot non trouvé.' })
        }
        const { needDoubleCheck } = depot
        if (!needDoubleCheck) {
            const newBlproducts = await this.calculateNewBlProducts(invoice, isCompleteDelivery, products)
            const bl = await this.createBl(isCompleteDelivery, invoice, newBlproducts, needDoubleCheck, userId, driverId)
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
                const remainingQty = JSON.parse(newBlproducts).reduce((acc: number, curr: any) => acc + (Number(curr.remainingQty) || 0), 0);
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
                if (invoice.status === InvoiceStatus.LIVREE) {
                    return response.status(200).json({ message: 'La facture a déjà été livrée.' })
                }
                if (invoice.status === InvoiceStatus.EN_COURS) {
                    const lastBl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
                    if (lastBl) {
                        if (lastBl.status === 'en attente de confirmation') {
                            return response.status(200).json({ message: 'En attente de la confirmation du bon de livraison.' })
                        }
                        const bl = await this.createBl(isCompleteDelivery, invoice, lastBl.products, needDoubleCheck, userId, driverId)
                        await Confirmation.create({
                            userId: userId,
                            blId: bl.id,
                        })
                        bl.merge({ status: 'en attente de confirmation' })
                        await bl.save()
                        return response.status(200).json({ message: 'En attente de la confirmation du bon de livraison.' })
                    }
                }
                const bl = await this.createBl(isCompleteDelivery, invoice, invoice.order, needDoubleCheck, userId, driverId)
                await Confirmation.create({
                    userId: userId,
                    blId: bl.id,
                })

                invoice.merge({ status: InvoiceStatus.EN_COURS })
                await invoice.save()
                return response.status(200).json({ message: 'En attente de la 2 eme confirmation.' })


            }
            const lastBl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
            if (lastBl && lastBl.status === 'en attente de confirmation') {
                return response.status(200).json({ message: 'En attente de la 2 éme confirmation.' })
            }
            const bl = await this.createBl(isCompleteDelivery, invoice, products, needDoubleCheck, userId, driverId)
            await Confirmation.create({
                userId: userId,
                blId: bl.id,
            })

            invoice.merge({ isCompleteDelivery: false, status: InvoiceStatus.EN_COURS })
            await invoice.save()
            return response.status(200).json({ message: 'En attente de la 2 eme confirmation.' })

        }
    }

    private async createBl(isCompleteDelivery: boolean, invoice: any, products: any, needDoubleCheck: boolean, userId: number, driverId: number) {
        if (isCompleteDelivery) {
            const formatedProducts = products.map((product: any) => {
                const quantite = Number(product.remainingQty) || 0;
                const prixUnitaire = Number(product.prixUnitaire) || 0;
                const total = quantite * prixUnitaire;
                
                return {
                    reference: product.reference,
                    designation: product.designation,
                    quantite: quantite,
                    prixUnitaire: prixUnitaire,
                    total: total,
                    remainingQty: 0,
                }
            })
            if (invoice.status === InvoiceStatus.EN_COURS) {
                const totalAmount = formatedProducts.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);
                console.log("total", totalAmount, driverId, userId)
                return await Bl.create({
                    invoiceId: invoice.id,
                    userId: userId,
                    products: JSON.stringify(formatedProducts),
                    total: totalAmount,
                    isDelivered: !needDoubleCheck,
                    status: 'en attente de confirmation',
                    driverId: driverId,
                })
            }
        }
        const formatedProducts = products.map((product: any) => {
            const quantite = Number(product.quantite) || 0;
            const prixUnitaire = Number(product.prixUnitaire) || 0;
            const total = quantite * prixUnitaire;
            
            return {
                reference: product.reference,
                designation: product.designation,
                quantite: quantite,
                prixUnitaire: prixUnitaire,
                total: total,
            }
        })

        const totalAmount = formatedProducts.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);

        return await Bl.create({
            invoiceId: invoice.id,
            userId,
            products: JSON.stringify(formatedProducts),
            total: totalAmount,
            isDelivered: !needDoubleCheck,
            status: 'en attente de confirmation',
            driverId: driverId,
        })
    }
    private async calculateNewBlProducts(invoice: any, isCompleteDelivery: boolean, products: any) {
        if (isCompleteDelivery) {
            return JSON.stringify(invoice.order)
        } else {
            const lastBl = await Bl.query().where('invoice_id', invoice.id).where('is_delivered', true).orderBy('id', 'desc').first()
            return lastBl
                ? calculateQuantityDifferences(true, lastBl.products, products)
                : calculateQuantityDifferences(false, invoice.order, products)
        }
    }
}