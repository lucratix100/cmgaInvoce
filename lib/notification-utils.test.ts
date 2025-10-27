// Tests simples pour les fonctions utilitaires de notification
// Ce fichier peut être exécuté avec Node.js pour tester les fonctions

import { 
    isNotificationToday, 
    isNotificationYesterday, 
    isNotificationTomorrow,
    filterTodayNotifications,
    formatNotificationTime,
    formatNotificationDate,
    getNotificationDateText
} from './notification-utils';

// Mock d'une notification pour les tests
const mockNotification = {
    id: 1,
    userId: 1,
    invoiceId: 1,
    remindAt: new Date().toISOString(), // Aujourd'hui
    comment: "Test notification",
    read: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: { id: 1, name: "Test User" },
    invoice: { id: 1, invoiceNumber: "FACT-001" }
};

// Test de la fonction isNotificationToday
function testIsNotificationToday() {
    const todayNotification = { ...mockNotification, remindAt: new Date().toISOString() };
    const yesterdayNotification = { ...mockNotification, remindAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
    
    console.log("Test isNotificationToday:");
    console.log("Notification d'aujourd'hui:", isNotificationToday(todayNotification)); // devrait être true
    console.log("Notification d'hier:", isNotificationToday(yesterdayNotification)); // devrait être false
}

// Test de la fonction filterTodayNotifications
function testFilterTodayNotifications() {
    const notifications = [
        { ...mockNotification, id: 1, remindAt: new Date().toISOString() }, // Aujourd'hui
        { ...mockNotification, id: 2, remindAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }, // Hier
        { ...mockNotification, id: 3, remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }, // Demain
    ];
    
    const todayNotifications = filterTodayNotifications(notifications);
    console.log("Test filterTodayNotifications:");
    console.log("Notifications totales:", notifications.length);
    console.log("Notifications d'aujourd'hui:", todayNotifications.length); // devrait être 1
}

// Test des fonctions de formatage
function testFormattingFunctions() {
    const testDate = new Date('2024-01-15T10:30:00Z').toISOString();
    
    console.log("Test des fonctions de formatage:");
    console.log("formatNotificationTime:", formatNotificationTime(testDate));
    console.log("formatNotificationDate:", formatNotificationDate(testDate));
    console.log("getNotificationDateText:", getNotificationDateText(testDate));
}

// Exécuter les tests
if (typeof window === 'undefined') {
    // Seulement en mode Node.js
    console.log("=== Tests des fonctions utilitaires de notification ===");
    testIsNotificationToday();
    testFilterTodayNotifications();
    testFormattingFunctions();
    console.log("=== Fin des tests ===");
} 