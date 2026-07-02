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
const SageInvoicesController = () => import('#controllers/sage_invoices_controller')
const DepotsController = () => import('#controllers/depots_controller')
const ProcessDeliveriesController = () => import('#controllers/process_deliveries_controller')
const DriversController = () => import('#controllers/drivers_controller')
const InvoicesController = () => import('#controllers/invoices_controller')
const AssignmentsController = () => import('#controllers/assignments_controller')
const DepotAssignmentsController = () => import('#controllers/depot_assignments_controller')
const RootsController = () => import('#controllers/roots_controller')
const CommercialInitialsController = () => import('#controllers/commercial_initials_controller')
const BlController = () => import('#controllers/bls_controller')
const PaymentsController = () => import('#controllers/payments_controller')
const InvoiceRemindersController = () => import('#controllers/invoice_reminders_controller')
const UserActivitiesController = () => import('#controllers/user_activities_controller')
const DashboardController = () => import('#controllers/dashboard_controller')
const UpdateInvoicesStatusController = () => import('#controllers/update_invoices_status_controller')
const InvoiceRecoveriesController = () => import('#controllers/invoice_recoveries_controller')
const CommercialAdminController = () => import('#controllers/commercial_admin_controller')

// Contrôleurs pour le chat
const ConversationsController = () => import('#controllers/conversations_controller')
const MessagesController = () => import('#controllers/messages_controller')
const ChatUsersController = () => import('#controllers/chat_users_controller')

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
  router.get('/invoice', [SageInvoicesController, 'invoice_xml_to_json'])
  router.get('/assignment/:id/root', [AssignmentsController, 'getAssignmentByRootId'])
  router.get('/users/recouvrement', [UsersController, 'getRecouvrementUsers'])
  router.get('/invoice/:number', [InvoicesController, 'getInvoiceByNumber'])
  router.patch('/invoice/:invoice_number', [InvoicesController, 'updateInvoiceStatusByNumber'])
  router.post('/invoice/:invoice_number/mark-delivered-with-return', [InvoicesController, 'markAsDeliveredWithReturn'])
  router.post('/refresh', [AuthController, 'refresh'])
  router.post('/process-delivery', [ProcessDeliveriesController, 'processDeliveries'])
  router.post('/confirm-bl', [ProcessDeliveriesController, 'confirmBl'])
  router.get('/bls/user/date', [BlController, 'getBlbyUserAndDate'])
  router.get('/bls/max-quantite/:invoiceId/:blId', [BlController, 'getMaxQuantite'])
  router.get('/invoices/date', [InvoicesController, 'get_invoice_by_date'])
  
  // Routes spécifiques pour les calculs de paiement (prioritaires)
  router.get('/invoices/:invoice_number/payment-calculations', [InvoicesController, 'getInvoicePaymentCalculations'])
  
  // Autres routes d'invoices
  router.get('/invoice/:invoice_number', [InvoicesController, 'get_invoice_by_invoice_number'])
  router.get('/invoices/:invoice_number/bls', [InvoicesController, 'getBls'])
  router.post('/confirm-delivery', [ProcessDeliveriesController, 'confirmBl'])
  router.get('/payments/invoice/:invoice_number', [PaymentsController, 'getPaymentsByInvoice'])
  router.post('/invoices/:invoice_number/payment', [PaymentsController, 'store'])
  router.get('/user-invoice-reminders', [InvoiceRemindersController, 'getUserReminders'])
  router.patch('/invoice-reminders/:id/read', [InvoiceRemindersController, 'markAsRead'])
  router.get('/user-activities', [UserActivitiesController, 'recent'])
  router.get('/user-activities/recouvrement', [UserActivitiesController, 'recouvrement'])

  // Routes du dashboard
  router.get('/dashboard/stats', [DashboardController, 'stats'])
  router.get('/dashboard/invoice-stats', [DashboardController, 'invoiceStats'])
  router.get('/dashboard/payment-stats', [DashboardController, 'paymentStats'])
  router.get('/dashboard/system-stats', [DashboardController, 'systemStats'])
  router.get('/dashboard/chart-data', [DashboardController, 'chartData'])
  router.get('/dashboard/advanced-stats', [DashboardController, 'advancedStats'])
  router.get('/depots/active', [DepotsController, 'getActiveDepots'])
  router.post('/update-invoices-status', [UpdateInvoicesStatusController, 'updateInvoicesStatus'])

  // Routes de recouvrement des factures
  router.get('/recovery/urgent-invoices', [InvoiceRecoveriesController, 'getUrgentInvoices'])
  router.get('/recovery/settings', [InvoiceRecoveriesController, 'getRecoverySettings'])
  router.get('/recovery/settings/by-root', [InvoiceRecoveriesController, 'getRecoverySettingsByRoot'])
  router.post('/recovery/settings', [InvoiceRecoveriesController, 'updateRecoverySettings'])
  router.post('/recovery/settings/create', [InvoiceRecoveriesController, 'createRecoverySetting'])
  router.delete('/recovery/settings/:id', [InvoiceRecoveriesController, 'destroyRecoverySetting'])
  router.get('/recovery/roots', [InvoiceRecoveriesController, 'getRoots'])
  router.post('/recovery/invoices/:invoiceId/custom-delay', [InvoiceRecoveriesController, 'updateCustomDelay'])
  router.post('/recovery/update-urgent-status', [InvoiceRecoveriesController, 'updateUrgentStatus'])
  router.get('/recovery/test-invoices', [InvoiceRecoveriesController, 'testInvoices'])
  router.get('/recovery/custom-delays', [InvoiceRecoveriesController, 'getCustomDelays'])
  router.delete('/recovery/custom-delays/:id', [InvoiceRecoveriesController, 'deleteCustomDelay'])
  router.post('/recovery/check-expired-delays', [InvoiceRecoveriesController, 'checkExpiredDelays'])

  // Routes du dashboard responsable commercial
  router.get('/commercial-admin/dashboard', [CommercialAdminController, 'dashboard'])
  router.get('/commercial-admin/team-stats', [CommercialAdminController, 'teamStats'])
  router.get('/commercial-admin/alerts', [CommercialAdminController, 'alerts'])
  router.get('/commercial-admin/agents', [CommercialAdminController, 'agents'])
  router.post('/commercial-admin/agents', [CommercialAdminController, 'storeAgent'])
  router.put('/commercial-admin/agents/:id', [CommercialAdminController, 'updateAgent'])
  router.patch('/commercial-admin/agents/:id/deactivate', [CommercialAdminController, 'deactivateAgent'])
  router.get('/commercial-admin/clients', [CommercialAdminController, 'clients'])
  router.post('/commercial-admin/clients', [CommercialAdminController, 'storeClient'])
  router.put('/commercial-admin/clients/:id', [CommercialAdminController, 'updateClient'])
  router.patch('/commercial-admin/clients/:id/deactivate', [CommercialAdminController, 'deactivateClient'])
  router.patch('/commercial-admin/clients/:id/activate', [CommercialAdminController, 'activateClient'])
  router.post('/commercial-admin/locations', [CommercialAdminController, 'storeLocation'])
  router.put('/commercial-admin/locations/:id', [CommercialAdminController, 'updateLocation'])
  router.patch('/commercial-admin/locations/:id/deactivate', [CommercialAdminController, 'deactivateLocation'])
  router.patch('/commercial-admin/locations/:id/activate', [CommercialAdminController, 'activateLocation'])
  router.get('/commercial-admin/assignments', [CommercialAdminController, 'assignments'])
  router.post('/commercial-admin/assignments', [CommercialAdminController, 'storeAssignment'])
  router.patch('/commercial-admin/assignments/:id/deactivate', [CommercialAdminController, 'deactivateAssignment'])
  router.post('/commercial-admin/transfer', [CommercialAdminController, 'transferCommercialResources'])
  router.get('/commercial-admin/histories', [CommercialAdminController, 'histories'])
  router.get('/commercial-admin/planning', [CommercialAdminController, 'planning'])
  router.post('/commercial-admin/planning', [CommercialAdminController, 'storePlanning'])
  router.put('/commercial-admin/planning/:id', [CommercialAdminController, 'updatePlanning'])
  router.patch('/commercial-admin/planning/:id/deactivate', [CommercialAdminController, 'deactivatePlanning'])
  router.post('/commercial-admin/clients/import', [CommercialAdminController, 'importClients'])
  router.get('/commercial-admin/products', [CommercialAdminController, 'products'])
  router.post('/commercial-admin/products', [CommercialAdminController, 'storeProduct'])
  router.put('/commercial-admin/products/:id', [CommercialAdminController, 'updateProduct'])
  router.delete('/commercial-admin/products/:id', [CommercialAdminController, 'destroyProduct'])

  // Routes utilisées par l'écran des agents commerciaux
  router.get('/agent/clients', [CommercialAdminController, 'agentClients'])
  router.get('/agent/stats', [CommercialAdminController, 'agentStats'])
  router.get('/agent/follow-ups', [CommercialAdminController, 'agentFollowUps'])
  router.put('/agent/clients/:id/status', [CommercialAdminController, 'updateAgentClientStatus'])
  router.get('/agent/products', [CommercialAdminController, 'agentProducts'])
  router.get('/agent/portfolio/assigned', [CommercialAdminController, 'agentAssignedPortfolio'])
  router.get('/agent/personal-clients', [CommercialAdminController, 'agentPersonalClients'])
  router.post('/agent/personal-clients', [CommercialAdminController, 'storeAgentPersonalClient'])
  router.put('/agent/personal-clients/:id', [CommercialAdminController, 'updateAgentPersonalClient'])
  router.patch('/agent/personal-clients/:id/deactivate', [CommercialAdminController, 'deactivateAgentPersonalClient'])
  router.post('/agent/personal-orders', [CommercialAdminController, 'storeAgentPersonalOrder'])
  router.get('/agent/history/stats', [CommercialAdminController, 'agentHistoryStats'])
  router.get('/agent/history', [CommercialAdminController, 'agentHistory'])
  router.get('/agent/orders', [CommercialAdminController, 'agentOrders'])
  router.get('/agent/orders/:id/commercial-bl', [CommercialAdminController, 'agentCommercialBl'])
  router.put('/agent/commercial-bls/:id', [CommercialAdminController, 'updateAgentCommercialBl'])
  router.post('/agent/commercial-bls/:id/confirm', [CommercialAdminController, 'confirmAgentCommercialBl'])
  router.post('/agent/commercial-bls/:id/request-edit', [CommercialAdminController, 'requestCommercialBlEdit'])
  router.post('/agent/commercial-bls/:id/cancel', [CommercialAdminController, 'cancelAgentCommercialBl'])
  router.get('/commercial-admin/commercial-bl-requests', [CommercialAdminController, 'commercialBlRequests'])
  router.patch('/commercial-admin/commercial-bl-requests/:id/review', [CommercialAdminController, 'reviewCommercialBlRequest'])
  router.get('/admin/commercial-bl-reviews', [CommercialAdminController, 'adminCommercialBlReviews'])
  router.patch('/admin/commercial-bl-reviews/:id/review', [CommercialAdminController, 'reviewCommercialBlForFacturation'])
  router.get('/facturation/commercial-bls', [CommercialAdminController, 'facturationCommercialBls'])
  router.patch('/facturation/commercial-bls/:id/facture', [CommercialAdminController, 'markCommercialBlFactured'])

  // Routes du chat
  router.get('/chat/users', [ChatUsersController, 'index'])
  router.get('/chat/stats', [ChatUsersController, 'stats'])
  router.get('/chat/websocket-status', async ({ response }) => {
    try {
      const WebSocketService = (await import('#services/websocket_service')).default
      const instance = WebSocketService.getInstance()
      return response.ok({
        websocket_available: !!instance,
        message: instance ? 'WebSocket service is running' : 'WebSocket service not found'
      })
    } catch (error) {
      return response.ok({
        websocket_available: false,
        message: 'Error checking WebSocket status',
        error: error.message
      })
    }
  })
  router.get('/conversations', [ConversationsController, 'index'])
  router.post('/conversations', [ConversationsController, 'store'])
  router.get('/conversations/:id', [ConversationsController, 'show'])
  router.post('/conversations/:id/participants', [ConversationsController, 'addParticipants'])
  router.delete('/conversations/:id/participants', [ConversationsController, 'removeParticipant'])
  router.get('/conversations/:conversationId/messages', [MessagesController, 'index'])
  router.post('/messages', [MessagesController, 'store'])
  router.patch('/messages/:id/read', [MessagesController, 'markAsRead'])
  router.patch('/conversations/:conversationId/read', [MessagesController, 'markConversationAsRead'])
  router.delete('/messages/:id', [MessagesController, 'destroy'])
}).prefix('api')
  .use([middleware.auth()])


