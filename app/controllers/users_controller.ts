import User from '#models/user'
import { userValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {

    async index({ response}: HttpContext) {
        try {
            const users = await User.all()
            return response.json(users)
        } catch (error) {
            return response.status(500).json({ error: 'Internal server error' })
        }
    }
    
    async show({ request, response }: HttpContext) {
        try {
            const { id } = request.params()
            const user = await User.find(id)
            return response.json(user)
        } catch (error) {
            return response.status(500).json({ error: 'Internal server error' })
        }
    }

    async store({ request, response }: HttpContext) {
        try {
                const data = await request.validateUsing(userValidator)
                const user = await User.create(data)
            
            return response.status(201).json({ message: 'User created successfully', user })
        }
         catch (error) {
            
            return response.status(400).json({ error: error.messages })
            
        }
    }
}
