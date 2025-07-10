import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Depot from '#models/depot'
export default class extends BaseSeeder {
  async run() {
    await Depot.createMany([
      {
        name: 'GESTION_ZIGUINCHOR',
      },
      {
        name: 'GESTION_PIKINE',
      },
      {
        name: 'GESTION_CMGA_TH2021',
      },
      {
        name: 'GESTION_CMGA_KH2021',
      },
      {
        name: 'GESTION_CMGA_FD2021',
      },
      {
        name: 'GESTION_CMGA_KLK2023',
      },
      {
        name: 'GESTION_CMGA_2020',
      }
    ])
  }
}