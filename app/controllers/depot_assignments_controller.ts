import type { HttpContext } from '@adonisjs/core/http'
import DepotAssignment from '#models/depot_assignment'
import User from '#models/user'
import Depot from '#models/depot'
import { Role } from '../enum/index.js'

export default class DepotAssignmentsController {
    async index({ response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            
            // Seuls les admins peuvent voir toutes les affectations
            if (user.$original.role !== Role.ADMIN) {
                return response.status(403).json({ 
                    message: "Accès non autorisé" 
                })
            }

            const assignments = await DepotAssignment.query()
                .preload('user', (query) => {
                    query.select('id', 'firstname', 'lastname', 'email', 'role')
                })
                .preload('depot', (query) => {
                    query.select('id', 'name', 'isActive')
                })
                .where('is_active', true)
                .orderBy('created_at', 'desc')

            return response.json(assignments)
        } catch (error) {
            console.error('Erreur lors de la récupération des affectations par dépôt:', error)
            return response.status(500).json({ 
                message: "Erreur interne du serveur" 
            })
        }
    }

    async store({ request, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            
            // Seuls les admins peuvent créer des affectations
            if (user.$original.role !== Role.ADMIN) {
                return response.status(403).json({ 
                    message: "Accès non autorisé" 
                })
            }

            const { userId, depotId } = request.body()

            // Validation des données
            if (!userId || !depotId) {
                return response.status(400).json({ 
                    message: "L'utilisateur et le dépôt sont requis" 
                })
            }

            // Vérifier que l'utilisateur existe et est de rôle RECOUVREMENT
            const targetUser = await User.find(userId)
            if (!targetUser) {
                return response.status(404).json({ 
                    message: "Utilisateur non trouvé" 
                })
            }

            if (targetUser.role !== Role.RECOUVREMENT) {
                return response.status(400).json({ 
                    message: "Seuls les utilisateurs de recouvrement peuvent être affectés à des dépôts" 
                })
            }

            // Vérifier que le dépôt existe
            const depot = await Depot.find(depotId)
            if (!depot) {
                return response.status(404).json({ 
                    message: "Dépôt non trouvé" 
                })
            }

            // Vérifier si l'affectation existe déjà
            const existingAssignment = await DepotAssignment.query()
                .where('user_id', userId)
                .where('depot_id', depotId)
                .where('is_active', true)
                .first()

            if (existingAssignment) {
                return response.status(400).json({ 
                    message: "Cette affectation existe déjà" 
                })
            }

            // Créer l'affectation
            const assignment = await DepotAssignment.create({
                userId,
                depotId,
                isActive: true
            })

            // Charger les relations pour la réponse
            await assignment.load('user', (query) => {
                query.select('id', 'firstname', 'lastname', 'email', 'role')
            })
            await assignment.load('depot', (query) => {
                query.select('id', 'name', 'isActive')
            })

            return response.status(201).json(assignment)
        } catch (error) {
            console.error('Erreur lors de la création de l\'affectation par dépôt:', error)
            return response.status(500).json({ 
                message: "Erreur interne du serveur" 
            })
        }
    }

    async destroy({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            
            // Seuls les admins peuvent supprimer des affectations
            if (user.$original.role !== Role.ADMIN) {
                return response.status(403).json({ 
                    message: "Accès non autorisé" 
                })
            }

            const assignment = await DepotAssignment.find(params.id)
            if (!assignment) {
                return response.status(404).json({ 
                    message: "Affectation non trouvée" 
                })
            }

            // Désactiver l'affectation au lieu de la supprimer
            assignment.isActive = false
            await assignment.save()

            return response.json({ 
                message: "Affectation supprimée avec succès" 
            })
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'affectation par dépôt:', error)
            return response.status(500).json({ 
                message: "Erreur interne du serveur" 
            })
        }
    }

    async getDepotAssignments({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            
            // Seuls les admins peuvent voir les affectations d'un dépôt
            if (user.$original.role !== Role.ADMIN) {
                return response.status(403).json({ 
                    message: "Accès non autorisé" 
                })
            }

            const assignments = await DepotAssignment.query()
                .where('depot_id', params.depotId)
                .where('is_active', true)
                .preload('user', (query) => {
                    query.select('id', 'firstname', 'lastname', 'email', 'role')
                })
                .preload('depot', (query) => {
                    query.select('id', 'name', 'isActive')
                })

            return response.json(assignments)
        } catch (error) {
            console.error('Erreur lors de la récupération des affectations du dépôt:', error)
            return response.status(500).json({ 
                message: "Erreur interne du serveur" 
            })
        }
    }

    async getUserAssignments({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            
            // Seuls les admins peuvent voir les affectations d'un utilisateur
            if (user.$original.role !== Role.ADMIN) {
                return response.status(403).json({ 
                    message: "Accès non autorisé" 
                })
            }

            const assignments = await DepotAssignment.query()
                .where('user_id', params.userId)
                .where('is_active', true)
                .preload('user', (query) => {
                    query.select('id', 'firstname', 'lastname', 'email', 'role')
                })
                .preload('depot', (query) => {
                    query.select('id', 'name', 'isActive')
                })

            return response.json(assignments)
        } catch (error) {
            console.error('Erreur lors de la récupération des affectations de l\'utilisateur:', error)
            return response.status(500).json({ 
                message: "Erreur interne du serveur" 
            })
        }
    }
} 