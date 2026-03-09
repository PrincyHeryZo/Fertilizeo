import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getAllUsers = (req: Request, res: Response) => {
    try {
        const users = db.prepare('SELECT id, name, email, role, phone, location, created_at FROM users').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
    }
};

export const updateUserRole = (req: Request, res: Response) => {
    const { role } = req.body;
    try {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
        res.json({ message: 'Rôle mis à jour.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle.' });
    }
};

export const getPendingProducts = (req: Request, res: Response) => {
    try {
        const products = db.prepare('SELECT p.*, u.name as producer_name FROM products p JOIN users u ON p.producer_id = u.id WHERE p.is_approved = 0').all();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des produits en attente.' });
    }
};

export const approveProduct = (req: Request, res: Response) => {
    try {
        db.prepare('UPDATE products SET is_approved = 1 WHERE id = ?').run(req.params.id);
        
        // Notify producer
        const product: any = db.prepare('SELECT producer_id FROM products WHERE id = ?').get(req.params.id);
        if (product) {
            db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
                .run(product.producer_id, 'product', `Votre produit a été approuvé.`);
        }

        res.json({ message: 'Produit approuvé.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l’approbation du produit.' });
    }
};

export const getStats = (req: Request, res: Response) => {
    try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
        const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
        const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
        const totalRevenue = db.prepare('SELECT SUM(total_amount) as total FROM orders WHERE status != "Annulée"').get() as any;

        res.json({
            users: userCount.count,
            products: productCount.count,
            orders: orderCount.count,
            revenue: totalRevenue.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques.' });
    }
};
