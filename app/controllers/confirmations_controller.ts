import type { HttpContext } from '@adonisjs/core/http'
import Confirmation from '#models/confirmation'
export default class ConfirmationsController {
    async store({ request, response }: HttpContext) {
       
        const { userId, blId, invoiceId , isCompleteDelivery  } = request.body()
        const confirmation = await Confirmation.create({ userId, blId, invoiceId, isCompleteDelivery })
        return response.status(201).json(confirmation)
    }
    async index({ response }: HttpContext) {
        const confirmations = await Confirmation.all()
        return response.status(200).json(confirmations)
    }
    async show({ request, response }: HttpContext) {
        const { id } = request.params()
        const confirmation = await Confirmation.find(id)
        return response.status(200).json(confirmation)
    }
    async update({ request, response }: HttpContext) {
        const { id } = request.params()
        const { userId, blId, invoiceNumber } = request.body()
        const confirmation = await Confirmation.find(id)
        if (!confirmation) {
            return response.status(404).json({ message: 'Confirmation not found' })
        }
        confirmation.userId = userId
        confirmation.blId = blId
        confirmation.invoiceNumber = invoiceNumber
        await confirmation.save()
        return response.status(200).json(confirmation)
    }

}