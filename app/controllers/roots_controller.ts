

import Assignment from "#models/assignment"
import Root from "#models/root"
import { HttpContext } from "@adonisjs/core/http"

export default class RootsController {
    async index({ response }: HttpContext) {
        try {
            const roots = await Root.query().preload('commercialInitials')
            return response.json(roots)
        } catch (error) {
            console.log(error)
            return response.status(500).json({ message: "Internal server error" })
        }
    }

    async store({ request, response }: HttpContext) {
        try {
            const { name } = request.body()
            const isRoot = await Root.findBy('name', name)
            if (isRoot) {
                return response.status(400).json({ message: `Root ${name} existe déja` })
            }
            const root = await Root.create({ name })
            // let pattern = root.name.toUpperCase()
            // const assignment = await Assignment.create({ rootId: root.id, commercialInitialId: null, pattern })
            return response.status(201).json(assignment)
        } catch (error) {
            console.log(error)
            return response.status(500).json({ message: "Internal server error" })
        }
    }

    async show({ params, response }: HttpContext) {
        try {
            const { id } = params
            const root = await Root.find(id)
            return response.json(root)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async update({ params, request, response }: HttpContext) {
        try {
            const { id } = params
            const { name } = request.body()
            const root = await Root.find(id)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            const isRoot = await Root.findBy('name', name)
            if (isRoot) {
                return response.status(400).json({ message: `Root ${name} existe déja` })
            }
            root.name = name.toUpperCase()
            await root.save()
            return response.json(root)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async destroy({ params, response }: HttpContext) {
        try {
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