// admin routes
router.group(() => {
  router.resource('/users', UsersController)
  router.resource('/assignments', AssignmentsController)
  router.resource('/depot-assignments', DepotAssignmentsController)
  router.get('/depot-assignments/depot/:depotId', [DepotAssignmentsController, 'getDepotAssignments'])
  router.get('/depot-assignments/user/:userId', [DepotAssignmentsController, 'getUserAssignments'])
  router.resource('/roots', RootsController)
  router.resource('/payments', PaymentsController)
  router.resource('/invoice-reminders', InvoiceRemindersController)
  router.resource('/commercial-initials', CommercialInitialsController)
  router.resource('/depots', DepotsController)
  router.resource('/drivers', DriversController)
  router.resource('/invoices', InvoicesController)
  router.resource('/bls', BlController)
}).prefix('api').use([middleware.auth()])

// Initialisation du WebSocket
let websocketInitialized = false
let initializationAttempts = 0
const maxAttempts = 5

const initializeWebSocket = async () => {
  if (websocketInitialized || initializationAttempts >= maxAttempts) return

  initializationAttempts++
  console.log(`🔧 Tentative ${initializationAttempts}/${maxAttempts} d'initialisation manuelle du WebSocket...`)

  try {
    const { default: WebSocketService } = await import('#services/websocket_service')

    // Vérifier si une instance existe déjà
    const existingInstance = WebSocketService.getInstance()
    if (existingInstance) {
      console.log('✅ Instance WebSocket déjà existante')
      websocketInitialized = true
      return
    }

    // Créer le service WebSocket sans serveur HTTP (il créera son propre serveur)
    console.log('🔌 Création du service WebSocket avec serveur dédié...')
    new WebSocketService()
    websocketInitialized = true
    console.log('✅ WebSocket initialisé manuellement')

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation manuelle du WebSocket:', error)
    // Réessayer après 1 seconde
    setTimeout(initializeWebSocket, 1000)
  }
}

// Initialiser le WebSocket uniquement quand l'application sert HTTP.
// Les commandes Ace comme migration:run importent aussi les routes et ne doivent pas rester bloquées.
const shouldInitializeWebSocket = process.argv.some((arg) => arg === 'serve' || arg.includes('server.js'))
if (shouldInitializeWebSocket) {
  setTimeout(initializeWebSocket, 2000)
}


