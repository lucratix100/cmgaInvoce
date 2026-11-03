import User from '#models/user'
import { userValidatorStore, userValidatorUpdate } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import { Role } from '../enum/index.js'
import UserActivityService from '#services/user_activity_service'
import NotificationService from '#services/notification_service'
import PasswordTokenService from '#services/password_token_service'
import { randomBytes } from 'node:crypto'

export default class UsersController {
    private readonly sensitiveRoles = [Role.ADMIN, Role.FACTURATION, Role.COMMERCIAL_ADMIN]

    private getUserDisplayName(user?: User | null) {
        if (!user) return 'Utilisateur inconnu'
        return `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.phone || user.email || `Utilisateur #${user.id}`
    }

    /** Erreurs Postgres unique → messages champ par champ pour le dialog */
    private mapUniqueConstraintError(error: any): Record<string, string[]> | null {
        const message = String(error?.message || error?.detail || '')
        const constraint = String(error?.constraint || '')

        if (
            constraint === 'users_phone_unique' ||
            message.includes('users_phone_unique') ||
            (message.includes('duplicate key') && message.includes('phone'))
        ) {
            return { phone: ['Ce numéro de téléphone est déjà utilisé'] }
        }

        if (
            constraint === 'users_email_unique' ||
            message.includes('users_email_unique') ||
            (message.includes('duplicate key') && message.includes('email'))
        ) {
            return { email: ['Cet email est déjà utilisé'] }
        }

        return null
    }

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

    async store({ request, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const data = await request.validateUsing(userValidatorStore)

            if (currentUser.role !== Role.ADMIN && data.role === Role.FACTURATION) {
                return response.status(403).json({
                    success: false,
                    error: 'Seul l’administrateur peut créer un utilisateur Facturation'
                })
            }

            if (data.role !== Role.ADMIN && data.role !== Role.RECOUVREMENT && data.role !== Role.AGENT_COMMERCIAL && data.role !== Role.COMMERCIAL_ADMIN && data.role !== Role.FACTURATION) {
                if (!data.depotId) {
                    return response.status(400).json({
                        success: false,
                        error: 'Le depotId est requis pour les rôles magasiniers, controleurs et chefs de depot'
                    })
                }
            }

            // Compte inactif jusqu'à définition du mot de passe via le lien email
            const user = await User.create({
                ...data,
                password: randomBytes(32).toString('hex'),
                isActive: false,
            })

            let inviteSent = false
            try {
                await PasswordTokenService.sendInvite(user)
                inviteSent = true
            } catch (mailError) {
                console.error("Erreur envoi invitation:", mailError)
            }

            await UserActivityService.logActivity(
                Number(currentUser.id),
                UserActivityService.ACTIONS.CREATE_USER,
                currentUser.role,
                undefined,
                {
                    createdUserId: user.id,
                    createdUserEmail: user.email,
                    createdUserRole: user.role,
                    inviteSent,
                }
            )

            if (this.sensitiveRoles.includes(user.role)) {
                await NotificationService.notifyRole(
                    Role.ADMIN,
                    'Utilisateur sensible créé',
                    `${this.getUserDisplayName(currentUser)} a créé ${this.getUserDisplayName(user)} avec le rôle ${user.role}`,
                    undefined,
                    {
                        createdUserId: user.id,
                        createdUserEmail: user.email,
                        createdUserRole: user.role,
                        type: 'sensitive_user_created'
                    }
                )
            }

            return response.status(201).json({
                success: true,
                message: inviteSent
                    ? 'Utilisateur créé (inactif). Un email a été envoyé pour définir le mot de passe et activer le compte.'
                    : 'Utilisateur créé (inactif), mais l’email d’invitation n’a pas pu être envoyé.',
                user,
                inviteSent,
            })
        } catch (error) {
            console.error('Erreur de création:', error)

            if (error.messages) {
                return response.status(422).json({
                    success: false,
                    error: error.messages,
                })
            }

            const uniqueErrors = this.mapUniqueConstraintError(error)
            if (uniqueErrors) {
                return response.status(409).json({
                    success: false,
                    error: uniqueErrors,
                })
            }

            return response.status(500).json({
                success: false,
                error: {
                    general: ["Erreur lors de la création de l'utilisateur"],
                },
            })
        }
    }

