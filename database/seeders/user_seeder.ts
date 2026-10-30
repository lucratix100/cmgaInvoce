import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import { Role } from '../../app/enum/index.js'

export default class extends BaseSeeder {
  async run() {
    // Compte de connexion email (minimum requis)
    await User.updateOrCreate(
      { email: 'admin@cmga.sn' },
      {
        firstname: 'Admin',
        lastname: 'CMGA',
        phone: '770000001',
        depotId: null,
        role: Role.ADMIN,
        email: 'admin@cmga.sn',
        password: 'passer',
        isActive: true,
      }
    )
  }
}
