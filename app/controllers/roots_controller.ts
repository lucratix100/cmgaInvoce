
import Root from "#models/root"
import { HttpContext } from "@adonisjs/core/http"
import { Role } from "../enum/index.js"

export default class RootsController {
    private readonly rootManagerRoles = [Role.COMMERCIAL_ADMIN, Role.ADMIN_DETAILLANT]

    private normalizeVisibleRoles(roles?: string[] | null) {
        const allowedRoles = new Set(this.rootManagerRoles)
        return (roles || [])
            .filter((role) => allowedRoles.has(role as Role))
            .map((role) => role as Role)
    }

    private async queryVisibleRoots(role: Role) {
        const query = Root.query()
            .preload('commercialInitials', (commercialInitialsQuery) => {
                commercialInitialsQuery.where('is_active', true).orderBy('name', 'asc')
            })
            .orderBy('created_at', 'desc')

        if (role === Role.ADMIN) {
            return query
        }

        if (!this.rootManagerRoles.includes(role)) {
            return null
        }

        return query.whereRaw('visible_to_roles @> ?::jsonb', [JSON.stringify([role])])
    }

    private canManageRoot(root: Root, role: Role) {
        return role === Role.ADMIN || root.visibleToRoles?.includes(role)
    }

    async index({ response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            const query = await this.queryVisibleRoots(user.role)
            if (!query) {
                return response.status(403).json({ message: "Accès non autorisé aux racines" })
            }

            const roots = await query
            return response.json(roots)
        } catch (error) {
            console.log(error)
            return response.status(500).json({ message: "Internal server error" })
        }
    }

    async store({ request, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (user.role !== Role.ADMIN) {
                return response.status(403).json({ message: "Seul l'ADMIN peut créer une racine" })
            }

            const { name, visibleToRoles } = request.body()
            const normalizedName = String(name || '').trim().toUpperCase()
            const normalizedVisibleRoles = this.normalizeVisibleRoles(visibleToRoles)
            if (normalizedVisibleRoles.length === 0) {
                return response.status(422).json({ message: "Sélectionnez au moins un rôle visible pour cette racine" })
            }
            const isRoot = await Root.findBy('name', normalizedName)
            if (isRoot) {
                return response.status(400).json({ message: `Root ${normalizedName} existe déja` })
            }
            const root = await Root.create({
                name: normalizedName,
                visibleToRoles: normalizedVisibleRoles,
            })
            return response.status(201).json(root)
        } catch (error) {
            console.log(error)
            return response.status(500).json({ message: "Internal server error" })
        }
    }

    async show({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            const { id } = params
            const root = await Root.find(id)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            if (!this.canManageRoot(root, user.role)) {
                return response.status(403).json({ message: "Accès non autorisé à cette racine" })
            }
            return response.json(root)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }

    async update({ params, request, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (user.role !== Role.ADMIN) {
                return response.status(403).json({ message: "Seul l'ADMIN peut modifier une racine" })
            }

            const { id } = params
            const { name, visibleToRoles } = request.body()
            const root = await Root.find(id)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            const normalizedName = String(name || '').trim().toUpperCase()
            const isRoot = await Root.query()
                .where('name', normalizedName)
                .whereNot('id', id)
                .first()
            if (isRoot) {
                return response.status(400).json({ message: `Root ${normalizedName} existe déja` })
            }
            root.name = normalizedName
            const normalizedVisibleRoles = this.normalizeVisibleRoles(visibleToRoles ?? root.visibleToRoles)
            if (normalizedVisibleRoles.length === 0) {
                return response.status(422).json({ message: "Sélectionnez au moins un rôle visible pour cette racine" })
            }
            root.visibleToRoles = normalizedVisibleRoles
            await root.save()
            return response.json(root)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async destroy({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (user.role !== Role.ADMIN) {
                return response.status(403).json({ message: "Seul l'ADMIN peut supprimer une racine" })
            }

            const { id } = params
            const root = await Root.find(id)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            await root.delete()
            return response.json({ message: "Root deleted successfully" })
        } catch (error) {
            // console.log(error)
            return response.status(500).json({ message: "Internal server error" })

        }
    }


}