    async update({ request, response, params, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const data = await request.validateUsing(userValidatorUpdate)
            // return console.log('data', data)
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
            const previousRole = user.role

            if (currentUser.role !== Role.ADMIN && data.role === Role.FACTURATION) {
                return response.status(403).json({
                    success: false,
                    error: 'Seul l’administrateur peut attribuer le rôle Facturation'
                })
            }

            // Supprimer confirmPassword des données avant la mise à jour
            const { confirmPassword, ...userData } = data
            user.merge(userData)
            await user.save()

            // Enregistrer l'activité de modification d'utilisateur
            await UserActivityService.logActivity(
                Number(currentUser.id),
                UserActivityService.ACTIONS.UPDATE_USER,
                currentUser.role,
                undefined,
                {
                    updatedUserId: user.id,
                    updatedUserEmail: user.email,
                    updatedUserRole: user.role
                }
            )

            if (this.sensitiveRoles.includes(user.role) || this.sensitiveRoles.includes(previousRole)) {
                await NotificationService.notifyRole(
                    Role.ADMIN,
                    'Utilisateur sensible modifié',
                    `${this.getUserDisplayName(currentUser)} a modifié ${this.getUserDisplayName(user)} (${previousRole} vers ${user.role})`,
                    undefined,
                    {
                        updatedUserId: user.id,
                        updatedUserEmail: user.email,
                        previousRole,
                        updatedUserRole: user.role,
                        type: 'sensitive_user_updated'
                    }
                )
            }

            return response.json(user)
        } catch (error) {
            console.log('error', error)

            if (error.messages) {
                return response.status(422).json({
                    success: false,
                    error: error.messages,
                })
            }

            const uniqueErrors = this.mapUniqueConstraintError(error)
            if (uniqueErrors) {
                return response.status(409).json({
                    success: false,
                    error: uniqueErrors,
                })
            }

            return response.status(500).json({
                success: false,
                error: {
                    general: ["Erreur lors de la modification de l'utilisateur"],
                },
            })
        }
    }

    async resendInvite({ params, response, auth }: HttpContext) {
        try {
            await auth.authenticate()
            const user = await User.find(params.id)

            if (!user) {
                return response.status(404).json({
                    success: false,
                    error: 'Utilisateur introuvable',
                })
            }

            if (!user.email) {
                return response.status(400).json({
                    success: false,
                    error: "Cet utilisateur n'a pas d'email",
                })
            }

            // Si déjà actif → lien de reset ; sinon → invitation d'activation
            if (user.isActive) {
                await PasswordTokenService.sendReset(user)
                return response.ok({
                    success: true,
                    message: 'Email de réinitialisation du mot de passe envoyé.',
                })
            }

            await PasswordTokenService.sendInvite(user)
            return response.ok({
                success: true,
                message: "Email d'invitation renvoyé. Le destinataire pourra définir son mot de passe et activer son compte.",
            })
        } catch (error: any) {
            console.error('Erreur renvoi invitation:', error)
            const detail =
                error?.code === 'SMTP_NOT_CONFIGURED'
                    ? error.message
                    : error?.response || error?.message || "Impossible d'envoyer l'email"
            return response.status(500).json({
                success: false,
                error: detail,
            })
        }
    }

    async destroy({ params, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const user = await User.find(params.id)
            
            if (!user) {
                return response.status(404).json({ error: 'User not found' })
            }

            await user.delete()

            // Enregistrer l'activité de suppression d'utilisateur
            await UserActivityService.logActivity(
                Number(currentUser.id),
                UserActivityService.ACTIONS.DELETE_USER,
                currentUser.role,
                undefined,
                {
                    deletedUserId: user.id,
                    deletedUserEmail: user.email,
                    deletedUserRole: user.role
                }
            )

            return response.json({ message: 'Utilisateur supprimé avec succès' })
        } catch (error) {
            return response.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' })
        }
    }
}