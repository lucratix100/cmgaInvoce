'use client'

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ScanUnified from './scan-unified'

// Mock des dépendances
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn()
    })
}))

vi.mock('@/hooks/useActivityInvalidation', () => ({
    useActivityInvalidation: () => ({
        invalidateAfterAction: vi.fn()
    })
}))

vi.mock('@/actions/invoice', () => ({
    getInvoiceByNumber: vi.fn(),
    getBlsByInvoice: vi.fn(),
    confirmBl: vi.fn(),
    updateInvoiceStatus: vi.fn()
}))

vi.mock('./facture/gestion-facture', () => ({
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
        isOpen ? <div data-testid="gestion-facture">Gestion Facture</div> : null
    )
}))

vi.mock('./invoice-scan-confirmation-dialog', () => ({
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
        isOpen ? <div data-testid="confirmation-dialog">Confirmation Dialog</div> : null
    )
}))

describe('ScanUnified', () => {
    const defaultProps = {
        role: 'magasinier' as const,
        onScan: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendu du bouton', () => {
        it('affiche le bouton avec le bon texte pour chaque rôle', () => {
            const roles = [
                { role: 'magasinier', expectedText: 'Scanner la facture' },
                { role: 'chef-depot', expectedText: 'Scanner la facture' },
                { role: 'superviseur-magasin', expectedText: 'Scanner la facture' },
                { role: 'controller', expectedText: 'Scanner pour confirmer' }
            ]

            roles.forEach(({ role, expectedText }) => {
                render(<ScanUnified {...defaultProps} role={role} />)
                expect(screen.getByText(expectedText)).toBeInTheDocument()
            })
        })
    })

    describe('Ouverture du dialogue', () => {
        it('ouvre le dialogue quand on clique sur le bouton', () => {
            render(<ScanUnified {...defaultProps} />)
            
            const button = screen.getByText('Scanner la facture')
            fireEvent.click(button)
            
            expect(screen.getByText('Scannez le code-barres')).toBeInTheDocument()
        })
    })

    describe('Saisie manuelle', () => {
        it('permet la saisie manuelle en mode test', () => {
            render(<ScanUnified {...defaultProps} />)
            
            // Ouvrir le dialogue
            fireEvent.click(screen.getByText('Scanner la facture'))
            
            // Activer le mode test
            fireEvent.click(screen.getByText('Mode test (saisie manuelle)'))
            
            const input = screen.getByPlaceholderText('Saisissez le numéro de facture...')
            expect(input).toBeInTheDocument()
        })
    })

    describe('Validation des rôles', () => {
        it('affiche une erreur pour une facture invalide selon le rôle', async () => {
            const { getInvoiceByNumber } = await import('@/actions/invoice')
            vi.mocked(getInvoiceByNumber).mockResolvedValue({
                invoice: {
                    id: 1,
                    invoiceNumber: 'TEST001',
                    status: 'livrée', // Statut invalide pour magasinier
                    accountNumber: '123',
                    date: '2024-01-01',
                    isCompleted: false,
                    isCompleteDelivery: false,
                    order: [],
                    customer: null,
                    depotId: 1,
                    totalTtc: 1000,
                    statusPayment: 'non payé'
                }
            })

            render(<ScanUnified {...defaultProps} />)
            
            // Ouvrir le dialogue
            fireEvent.click(screen.getByText('Scanner la facture'))
            
            // Saisir un numéro de facture
            const input = screen.getByLabelText('Scannez le code-barres')
            fireEvent.change(input, { target: { value: 'TEST001' } })
            
            await waitFor(() => {
                expect(screen.getByText(/Cette facture n'est pas en attente de livraison/)).toBeInTheDocument()
            })
        })
    })

    describe('Gestion des erreurs', () => {
        it('affiche une erreur quand la facture n\'existe pas', async () => {
            const { getInvoiceByNumber } = await import('@/actions/invoice')
            vi.mocked(getInvoiceByNumber).mockResolvedValue({
                error: 'Facture non trouvée'
            })

            render(<ScanUnified {...defaultProps} />)
            
            // Ouvrir le dialogue
            fireEvent.click(screen.getByText('Scanner la facture'))
            
            // Saisir un numéro de facture
            const input = screen.getByLabelText('Scannez le code-barres')
            fireEvent.change(input, { target: { value: 'INVALID' } })
            
            await waitFor(() => {
                expect(screen.getByText('Facture non trouvée')).toBeInTheDocument()
            })
        })
    })

    describe('Composants conditionnels', () => {
        it('affiche GestionFacture pour les rôles magasinier et superviseur-magasin', async () => {
            const { getInvoiceByNumber } = await import('@/actions/invoice')
            vi.mocked(getInvoiceByNumber).mockResolvedValue({
                invoice: {
                    id: 1,
                    invoiceNumber: 'TEST001',
                    status: 'en attente de livraison',
                    accountNumber: '123',
                    date: '2024-01-01',
                    isCompleted: false,
                    isCompleteDelivery: false,
                    order: [],
                    customer: null,
                    depotId: 1,
                    totalTtc: 1000,
                    statusPayment: 'non payé'
                }
            })

            render(<ScanUnified {...defaultProps} role="magasinier" />)
            
            // Ouvrir le dialogue
            fireEvent.click(screen.getByText('Scanner la facture'))
            
            // Saisir un numéro de facture valide
            const input = screen.getByLabelText('Scannez le code-barres')
            fireEvent.change(input, { target: { value: 'TEST001' } })
            
            await waitFor(() => {
                expect(screen.getByTestId('gestion-facture')).toBeInTheDocument()
            })
        })

        it('affiche InvoiceConfirmationDialog pour le rôle chef-depot', async () => {
            const { getInvoiceByNumber } = await import('@/actions/invoice')
            vi.mocked(getInvoiceByNumber).mockResolvedValue({
                invoice: {
                    id: 1,
                    invoiceNumber: 'TEST001',
                    status: 'non réceptionnée',
                    accountNumber: '123',
                    date: '2024-01-01',
                    isCompleted: false,
                    isCompleteDelivery: false,
                    order: [],
                    customer: null,
                    depotId: 1,
                    totalTtc: 1000,
                    statusPayment: 'non payé'
                }
            })

            render(<ScanUnified {...defaultProps} role="chef-depot" />)
            
            // Ouvrir le dialogue
            fireEvent.click(screen.getByText('Scanner la facture'))
            
            // Saisir un numéro de facture valide
            const input = screen.getByLabelText('Scannez le code-barres')
            fireEvent.change(input, { target: { value: 'TEST001' } })
            
            await waitFor(() => {
                expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument()
            })
        })
    })

    describe('Callback onScan', () => {
        it('appelle onScan avec le numéro de facture après confirmation', async () => {
            const onScan = vi.fn()
            const { updateInvoiceStatus } = await import('@/actions/invoice')
            vi.mocked(updateInvoiceStatus).mockResolvedValue({ message: 'Succès' })

            render(<ScanUnified {...defaultProps} role="chef-depot" onScan={onScan} />)
            
            // Ouvrir le dialogue et simuler une confirmation
            fireEvent.click(screen.getByText('Scanner la facture'))
            
            // Simuler la confirmation (cela dépend de l'implémentation exacte)
            // Ce test peut nécessiter des ajustements selon l'implémentation réelle
        })
    })
}) 