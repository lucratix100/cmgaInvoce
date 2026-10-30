import { z } from "zod";


export const LoginSchema = z.object({
    email: z.string().email("Format d'email invalide"),
    password: z.string().min(1, "Le mot de passe est requis"),
});

export const ForgotPasswordSchema = z.object({
    email: z.string().email("Format d'email invalide"),
});

export const ResetPasswordSchema = z.object({
    token: z.string().min(20, "Token invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string().min(8, "La confirmation est requise"),
});

export const DriverSchema = z.object({
    firstname: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
    lastname: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    phone: z.string().min(9, "Le numéro de téléphone doit contenir au moins 9 chiffres"),
    isActive: z.boolean().default(true)
});

export const UserSchema = z.object({
    firstname: z.string()
        .min(2, "Le prénom doit contenir au moins 2 caractères")
        .max(50, "Le prénom ne peut pas dépasser 50 caractères"),
    lastname: z.string()
        .min(2, "Le nom doit contenir au moins 2 caractères")
        .max(50, "Le nom ne peut pas dépasser 50 caractères"),
    email: z.string()
        .email("Format d'email invalide")
        .min(1, "L'email est requis"),
    phone: z.string()
        .min(9, "Le numéro doit contenir au moins 9 chiffres")
        .max(15, "Le numéro ne peut pas dépasser 15 chiffres"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    role: z.enum(['ADMIN', 'MAGASINIER', 'CHEF DEPOT', 'RECOUVREMENT', 'CONTROLEUR', 'SUPERVISEUR_MAGASIN', 'AGENT_COMMERCIAL', 'COMMERCIAL_ADMIN', 'FACTURATION'], {
        errorMap: () => ({ message: "Rôle invalide" })
    }),
    depotId: z.number().nullable(),
    isActive: z.boolean().optional()
})

export const DepotSchema = z.object({
    name: z.string().min(2, "Le nom du dépôt doit contenir au moins 2 caractères"),
    needDoubleCheck: z.boolean().default(true),
    isActive: z.boolean().default(true),
})

export const InvoiceSchema = z.object({
    status: z.enum(['EN_COURS', 'EN_ATTENTE', 'LIVREE']),
    isCompleted: z.boolean().default(false),
    isCompleteDelivery: z.boolean().default(false),
})