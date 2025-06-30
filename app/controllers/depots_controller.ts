import Depot from '#models/depot'
import { depotValidator } from '#validators/depot'
import { HttpContext } from '@adonisjs/core/http'

export default class DepotsController {
    public async index() {
        const depots = await Depot.all()
        return depots
    }
    public async show(ctx: HttpContext) {
        const { id } = ctx.params
        const depot = await Depot.find(id)
        return depot
    }

    public async store({request,response}: HttpContext) {
        try {
            const validatedData = await request.validateUsing(depotValidator)
            const depot = await Depot.create(validatedData)
            return response.status(201).json(depot)
        } catch (error) {
            return response.status(422).json({ message: 'Erreur de validation', errors: error.messages })
        }
    }

    public async update(ctx: HttpContext) {
        try {
            const { id } = ctx.params
            const data = await ctx.request.validateUsing(depotValidator)
            
            const depot = await Depot.findOrFail(id)
            
            // Mise à jour de tous les champs
            depot.merge({
                name: data.name,
                needDoubleCheck: data.needDoubleCheck,
                isActive: data.isActive  // Ajout de la mise à jour de isActive
            })
            
            await depot.save()
            
            return ctx.response.json(depot)
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error)
            return ctx.response.status(500).json({
                message: 'Erreur lors de la mise à jour du dépôt',
                error: error.message
            })
        }
    }
    public async destroy(ctx: HttpContext) {
        const { id } = ctx.params
        const depot = await Depot.findOrFail(id)
        await depot.delete()
        return { message: 'Depot deleted' }
    }
}
