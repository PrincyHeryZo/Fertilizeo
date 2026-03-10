import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await db.all('SELECT id, name, email, role, phone, location, created_at FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
    }
};

export const updateUserRole = async (req: Request, res: Response) => {
    const { role } = req.body;
    try {
        await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'Rôle mis à jour.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle.' });
    }
};

export const getPendingProducts = async (req: Request, res: Response) => {
    try {
        const products = await db.all('SELECT p.*, u.name as producer_name FROM products p JOIN users u ON p.producer_id = u.id WHERE p.is_approved = 0');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des produits en attente.' });
    }
};

export const approveProduct = async (req: Request, res: Response) => {
    try {
        await db.run('UPDATE products SET is_approved = 1 WHERE id = ?', [req.params.id]);
        
        // Notify producer
        const product: any = await db.get('SELECT producer_id FROM products WHERE id = ?', [req.params.id]);
        if (product) {
            await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
                [product.producer_id, 'product', `Votre produit a été approuvé.`]);
        }

        res.json({ message: 'Produit approuvé.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l’approbation du produit.' });
    }
};

export const getStats = async (req: Request, res: Response) => {
    try {
        const userCount = await db.get('SELECT COUNT(*) as count FROM users') as any;
        const productCount = await db.get('SELECT COUNT(*) as count FROM products') as any;
        const orderCount = await db.get('SELECT COUNT(*) as count FROM orders') as any;
        const totalRevenue = await db.get('SELECT SUM(total_amount) as total FROM orders WHERE status != "Annulée"') as any;

        res.json({
            users: Number(userCount.count),
            products: Number(productCount.count),
            orders: Number(orderCount.count),
            revenue: Number(totalRevenue.total || 0)
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques.' });
    }
};
