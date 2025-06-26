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
import AutoSwagger from "adonis-autoswagger";
import swagger from "#config/swagger";

// import ConfirmationsController from '#controllers/confirmations_controller'

const UsersController = () => import('#controllers/users_controller')
const AuthController = () => import('#controllers/auth_controller')
// const SageInvoicesController = () => import('#controllers/sage_invoices_controller')
const DepotsController = () => import('#controllers/depots_controller')
const ProcessDeliveriesController = () => import('#controllers/process_deliveries_controller')
const DriversController = () => import('#controllers/drivers_controller')
const InvoicesController = () => import('#controllers/invoices_controller')
const AssignmentsController = () => import('#controllers/assignments_controller')
const RootsController = () => import('#controllers/roots_controller')
const CommercialInitialsController = () => import('#controllers/commercial_initials_controller')
const BlController = () => import('#controllers/bls_controller')
const PaymentsController = () => import('#controllers/payments_controller')
const InvoiceRemindersController = () => import('#controllers/invoice_reminders_controller')


router.post('/login', [AuthController, 'login']).prefix('api')
router.post('/logout', [AuthController, 'logout']).prefix('api').use([middleware.auth()])
router.get("/swagger", async () => {
    return AutoSwagger.default.docs(router.toJSON(), swagger);
});

// Renders Swagger-UI and passes YAML-output of /swagger
router.get("/docs", async () => {
    return AutoSwagger.default.ui("/swagger", swagger);
    // return AutoSwagger.default.scalar("/swagger"); to use Scalar instead. If you want, you can pass proxy url as second argument here.
    // return AutoSwagger.default.rapidoc("/swagger", "view"); to use RapiDoc instead (pass "view" default, or "read" to change the render-style)
});

router.group(() => {
    // router.get('/invoice', [SageInvoicesController, 'invoice_xml_to_json'])
    router.get('/assignment/:id/root', [AssignmentsController, 'getAssignmentByRootId'])
    router.get('/users/recouvrement', [UsersController, 'getRecouvrementUsers'])
    router.get('/invoice/:number', [InvoicesController, 'getInvoiceByNumber'])
    router.patch('/invoice/:invoice_number', [InvoicesController, 'updateInvoiceStatusByNumber'])
    router.post('/refresh', [AuthController, 'refresh'])
    router.post('/process-delivery', [ProcessDeliveriesController, 'processDeliveries'])
    router.post('/confirm-bl', [ProcessDeliveriesController, 'confirmBl'])
    router.get('/bls/user/date', [BlController, 'getBlbyUserAndDate'])
    router.get('/bls/max-quantite/:invoiceId/:blId', [BlController, 'getMaxQuantite'])
    router.get('/invoices/date', [InvoicesController, 'get_invoice_by_date'])
    router.get('/invoice/:invoice_number', [InvoicesController, 'get_invoice_by_invoice_number'])
    router.get('/invoices/:invoice_number/bls', [InvoicesController, 'getBls'])
    router.post('/confirm-delivery', [ProcessDeliveriesController, 'confirmBl'])
    router.get('/payments/invoice/:invoice_number', [PaymentsController, 'getPaymentsByInvoice'])
    router.post('/invoices/:invoice_number/payment', [PaymentsController, 'store'])
    router.get('/user-invoice-reminders', [InvoiceRemindersController, 'getUserReminders'])
    router.patch('/invoice-reminders/:id/read', [InvoiceRemindersController, 'markAsRead'])
}).prefix('api')
    .use([middleware.auth()])


// admin routes
router.group(() => {
    router.resource('/users', UsersController)
    router.resource('/assignments', AssignmentsController)
    router.resource('/roots', RootsController)
    router.resource('/payments', PaymentsController)
    router.resource('/invoice-reminders', InvoiceRemindersController)
    router.resource('/commercial-initials', CommercialInitialsController)
    router.resource('/depots', DepotsController)
    router.resource('/drivers', DriversController)
    router.resource('/invoices', InvoicesController)
    router.resource('/bls', BlController)
}).prefix('api').use([middleware.auth()])


