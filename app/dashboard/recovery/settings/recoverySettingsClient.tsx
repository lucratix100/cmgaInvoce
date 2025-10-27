"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Settings, Save, Plus, Globe, Building2, Clock, Trash2, AlertTriangle, Info, FileText, User, Search } from "lucide-react"
import { updateRecoverySettings, deleteRecoverySetting, RecoverySetting, deleteCustomDelay, checkExpiredDelays } from "@/actions/recovery"
import { Root } from "@/types/recovery"
import { toast } from "sonner"

interface RecoverySettingsClientProps {
  initialData: {
    success: boolean
    settings?: RecoverySetting[]
    data?: RecoverySetting | null
    message?: string
  }
  rootsData: {
    success: boolean
    data: Root[]
  }
  customDelaysData: {
    success: boolean
    data: any[]
  }
  user: any
}

interface CustomDelay {
  id: number
  customDays: number
  createdAt: string
  updatedAt: string
  invoice: {
    id: number
    invoiceNumber: string
    accountNumber: string
    date: string
    totalTTC: number
    customer: {
      name: string
      accountNumber: string
    } | null
  }
}

// Composant pour un délai individuel
function SettingItem({
  setting,
  onUpdate,
  onDelete,
  isUpdating,
  getDelayColor,
  getDelayIcon
}: {
  setting: RecoverySetting
  onUpdate: (setting: RecoverySetting, newDays: number) => Promise<void>
  onDelete: (setting: RecoverySetting) => Promise<void>
  isUpdating: boolean
  getDelayColor: (rootId: number | null) => string
  getDelayIcon: (rootId: number | null) => React.ReactElement
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    if (inputRef.current) {
      const newDays = parseInt(inputRef.current.value)
      if (!isNaN(newDays) && newDays > 0) {
        onUpdate(setting, newDays)
        inputRef.current.value = ''
      } else {
        toast.error('Veuillez entrer un délai valide')
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg text-white ${getDelayColor(setting.rootId)}`}>
          {getDelayIcon(setting.rootId)}
        </div>
        <div>
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            {setting.rootId === null ? 'Délai global' : `Racine ${setting.root?.name || setting.rootId}`}
            <Badge variant={setting.rootId === null ? "default" : "secondary"}>
              {setting.rootId === null ? 'Global' : 'Spécifique'}
            </Badge>
          </h3>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Délai actuel: {setting.defaultDays} jours
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="number"
          placeholder="Nouveau délai"
          className="w-24"
          min="1"
          onKeyPress={handleKeyPress}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isUpdating}
          className="hover:bg-blue-50 hover:border-blue-300"
        >
          {isUpdating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(setting)}
          disabled={isUpdating}
          className="hover:bg-red-50 hover:border-red-300 text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function RecoverySettingsClient({ initialData, rootsData, customDelaysData, user }: RecoverySettingsClientProps) {
  const [settings, setSettings] = useState<RecoverySetting[]>(initialData.settings || [])
  const [roots, setRoots] = useState<Root[]>(rootsData.data || [])
  const [customDelays, setCustomDelays] = useState<CustomDelay[]>(customDelaysData.data || [])
  const [newSetting, setNewSetting] = useState({
    rootIds: [] as string[],
    defaultDays: '30'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [updatingSettings, setUpdatingSettings] = useState<Set<number>>(new Set())

  // États pour la recherche
  const [rootSearch, setRootSearch] = useState('')
  const [customDelaySearch, setCustomDelaySearch] = useState('')

  // Vérifier s'il y a un message d'information
  const hasInfoMessage = initialData.message && !initialData.settings?.length

  // Filtrer les racines basées sur la recherche
  const filteredRoots = roots.filter(root =>
    root.name.toLowerCase().includes(rootSearch.toLowerCase())
  )

  // Filtrer les délais personnalisés basés sur la recherche
  const filteredCustomDelays = customDelays.filter(delay =>
    delay.invoice.invoiceNumber.toLowerCase().includes(customDelaySearch.toLowerCase()) ||
    delay.invoice.accountNumber.toLowerCase().includes(customDelaySearch.toLowerCase()) ||
    (delay.invoice.customer?.name && delay.invoice.customer.name.toLowerCase().includes(customDelaySearch.toLowerCase()))
  )

  // Mettre à jour un délai existant
  const handleUpdateSetting = async (setting: RecoverySetting, newDays: number) => {
    if (!newDays || newDays <= 0) {
      toast.error('Veuillez entrer un délai valide (nombre positif)')
      return
    }

    try {
      setIsLoading(true)
      setUpdatingSettings(prev => new Set(prev).add(setting.id))

      const response = await updateRecoverySettings({
        rootId: setting.rootId,
        defaultDays: newDays
      })

      // Mettre à jour l'état local avec la réponse du serveur
      if (response.success && response.setting) {
        setSettings(prev => prev.map(s =>
          s.id === setting.id
            ? { ...s, ...response.setting }
            : s
        ))
        toast.success('Délai mis à jour avec succès')
      } else {
        throw new Error('Erreur lors de la mise à jour')
      }

    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour du délai')
      console.error(error)
    } finally {
      setIsLoading(false)
      setUpdatingSettings(prev => {
        const newSet = new Set(prev)
        newSet.delete(setting.id)
        return newSet
      })
    }
  }

  // Supprimer un délai configuré
  const handleDeleteSetting = async (setting: RecoverySetting) => {
    try {
      setIsLoading(true)

      await deleteRecoverySetting(setting.id)

      // Mettre à jour l'état local
      setSettings(prev => prev.filter(s => s.id !== setting.id))

      toast.success('Délai supprimé avec succès')

    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error)

      // Afficher le message d'erreur spécifique si disponible
      const errorMessage = error.message || 'Erreur lors de la suppression du délai'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Supprimer un délai personnalisé
  const handleDeleteCustomDelay = async (customDelay: CustomDelay) => {
    try {
      setIsLoading(true)

      await deleteCustomDelay(customDelay.id)

      // Mettre à jour l'état local
      setCustomDelays(prev => prev.filter(d => d.id !== customDelay.id))

      toast.success('Délai personnalisé supprimé avec succès')

    } catch (error: any) {
      console.error('Erreur lors de la suppression du délai personnalisé:', error)
      toast.error(error.message || 'Erreur lors de la suppression du délai personnalisé')
    } finally {
      setIsLoading(false)
    }
  }

  // Ajouter de nouveaux délais
  const handleAddSettings = async () => {
    if (newSetting.rootIds.length === 0 || !newSetting.defaultDays) {
      toast.error('Veuillez sélectionner au moins une racine et un délai')
      return
    }

    try {
      setIsLoading(true)

      const promises = newSetting.rootIds.map(async (rootId) => {
        const actualRootId = rootId === 'global' ? null : parseInt(rootId)
        return updateRecoverySettings({
          rootId: actualRootId,
          defaultDays: parseInt(newSetting.defaultDays)
        })
      })

      const results = await Promise.all(promises)

      // Ajouter les nouveaux settings à l'état local
      setSettings(prev => [...prev, ...results.map((r: any) => r.setting)])

      // Réinitialiser le formulaire
      setNewSetting({
        rootIds: [],
        defaultDays: '30'
      })

      toast.success(`${results.length} délai(x) ajouté(s) avec succès`)

    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout des délais')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Gérer la sélection multiple
  const handleRootSelection = (rootId: string, checked: boolean) => {
    if (checked) {
      setNewSetting(prev => ({
        ...prev,
        rootIds: [...prev.rootIds, rootId]
      }))
    } else {
      setNewSetting(prev => ({
        ...prev,
        rootIds: prev.rootIds.filter(id => id !== rootId)
      }))
    }
  }

  // Vérifier si une racine est déjà configurée
  const isRootConfigured = (rootId: string) => {
    const actualRootId = rootId === 'global' ? null : parseInt(rootId)
    return settings.some(setting => setting.rootId === actualRootId)
  }

  // Obtenir la couleur pour un type de délai
  const getDelayColor = (rootId: number | null) => {
    if (rootId === null) return 'bg-gradient-to-r from-blue-500 to-purple-600'
    return 'bg-gradient-to-r from-green-500 to-emerald-600'
  }

  // Obtenir l'icône pour un type de délai
  const getDelayIcon = (rootId: number | null) => {
    if (rootId === null) return <Globe className="h-4 w-4" />
    return <Building2 className="h-4 w-4" />
  }

  // Formater le montant
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  // Exécuter la vérification des délais expirés
  const handleCheckExpiredDelays = async () => {
    try {
      setIsLoading(true)

      await checkExpiredDelays()

      // Recharger les délais personnalisés après la vérification
      const customDelaysResponse = await fetch('/api/recovery/custom-delays', {
        credentials: 'include'
      })
      const customDelaysData = await customDelaysResponse.json()

      if (customDelaysData.success) {
        setCustomDelays(customDelaysData.data)
      }

      toast.success('Vérification des délais expirés terminée')

    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la vérification des délais expirés')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec gradient */}
      {/* <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Configuration des Délais</h1>
            <p className="text-blue-100 mt-2">
              Configurez les délais de recouvrement par défaut pour optimiser votre gestion
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleCheckExpiredDelays}
              disabled={isLoading}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Vérification...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Vérifier les délais expirés
                </div>
              )}
            </Button>
            <Settings className="h-8 w-8 text-blue-200" />
          </div>
        </div>
      </div> */}

      {/* Message d'information */}
      {hasInfoMessage && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-1">
                  Configuration initiale
                </h3>
                <p className="text-blue-800 text-sm">
                  {initialData.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interface horizontale avec deux panneaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Panneau de gauche : Configuration */}
        <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Plus className="h-5 w-5" />
              Configurer les Délais
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Créez et gérez les délais de recouvrement
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Sélection des racines */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Sélectionner les racines
                </Label>

                {/* Recherche des racines */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher une racine..."
                    value={rootSearch}
                    onChange={(e) => setRootSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Liste des racines avec scroll */}
                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {/* Option globale */}
                  <div className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors ${isRootConfigured('global')
                    ? 'bg-gray-100 border-gray-200 opacity-60'
                    : 'hover:bg-blue-50'
                    }`}>
                    <Checkbox
                      id="global"
                      checked={newSetting.rootIds.includes('global')}
                      onCheckedChange={(checked) => handleRootSelection('global', checked as boolean)}
                      disabled={isRootConfigured('global')}
                    />
                    <Label htmlFor="global" className={`flex items-center gap-2 ${isRootConfigured('global') ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}>
                      <Globe className={`h-4 w-4 ${isRootConfigured('global') ? 'text-gray-400' : 'text-blue-600'}`} />
                      <span className={`font-medium ${isRootConfigured('global') ? 'text-gray-500' : ''}`}>
                        Délai global
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {isRootConfigured('global') ? 'Déjà configuré' : 'Toutes les factures'}
                      </Badge>
                    </Label>
                  </div>

                  {/* Options des racines */}
                  {filteredRoots.map((root) => (
                    <div key={root.id} className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors ${isRootConfigured(root.id.toString())
                      ? 'bg-gray-100 border-gray-200 opacity-60'
                      : 'hover:bg-green-50'
                      }`}>
                      <Checkbox
                        id={`root-${root.id}`}
                        checked={newSetting.rootIds.includes(root.id.toString())}
                        onCheckedChange={(checked) => handleRootSelection(root.id.toString(), checked as boolean)}
                        disabled={isRootConfigured(root.id.toString())}
                      />
                      <Label htmlFor={`root-${root.id}`} className={`flex items-center gap-2 ${isRootConfigured(root.id.toString()) ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}>
                        <Building2 className={`h-4 w-4 ${isRootConfigured(root.id.toString()) ? 'text-gray-400' : 'text-green-600'}`} />
                        <span className={`font-medium ${isRootConfigured(root.id.toString()) ? 'text-gray-500' : ''}`}>
                          Racine {root.name}
                        </span>
                        {isRootConfigured(root.id.toString()) && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Déjà configuré
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}

                  {filteredRoots.length === 0 && rootSearch && (
                    <div className="text-center py-4 text-gray-500">
                      Aucune racine trouvée pour "{rootSearch}"
                    </div>
                  )}
                </div>
              </div>

              {/* Délai en jours */}
              <div>
                <Label htmlFor="defaultDays" className="text-sm font-medium text-gray-700">
                  Délai en jours
                </Label>
                <div className="relative mt-1">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="defaultDays"
                    type="number"
                    placeholder="Ex: 30"
                    value={newSetting.defaultDays}
                    onChange={(e) => setNewSetting(prev => ({ ...prev, defaultDays: e.target.value }))}
                    min="1"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Bouton d'ajout */}
              <div>
                <Button
                  onClick={handleAddSettings}
                  disabled={isLoading || newSetting.rootIds.length === 0 || !newSetting.defaultDays}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 w-full"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Ajout...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter {newSetting.rootIds.length} délai(s)
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panneau de droite : Gestion */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Settings className="h-5 w-5" />
              Gérer les Délais
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Modifiez et supprimez les délais existants
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {settings.length === 0 && customDelays.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucun délai configuré
                  </h3>
                  <p className="text-gray-600">
                    Ajoutez des délais dans le panneau de gauche pour commencer.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Délais globaux et par racine */}
                {settings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      Délais par défaut
                    </h3>
                    <div className="space-y-4">
                      {settings.filter(setting => setting).map((setting) => (
                        <SettingItem
                          key={setting.id}
                          setting={setting}
                          onUpdate={handleUpdateSetting}
                          onDelete={handleDeleteSetting}
                          isUpdating={updatingSettings.has(setting.id)}
                          getDelayColor={getDelayColor}
                          getDelayIcon={getDelayIcon}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Délais personnalisés par facture */}
                {customDelays.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      Délais personnalisés par facture
                    </h3>

                    {/* Recherche des délais personnalisés */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Rechercher par numéro de facture, compte client ou nom..."
                        value={customDelaySearch}
                        onChange={(e) => setCustomDelaySearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Liste des délais personnalisés avec scroll */}
                    <div className="max-h-80 overflow-y-auto space-y-4">
                      {filteredCustomDelays.map((customDelay) => (
                        <div key={customDelay.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-purple-50 to-pink-50">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg text-white bg-gradient-to-r from-purple-500 to-pink-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                Facture {customDelay.invoice.invoiceNumber}
                                <Badge variant="outline" className="text-purple-600 border-purple-300">
                                  Personnalisé
                                </Badge>
                              </h3>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {customDelay.invoice.customer?.name || 'Client inconnu'} ({customDelay.invoice.accountNumber})
                                </p>
                                <p className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Délai: {customDelay.customDays} jours
                                </p>
                                <p className="flex items-center gap-1">
                                  <span className="font-medium">Montant:</span> {formatAmount(customDelay.invoice.totalTTC)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCustomDelay(customDelay)}
                              disabled={isLoading}
                              className="hover:bg-red-50 hover:border-red-300 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {filteredCustomDelays.length === 0 && customDelaySearch && (
                        <div className="text-center py-8 text-gray-500">
                          Aucun délai personnalisé trouvé pour "{customDelaySearch}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section d'informations en bas */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Comment ça fonctionne ?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-blue-800"><strong>Délai global :</strong> S'applique à toutes les factures sauf exceptions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-blue-800"><strong>Délai par racine :</strong> S'applique aux factures selon la racine du compte client</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-blue-800"><strong>Délai personnalisé :</strong> Peut être défini individuellement pour chaque facture</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-blue-800"><strong>Priorité :</strong> Délai personnalisé {'>'} Délai par racine {'>'} Délai global</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 