import { isToday, isYesterday, isTomorrow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InvoiceReminder } from './types';

/**
 * Vérifie si une notification est programmée pour aujourd'hui
 */
export function isNotificationToday(notification: InvoiceReminder): boolean {
    const remindDate = new Date(notification.remindAt);
    return isToday(remindDate);
}

/**
 * Vérifie si une notification est programmée pour hier
 */
export function isNotificationYesterday(notification: InvoiceReminder): boolean {
    const remindDate = new Date(notification.remindAt);
    return isYesterday(remindDate);
}

/**
 * Vérifie si une notification est programmée pour demain
 */
export function isNotificationTomorrow(notification: InvoiceReminder): boolean {
    const remindDate = new Date(notification.remindAt);
    return isTomorrow(remindDate);
}

/**
 * Filtre les notifications pour n'afficher que celles du jour même
 */
export function filterTodayNotifications(notifications: InvoiceReminder[]): InvoiceReminder[] {
    return notifications.filter(isNotificationToday);
}

/**
 * Filtre les notifications pour n'afficher que celles non lues du jour même
 */
export function filterTodayUnreadNotifications(notifications: InvoiceReminder[]): InvoiceReminder[] {
    return notifications.filter(notification => 
        isNotificationToday(notification) && !notification.read
    );
}

/**
 * Formate la date de rappel pour l'affichage dans la navbar (heure seulement)
 */
export function formatNotificationTime(remindAt: string): string {
    return format(new Date(remindAt), "HH:mm", { locale: fr });
}

/**
 * Formate la date de rappel pour l'affichage complet
 */
export function formatNotificationDate(remindAt: string): string {
    return format(new Date(remindAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Obtient un texte descriptif pour la date de la notification
 */
export function getNotificationDateText(remindAt: string): string {
    const remindDate = new Date(remindAt);
    
    if (isToday(remindDate)) {
        return `Aujourd'hui à ${format(remindDate, "HH:mm", { locale: fr })}`;
    } else if (isYesterday(remindDate)) {
        return `Hier à ${format(remindDate, "HH:mm", { locale: fr })}`;
    } else if (isTomorrow(remindDate)) {
        return `Demain à ${format(remindDate, "HH:mm", { locale: fr })}`;
    } else {
        return format(remindDate, "dd MMMM yyyy 'à' HH:mm", { locale: fr });
    }
} 