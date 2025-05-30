/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// import ConfirmationsController from '#controllers/confirmations_controller'

const UsersController = () => import('#controllers/users_controller')
const AuthController = () => import('#controllers/auth_controller')
const SageInvoicesController = () => import('#controllers/sage_invoices_controller')
const DepotsController = () => import('#controllers/depots_controller')
const ProcessDeliveriesController = () => import('#controllers/process_deliveries_controller')
const DriversController = () => import('#controllers/drivers_controller')
const InvoicesController = () => import('#controllers/invoices_controller')
const BlController = () => import('#controllers/bls_controller')


router.post('/login', [AuthController, 'login']).prefix('api')
router.post('/logout', [AuthController, 'logout']).prefix('api').use([middleware.auth()])

router.group(() => {
    router.get('/invoice', [SageInvoicesController, 'invoice_xml_to_json'])
    router.get('/invoice/:number', [InvoicesController, 'getInvoiceByNumber'])
    router.post('/refresh', [AuthController, 'refresh'])
    router.post('/process-delivery', [ProcessDeliveriesController, 'processDeliveries'])
    router.post('/confirm-bl', [ProcessDeliveriesController, 'confirmBl'])
    router.get('/bls/user/date', [BlController, 'getBlbyUserAndDate'])
    router.get('/bls/max-quantite/:invoiceId/:blId', [BlController, 'getMaxQuantite'])
    router.get('/invoices/date', [InvoicesController, 'get_invoice_by_date'])
    router.get('/invoices/:invoice_number', [InvoicesController, 'get_invoice_by_invoice_number'])
    router.get('/invoices/:invoice_number/bls', [InvoicesController, 'getBls'])
    router.post('/confirm-delivery', [ProcessDeliveriesController, 'confirmBl'])
}).prefix('api')
    .use([middleware.auth()])


// admin routes
router.group(() => {
    router.resource('/users', UsersController)
    router.resource('/depots', DepotsController)
    router.resource('/drivers', DriversController)
    router.resource('/invoices', InvoicesController)
    router.resource('/bls', BlController)
}).prefix('api')


