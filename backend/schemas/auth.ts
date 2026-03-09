import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    phone: z.string().optional(),
    location: z.string().optional(),
    role: z.enum(['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'])
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Email invalide"),
    password: z.string().min(1, "Le mot de passe est requis")
  })
});

export const productSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Le nom est requis"),
    description: z.string().min(10, "La description doit être plus longue"),
    price: z.number().positive("Le prix doit être positif"),
    category: z.string().min(1, "La catégorie est requise"),
    stock: z.number().int().nonnegative("Le stock ne peut pas être négatif"),
    image_url: z.string().optional()
  })
});
