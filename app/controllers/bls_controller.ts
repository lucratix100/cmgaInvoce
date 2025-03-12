import { HttpContext } from "@adonisjs/core/http"
import Bl from "#models/bl"

export default class BlsController {
    async index({ response }: HttpContext) {
        const bls = await Bl.all()
        return response.status(200).json(bls)
    }
    async show({ response, params }: HttpContext) {
        const bl = await Bl.find(params.id)
        return response.status(200).json(bl)
    }
    async store({ request, response }: HttpContext) {
        const { invoiceId, products, driverId } = request.body()
        const bl = await Bl.create({ invoiceId, products, driverId })
        return response.status(201).json(bl)
    }
    // async update({ request params }: HttpContext) {
    //     const { number, date, origin, destination, products } = request.body()
    //     const bl = await Bl.find(params.id)
    //     bl.number = number
    //     bl.date = date
    //     bl.origin = origin
    //     bl.destination = destination
    //     bl.products = products
    // }
}