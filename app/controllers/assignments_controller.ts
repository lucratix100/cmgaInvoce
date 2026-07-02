import type { HttpContext } from '@adonisjs/core/http'
import Assignment from '#models/assignment'
import Root from '#models/root'
import CommercialInitial from '#models/commercial_initial'
import User from '#models/user'
import { Role } from '../enum/index.js'

export default class AssignmentsController {
    private readonly rootManagerRoles = [Role.COMMERCIAL_ADMIN, Role.ADMIN_DETAILLANT]

    private canManageRoot(root: Root, role: Role) {
        return role === Role.ADMIN || root.visibleToRoles?.includes(role)
    }

    private expectedTargetRole(adminRole: Role) {
        if (adminRole === Role.COMMERCIAL_ADMIN) return Role.AGENT_COMMERCIAL
        if (adminRole === Role.ADMIN_DETAILLANT) return Role.COMMERCIAL_DETAILLANT
        return null
    }

    private canAssignToUser(adminRole: Role, targetRole: Role) {
        const expectedRole = this.expectedTargetRole(adminRole)
        return adminRole === Role.ADMIN || expectedRole === targetRole
    }

    async index({ response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            if (![Role.ADMIN, ...this.rootManagerRoles].includes(currentUser.role)) {
                return response.status(403).json({ message: "Accès non autorisé aux affectations" })
            }

            const assignments = await Assignment.query()
                .preload('root')
                .preload('commercial_intials')
                .preload('users')
                .orderBy('created_at', 'desc')
                .where('is_active', true)

            if (currentUser.role === Role.ADMIN) {
                return response.json(assignments)
            }

            const expectedRole = this.expectedTargetRole(currentUser.role)
            return response.json(
                assignments.filter((assignment) =>
                    assignment.root &&
                    this.canManageRoot(assignment.root, currentUser.role) &&
                    assignment.users?.role === expectedRole
                )
            )
        } catch (error) {
            console.log(error)
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async store({ request, response, auth }: HttpContext) {
        const currentUser = await auth.authenticate()
        const { rootId, commercialInitialId, userId } = request.body()
        // return console.log(rootId, commercialInitialId, userId)
        try {
            const root = await Root.find(rootId)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            if (!this.canManageRoot(root, currentUser.role)) {
                return response.status(403).json({ message: "Racine non autorisée pour cet administrateur" })
            }

            const targetUser = await User.find(userId)
            if (!targetUser) {
                return response.status(404).json({ message: "Utilisateur introuvable" })
            }
            if (!this.canAssignToUser(currentUser.role, targetUser.role)) {
                return response.status(403).json({ message: "Utilisateur cible non autorisé pour ce type d'affectation" })
            }

            const commercialInitial = commercialInitialId
                ? await CommercialInitial.find(commercialInitialId)
                : null
            if (commercialInitial && Number(commercialInitial.rootId) !== Number(root.id)) {
                return response.status(422).json({ message: "Le suffixe ne correspond pas à la racine sélectionnée" })
            }

            if (!commercialInitial) {
                let pattern = root.name
                const assignment = await Assignment.create({ rootId, commercialInitialId: null, pattern: pattern.toUpperCase(), userId, isActive: true })
                return response.status(201).json(assignment)
            }

            let pattern = (root.name + commercialInitial.name).toUpperCase()
            const assignment = await Assignment.create({ rootId, commercialInitialId, pattern, userId, isActive: true })
            return response.status(201).json(assignment)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async show({ params, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const { id } = params
            const assignment = await Assignment.query()
                .where('id', id)
                .where('is_active', true)
                .preload('root')
                .preload('users')
                .first()
            if (!assignment) {
                return response.status(404).json({ message: "Assignment not found" })
            }
            if (!assignment.root || !this.canManageRoot(assignment.root, currentUser.role)) {
                return response.status(403).json({ message: "Affectation non autorisée" })
            }
            return response.json(assignment)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async update({ params, request, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const { id } = params
            const data = request.body()
            const assignment = await Assignment.find(id)
            if (!assignment) {
                return response.status(404).json({ message: "Assignment not found" })
            }
            const root = await Root.find(data.rootId)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            if (!this.canManageRoot(root, currentUser.role)) {
                return response.status(403).json({ message: "Racine non autorisée pour cet administrateur" })
            }

            const targetUser = await User.find(data.userId ?? assignment.userId)
            if (!targetUser) {
                return response.status(404).json({ message: "Utilisateur introuvable" })
            }
            if (!this.canAssignToUser(currentUser.role, targetUser.role)) {
                return response.status(403).json({ message: "Utilisateur cible non autorisé pour ce type d'affectation" })
            }

            const commercialInitial = data.commercialInitialId
                ? await CommercialInitial.find(data.commercialInitialId)
                : null
            if (commercialInitial && Number(commercialInitial.rootId) !== Number(root.id)) {
                return response.status(422).json({ message: "Le suffixe ne correspond pas à la racine sélectionnée" })
            }

            if (!commercialInitial) {
                assignment.pattern = root?.name.toUpperCase()
            } else {
                assignment.pattern = (root?.name + commercialInitial?.name).toUpperCase()
            }
            assignment.rootId = data.rootId
            assignment.commercialInitialId = data.commercialInitialId
            assignment.userId = targetUser.id ? Number(targetUser.id) : assignment.userId
            await assignment.save()
            return response.json(assignment)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async destroy({ params, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const { id } = params
            const assignment = await Assignment.query()
                .where('id', id)
                .preload('root')
                .first()
            if (!assignment) {
                return response.status(404).json({ message: "Assignment not found" })
            }
            if (!assignment.root || !this.canManageRoot(assignment.root, currentUser.role)) {
                return response.status(403).json({ message: "Affectation non autorisée" })
            }
            await assignment.delete()
            return response.json({ message: "Assignment deleted successfully" })
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async getAssignmentByRootId({ params, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const { id } = params
            const root = await Root.find(id)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            if (!this.canManageRoot(root, currentUser.role)) {
                return response.status(403).json({ message: "Racine non autorisée" })
            }

            const assignment = await Assignment.findBy('rootId', id)
            return response.json(assignment)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
}