import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Depot from '#models/depot'
export default class extends BaseSeeder {
  async run() {
    await Depot.createMany([
      {
        name: 'CMGA',

      },
    ])
  }
}