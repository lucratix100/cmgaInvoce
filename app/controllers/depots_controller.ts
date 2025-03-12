import Depot from '#models/depot'
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
    public async store(ctx: HttpContext) {
        const { name, needDoubleCheck } = ctx.request.body()
        const depot = await Depot.create({ name, needDoubleCheck })
        return depot
    }
    public async update(ctx: HttpContext) {
        const { id } = ctx.params
        const { name, needDoubleCheck } = ctx.request.body()
        const depot = await Depot.find(id)
        if (!depot) {
            return ctx.response.status(404).json({ message: 'Depot not found' })
        }
        depot.name = name
        depot.needDoubleCheck = needDoubleCheck
        await depot.save()
        return depot
    }
    public async destroy(ctx: HttpContext) {
        const { id } = ctx.params
        const depot = await Depot.find(id)
        if (!depot) {
            return ctx.response.status(404).json({ message: 'Depot not found' })
        }
        await depot.delete()
        return { message: 'Depot deleted' }
    }
}
