'use client'

import React from 'react'
import { useChat } from '@/components/chat/chat-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Users, UserPlus } from 'lucide-react'

export default function DemoChatPage() {
  const { openChat } = useChat()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Démonstration du Système de Chat
        </h1>
        <p className="text-gray-600">
          Testez le système de messagerie en temps réel avec conversations privées et de groupe.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Conversations Privées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Créez des conversations privées avec d'autres utilisateurs de l'application.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Sélectionnez un utilisateur dans la liste</li>
              <li>• Échangez des messages en privé</li>
              <li>• Interface intuitive et responsive</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Conversations de Groupe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Créez des groupes de discussion avec plusieurs participants.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Nommez votre groupe</li>
              <li>• Ajoutez plusieurs participants</li>
              <li>• Partagez des fichiers et images</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-500" />
              Gestion des Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Accédez à la liste complète des utilisateurs de l'application.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Voir tous les utilisateurs disponibles</li>
              <li>• Recherche et filtrage</li>
              <li>• Informations détaillées</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-orange-500" />
              Fonctionnalités Avancées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Découvrez toutes les fonctionnalités du système de chat.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Messages en temps réel</li>
              <li>• Upload de fichiers</li>
              <li>• Notifications</li>
              <li>• Interface moderne</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Button 
          onClick={openChat} 
          size="lg"
          className="bg-blue-500 hover:bg-blue-600"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Ouvrir le Chat
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          Cliquez sur le bouton pour ouvrir le popup de chat en bas à droite
        </p>
      </div>

      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          Instructions d'utilisation
        </h2>
        <div className="space-y-3 text-blue-800">
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</span>
            <p>Cliquez sur le bouton "Ouvrir le Chat" ou sur l'icône de chat en bas à droite</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</span>
            <p>Choisissez entre créer une conversation privée ou de groupe</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</span>
            <p>Sélectionnez les participants dans la liste des utilisateurs</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">4</span>
            <p>Commencez à échanger des messages en temps réel !</p>
          </div>
        </div>
      </div>
    </div>
  )
} 