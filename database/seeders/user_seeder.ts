import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import { Role } from '../../app/enum/index.js'
export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        firstname: 'Omar',
        lastname: 'Diallo',
        phone: "773662180",
        depotId: 1,
        role: Role.MAGASINIER,
        email: 'virk@adonisjs.com',
        password: 'passer',
        isActive: true,
      },
      {
        firstname: 'Serigne',
        lastname: 'Saliou',
        phone: "781734029",
        depotId: 1,
        role: Role.CONTROLEUR,
        email: 'serigne@adonisjs.com',
        password: 'passer',
        isActive: true,
      }
    ])
  }

}
