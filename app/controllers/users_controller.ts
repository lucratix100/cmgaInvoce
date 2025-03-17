import User from '#models/user'
import { userValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {

    async index({ response}: HttpContext) {
        try {
            const users = await User.query()
                .preload('depot')
                .orderBy('created_at', 'desc')
            
            return response.json(users)
        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error)
            return response.status(500).json({
                error: 'Erreur lors de la récupération des utilisateurs'
            })
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
            console.log('Données reçues:', data) // Debug
            
            const user = await User.create(data)
            
            return response.status(201).json({
                success: true,
                message: 'Utilisateur créé avec succès',
                user
            })
        } catch (error) {
            console.error('Erreur de création:', error) // Debug
            
            // Si c'est une erreur de validation
            if (error.messages) {
                return response.status(422).json({
                    success: false,
                    error: error.messages
                })
            }
            
            // Pour les autres types d'erreurs
            return response.status(500).json({
                success: false,
                error: 'Erreur lors de la création de l\'utilisateur',
                details: error.message
            })
        }
    }

    async update({ request, response, params }: HttpContext) {
        try {
            const data = await request.validateUsing(userValidator)
            const user = await User.find(params.id)
            if (!user) {
                return response.status(404).json({ error: 'User not found' })
            }
            user.merge(data)
            await user.save()
            return response.json(user)
        } catch (error) {
            return response.status(400).json({ error: error.messages })
        }
    }
}