import { z } from "zod";


export const LoginSchema = z.object({
    phone: z.string(),
    password: z.string(),
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
    password: z.string(),
    confirmPassword: z.string(),
    role: z.enum(['ADMIN', 'MAGASINIER', 'CHEF DEPOT', 'RECOUVREMENT', 'CONTROLEUR'], {
        errorMap: () => ({ message: "Rôle invalide" })
    }),
    depotId: z.number().nullable(),
    isActive: z.boolean().default(true)
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