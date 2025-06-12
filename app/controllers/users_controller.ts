import User from '#models/user'
import { userValidatorStore, userValidatorUpdate } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import { Role } from '../enum/index.js'

export default class UsersController {

    async index({ request, response }: HttpContext) {
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
    async getRecouvrementUsers({ response }: HttpContext) {
        try {
            const users = await User.query().where('role', Role.RECOUVREMENT)
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
            const data = await request.validateUsing(userValidatorStore)
            if (data.password !== data.confirmPassword) {
                return response.status(400).json({
                    success: false,
                    error: 'Les mots de passe ne correspondent pas'
                })
            }

            if (data.role !== Role.ADMIN && data.role !== Role.RECOUVREMENT) {
                if (!data.depotId) {
                    return response.status(400).json({
                        success: false,
                        error: 'Le depotId est requis pour les rôles magasiniers, controleurs et chefs de depot'
                    })
                }
            }

            // Supprimer confirmPassword des données avant la création
            const { confirmPassword, ...userData } = data
            const user = await User.create(userData)

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
            const data = await request.validateUsing(userValidatorUpdate)
            // return console.log(data)
            if (data.password !== data.confirmPassword) {
                return response.status(400).json({
                    success: false,
                    error: 'Les mots de passe ne correspondent pas'
                })
            }
            const user = await User.find(params.id)
            if (!user) {
                return response.status(404).json({ error: 'User not found' })
            }

            // Supprimer confirmPassword des données avant la mise à jour
            const { confirmPassword, ...userData } = data
            user.merge(userData)
            await user.save()
            return response.json(user)
        } catch (error) {
            return response.status(400).json({ error: error.messages })
        }
    }
}