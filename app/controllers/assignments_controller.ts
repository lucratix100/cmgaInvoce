import type { HttpContext } from '@adonisjs/core/http'
import Assignment from '#models/assignment'
import Root from '#models/root'
import CommercialInitial from '#models/commercial_initial'

export default class AssignmentsController {
    async index({ response }: HttpContext) {
        try {
            const assignments = await Assignment.query().preload('root').preload('commercial_intials').preload('users').orderBy('created_at', 'desc').where('is_active', true)
            return response.json(assignments)
        } catch (error) {
            console.log(error)
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async store({ request, response }: HttpContext) {
        const { rootId, commercialInitialId, userId } = request.body()
        // return console.log(rootId, commercialInitialId, userId)
        try {
            const root = await Root.find(rootId)
            if (!root) {
                return response.status(404).json({ message: "Root not found" })
            }
            const commercialInitial = await CommercialInitial.find(commercialInitialId)
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
    async show({ params, response }: HttpContext) {
        try {
            const { id } = params
            const assignment = await Assignment.query().where('id', id).where('is_active', true)
            return response.json(assignment)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async update({ params, request, response }: HttpContext) {
        try {
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
            const commercialInitial = await CommercialInitial.find(data.commercialInitialId)
            // if (!commercialInitial) {
            //     return response.status(404).json({ message: "Commercial initial not found" })
            // }
            if (!commercialInitial) {
                assignment.pattern = root?.name.toUpperCase()
            } else {
                assignment.pattern = (root?.name + commercialInitial?.name).toUpperCase()
            }
            assignment.rootId = data.rootId
            assignment.commercialInitialId = data.commercialInitialId
            await assignment.save()
            return response.json(assignment)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async destroy({ params, response }: HttpContext) {
        try {
            const { id } = params
            const assignment = await Assignment.find(id)
            if (!assignment) {
                return response.status(404).json({ message: "Assignment not found" })
            }
            await assignment.delete()
            return response.json({ message: "Assignment deleted successfully" })
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
    async getAssignmentByRootId({ params, response }: HttpContext) {
        try {
            const { id } = params
            const assignment = await Assignment.findBy('rootId', id)
            return response.json(assignment)
        } catch (error) {
            return response.status(500).json({ message: "Internal server error" })
        }
    }
}