/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import InvoicesController from '#controllers/invoices_controller'
import BlController from '#controllers/bls_controller'
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import DriversController from '#controllers/drivers_controller'
// import ConfirmationsController from '#controllers/confirmations_controller'

const UsersController = () => import('#controllers/users_controller')
const AuthController = () => import('#controllers/auth_controller')
const SageInvoicesController = () => import('#controllers/sage_invoices_controller')
const DepotsController = () => import('#controllers/depots_controller')
const ProcessDeliveriesController = () => import('#controllers/process_deliveries_controller')



router.group(() => {
    router.post('/login', [AuthController, 'login'])
    router.post('/logout', [AuthController, 'logout'])
}).prefix('api')

// custom routes
router.group(() => {
    router.get('/invoice', [SageInvoicesController, 'invoice_xml_to_json'])
    router.get('/invoice/:number', [InvoicesController, 'getInvoiceByNumber'])
    router.post('/refresh', [AuthController, 'refresh'])
    router.post('/process-delivery', [ProcessDeliveriesController, 'processDeliveries'])
    router.post('/confirm-delivery', [ProcessDeliveriesController, 'confirmBl'])
}).prefix('api').use([middleware.auth()])

// admin routes
router.group(() => {
    router.resource('/users', UsersController)
    router.resource('/depots', DepotsController)
    router.resource('/drivers', DriversController)
    router.resource('/invoices', InvoicesController)
    router.resource('/bls', BlController)
}).prefix('api').use([middleware.auth()])


