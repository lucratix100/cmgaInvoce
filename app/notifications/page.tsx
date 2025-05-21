"use client"

import { useEffect, useState } from "react"
import Navbar from "../../components/navbar/navbar"

interface Notification {
    id: number;
    title: string;
    message: string;
    date: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
}

export default function Notification() {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 1,
            title: "Nouveau message",
            message: "Vous avez reçu un nouveau message de Jean Dupont",
            date: "2024-03-20 14:30",
            type: "info",
            read: false
        },
        {
            id: 2,
            title: "Commande confirmée",
            message: "Votre commande #12345 a été confirmée",
            date: "2024-03-20 13:15",
            type: "success",
            read: true
        },
        {
            id: 3,
            title: "Mise à jour système",
            message: "Une mise à jour système est prévue ce soir",
            date: "2024-03-20 10:00",
            type: "warning",
            read: false
        },
        {
            id: 4,
            title: "Erreur de paiement",
            message: "Une erreur est survenue lors de votre dernier paiement",
            date: "2024-03-19 16:45",
            type: "error",
            read: true
        }
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [showRead, setShowRead] = useState(true);

    const filteredNotifications = notifications.filter(notification => {
        const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            notification.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesReadStatus = showRead || !notification.read;
        return matchesSearch && matchesReadStatus;
    });

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'info': return 'bg-blue-100 text-blue-800';
            case 'success': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'error': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="w-full">
            <Navbar />
            <div className="max-w-7xl mt-10 mx-auto">
                
                {/* Barre de recherche et filtres */}
                <div className="mb-6 space-y-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Rechercher dans les notifications..."
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showRead}
                                    onChange={(e) => setShowRead(e.target.checked)}
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                />
                                <span className="text-gray-700">Afficher les notifications lues</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Liste des notifications */}
                <div className="space-y-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Aucune notification trouvée
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => (
                            <div 
                                key={notification.id}
                                className={`p-4 rounded-lg shadow-sm border ${
                                    notification.read ? 'bg-white' : 'bg-gray-50'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{notification.title}</h3>
                                        <p className="text-gray-600 mt-1">{notification.message}</p>
                                        <div className="flex items-center mt-2">
                                            <span className="text-sm text-gray-500">{notification.date}</span>
                                            <span className={`ml-3 px-2 py-1 rounded-full text-xs ${getTypeColor(notification.type)}`}>
                                                {notification.type}
                                            </span>
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
