import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Driver from '#models/driver'
export default class extends BaseSeeder {
  async run() {
    await Driver.createMany([
      {
        firstname: 'Diabel',
        lastname: 'Diop',
        phone: "773662187",
        isActive: true,
      },
      {
        firstname: 'Mouhamed',
        lastname: 'Sané',
        phone: "765467909",
        isActive: true,
      },
    ])
  }
}