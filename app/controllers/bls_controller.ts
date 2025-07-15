import { HttpContext } from "@adonisjs/core/http"
import Bl from "#models/bl"
import Invoice from "#models/invoice"
import Driver from "#models/driver"
import UserActivityService from '#services/user_activity_service'
import NotificationService from '#services/notification_service'

export default class BlsController {
    async index({ response }: HttpContext) {
        const bls = await Bl.all()
        return response.status(200).json(bls)
    }
    async show({ response, params }: HttpContext) {
        const bl = await Bl.query().where('id', params.id).preload('invoice', (query) => query.preload('customer')).preload('driver').first()
        return response.status(200).json(bl)
    }
    async store({ request, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
        const { invoiceId, products, driverId } = request.body()
            
        const bl = await Bl.create({ invoiceId, products, driverId })
            
            // Récupérer les informations pour la notification
            const invoice = await Invoice.query().where('id', invoiceId).preload('customer').first()
            const driver = await Driver.find(driverId)
            
            if (invoice && driver) {
                // Enregistrer l'activité de création de BL
                await UserActivityService.logActivity(
                    Number(currentUser.id),
                    UserActivityService.ACTIONS.CREATE_BL,
                    currentUser.role,
                    invoiceId,
                    {
                        blId: bl.id,
                        blNumber: `BL-${bl.id}`,
                        driverName: driver.name,
                        invoiceNumber: invoice.invoiceNumber
                    }
                )
            }
            
        return response.status(201).json(bl)
        } catch (error) {
            console.error('Erreur lors de la création de la BL:', error)
            return response.status(500).json({ message: "Erreur lors de la création de la BL" })
        }
    }
    async getBlbyUserAndDate({ response, auth }: HttpContext) {
        const { id: userId } = auth.getUserOrFail()
        const currentDate = new Date()
        try {
            const bl = await Bl.query().where('user_id', userId).whereRaw('DATE(created_at) = ?', [currentDate.toISOString().split('T')[0]]).orderBy('created_at', 'desc').preload('invoice', (query) => query.preload('customer')).preload('driver')
            return response.status(200).json(bl)
        } catch (error) {
            return response.status(404).json({ message: "Aucune BL trouvée pour cet utilisateur et cette date" })
        }
    }
    async update({ request, response }: HttpContext) {
        const data = request.body()
        try {
            const bl = await Bl.find(data.id)
            if (!bl) {
                return response.status(404).json({ message: "BL non trouvé" })
            }

            // Calculer le total pour chaque produit
            const productsWithCalculatedTotal = data.products.map((product: any) => ({
                ...product,
                total: product.prixUnitaire * product.quantite
            }))
            bl.total = productsWithCalculatedTotal.reduce((acc: number, curr: any) => acc + curr.total, 0)

            bl.products = JSON.stringify(productsWithCalculatedTotal)
            await bl.merge({ driverId: data.driverId }).save()
            return response.status(200).json({ message: "BL mise à jour avec succès", bl })
        } catch (error) {
            return response.status(500).json({ message: "Erreur lors de la mise à jour de la BL" })
        }
    }
    async getMaxQuantite({ response, params }: HttpContext) {
        const { invoiceId } = params
        const bl = await Bl.query().where('invoice_id', invoiceId).where('is_delivered', true).orderBy('created_at', 'desc').first()
        if (!bl) {
            return response.status(404).json({ message: "BL non trouvé" })
        }
        const maxQuantites = bl.products.map((product: any) => {
            return {
                [product.reference]: product.quantite
            }
        });
        // const maxQuantite = bl.products.reduce((acc, product) => acc + product.quantite, 0)
        return response.status(200).json(maxQuantites[0])
    }
}