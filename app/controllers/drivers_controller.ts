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
            console.log(error)
            return response.status(400).json({ message: 'Invalid data' })
        }
    }
}