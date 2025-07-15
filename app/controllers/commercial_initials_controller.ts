import type { HttpContext } from '@adonisjs/core/http'
import CommercialInitial from '#models/commercial_initial'

export default class CommercialInitialsController {
    async index({ response }: HttpContext) {
        try {
            const commercialInitials = await CommercialInitial.query().orderBy('created_at', 'desc').where('is_active', true)
            return response.json(commercialInitials)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async store({ request, response }: HttpContext) {
        try {
            const { name, rootId } = request.body()
            const isCommercialInitial = await CommercialInitial.findBy('name', name)
            if (isCommercialInitial) {
                return response.status(400).json({ message: `Commercial initial ${name} existe déja` })
            }
            const commercialInitial = await CommercialInitial.create({ name: name.toUpperCase(), rootId })
            return response.json(commercialInitial)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async show({ params, response }: HttpContext) {
        try {
            const { id } = params

            const commercialInitial = await CommercialInitial.query().where('id', id).where('is_active', true)
            return response.json(commercialInitial)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async update({ params, request, response }: HttpContext) {
        try {
            const { id } = params
            const { name } = request.body()
            const isCommercialInitial = await CommercialInitial.findBy('name', name)
            if (isCommercialInitial) {
                return response.status(400).json({ message: `Commercial initial ${name} existe déja` })
            }
            const commercialInitial = await CommercialInitial.find(id)
            if (!commercialInitial) {
                return response.status(404).json({ message: "Commercial initial not found" })
            }
            commercialInitial.name = name.toUpperCase()
            await commercialInitial.save()
            return response.json(commercialInitial)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async destroy({ params, response }: HttpContext) {
        try {
            const { id } = params
            const commercialInitial = await CommercialInitial.find(id)
            if (!commercialInitial) {
                return response.status(404).json({ message: "Commercial initial not found" })
            }
            await commercialInitial.delete()
            return response.json({ message: "Commercial initial deleted successfully" })
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }

}
