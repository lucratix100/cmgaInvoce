import type { HttpContext } from '@adonisjs/core/http'
import CommercialInitial from '#models/commercial_initial'
import Root from '#models/root'
import { Role } from '../enum/index.js'

export default class CommercialInitialsController {
    private readonly rootManagerRoles = [Role.COMMERCIAL_ADMIN, Role.ADMIN_DETAILLANT]

    private canManageRoot(root: Root, role: Role) {
        return role === Role.ADMIN || root.visibleToRoles?.includes(role)
    }

    private async ensureVisibleRoot(rootId: number, role: Role) {
        const root = await Root.find(rootId)
        if (!root) return null
        return this.canManageRoot(root, role) ? root : null
    }

    async index({ response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (![Role.ADMIN, ...this.rootManagerRoles].includes(user.role)) {
                return response.status(403).json({ message: "Accès non autorisé aux suffixes" })
            }

            const commercialInitials = await CommercialInitial.query()
                .preload('root')
                .orderBy('created_at', 'desc')
                .where('is_active', true)

            return response.json(
                user.role === Role.ADMIN
                    ? commercialInitials
                    : commercialInitials.filter((initial) => initial.root && this.canManageRoot(initial.root, user.role))
            )
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async store({ request, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            const { name, rootId } = request.body()
            const root = await this.ensureVisibleRoot(Number(rootId), user.role)
            if (!root) {
                return response.status(403).json({ message: "Racine non autorisée pour ce suffixe" })
            }

            const normalizedName = String(name || '').trim().toUpperCase()
            const isCommercialInitial = await CommercialInitial.query()
                .where('root_id', root.id)
                .where('name', normalizedName)
                .where('is_active', true)
                .first()
            if (isCommercialInitial) {
                return response.status(400).json({ message: `Commercial initial ${normalizedName} existe déja` })
            }
            const commercialInitial = await CommercialInitial.create({ name: normalizedName, rootId: root.id })
            return response.json(commercialInitial)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async show({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            const { id } = params

            const commercialInitial = await CommercialInitial.query()
                .where('id', id)
                .where('is_active', true)
                .preload('root')
                .first()

            if (!commercialInitial) {
                return response.status(404).json({ message: "Commercial initial not found" })
            }
            if (!commercialInitial.root || !this.canManageRoot(commercialInitial.root, user.role)) {
                return response.status(403).json({ message: "Accès non autorisé à ce suffixe" })
            }
            return response.json(commercialInitial)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async update({ params, request, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            const { id } = params
            const { name } = request.body()
            const commercialInitial = await CommercialInitial.query()
                .where('id', id)
                .preload('root')
                .first()
            if (!commercialInitial) {
                return response.status(404).json({ message: "Commercial initial not found" })
            }
            if (!commercialInitial.root || !this.canManageRoot(commercialInitial.root, user.role)) {
                return response.status(403).json({ message: "Accès non autorisé à ce suffixe" })
            }

            const normalizedName = String(name || '').trim().toUpperCase()
            const isCommercialInitial = await CommercialInitial.query()
                .where('root_id', commercialInitial.rootId)
                .where('name', normalizedName)
                .where('is_active', true)
                .whereNot('id', id)
                .first()
            if (isCommercialInitial) {
                return response.status(400).json({ message: `Commercial initial ${normalizedName} existe déja` })
            }

            commercialInitial.name = normalizedName
            await commercialInitial.save()
            return response.json(commercialInitial)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async destroy({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            const { id } = params
            const commercialInitial = await CommercialInitial.query()
                .where('id', id)
                .preload('root')
                .first()
            if (!commercialInitial) {
                return response.status(404).json({ message: "Commercial initial not found" })
            }
            if (!commercialInitial.root || !this.canManageRoot(commercialInitial.root, user.role)) {
                return response.status(403).json({ message: "Accès non autorisé à ce suffixe" })
            }
            commercialInitial.isActive = false
            await commercialInitial.save()
            return response.json({ message: "Commercial initial deleted successfully" })
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }

}
