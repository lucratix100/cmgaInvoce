import type { HttpContext } from '@adonisjs/core/http'
import Driver from '../models/driver.js'
import { driverSchema } from '#validators/driver'

export default class DriversController {
    async index({ response }: HttpContext) {
        try {
            const drivers = await Driver.all()
            return response.json(drivers)
        } catch (error) {
            return response.status(500).json({ message: 'Internal server error' })
        }
    }

    async store({ request, response }: HttpContext) {
        try {
            const data = await request.validateUsing(driverSchema)
            const driver = await Driver.create(data)
            return response.json(driver)
        } catch (error) {
            console.error('Erreur de création:', error)
            return response.status(400).json({ 
                message: 'Erreur de validation',
                errors: error.messages 
            })
        }
    }

    async update({ request, response, params }: HttpContext) {
        try {
            const data = await request.validateUsing(driverSchema)
            const driver = await Driver.findOrFail(params.id)
            
            driver.merge({
                firstname: data.firstname,
                lastname: data.lastname,
                phone: data.phone,
                isActive: data.isActive
            })
            
            await driver.save()
            return response.json(driver)
        } catch (error) {
            console.error('Erreur de mise à jour:', error)
            return response.status(400).json({ 
                message: 'Erreur de validation',
                errors: error.messages 
            })
        }
    }
}
