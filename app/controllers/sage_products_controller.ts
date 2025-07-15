import Product from '#models/product'
import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'

export default class SageProductsController {
    async index({ response }: HttpContext) {
        try {
            // Lecture du fichier CSV
            const productsCsv = await readFile('database/sql-server/all_products.csv', 'utf8')

            // Conversion du CSV en tableau de données
            const lines = productsCsv.split('\n')
            const productsToInsert = lines
                .filter((line) => line.trim()) // Ignorer les lignes vides
                .map((line) => {
                    const [reference, name] = line.split(';')
                    return {
                        reference: reference.trim(),
                        name: name.trim(),
                        img_url: 'default.jpg', // Valeur par défaut
                        quantity: 0, // Valeur par défaut
                        state: true, // Valeur par défaut
                    }
                })

            // Insertion des produits en lot
            await Product.createMany(productsToInsert)

            return response.status(200).json({
                message: 'Produits importés avec succès',
                count: productsToInsert.length,
            })
        } catch (error) {
            return response.status(500).json({
                error: "Erreur lors de l'importation des produits",
                details: error.message,
            })
        }
    }
}
