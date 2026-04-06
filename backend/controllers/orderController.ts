import { Request, Response } from 'express';
import db from '../../database/db.ts';
import { notifyUser } from '../utils/socket.ts';

export const createOrder = async (req: any, res: Response) => {
    const { items, total_amount } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Le panier est vide.' });
    }

    try {
        let orderId: number | string = 0;

        await db.transaction(async () => {
            const orderResult = await db.run(
                'INSERT INTO orders (buyer_id, total_amount) VALUES (?, ?)',
                [req.user.id, total_amount]
            );
            orderId = orderResult.lastInsertRowid;

            for (const item of items) {
                // Verify stock
                const product: any = await db.get('SELECT * FROM products WHERE id = ?', [item.product_id]);
                if (!product) throw new Error(`Produit ${item.product_id} introuvable.`);
                if (product.stock < item.quantity) throw new Error(`Stock insuffisant pour ${product.name}.`);

                await db.run(
                    'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
                    [orderId, item.product_id, item.quantity, item.price]
                );
                await db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );

                const content = `Nouvelle commande pour votre produit: ${product.name}`;
                await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
                    [product.producer_id, 'order', content]);
                notifyUser(product.producer_id, 'order', content);
            }

            const buyerContent = `Votre commande #${orderId} a été enregistrée.`;
            await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
                [req.user.id, 'order', buyerContent]);
            notifyUser(req.user.id, 'order', buyerContent);
        });

        res.status(201).json({ id: orderId, message: 'Commande passée avec succès.' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Erreur lors de la commande.' });
    }
};

export const getMyOrders = async (req: any, res: Response) => {
    try {
        const orders = await db.all(
            'SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des commandes.' });
    }
};

export const getOrderById = async (req: any, res: Response) => {
    try {
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) return res.status(404).json({ message: 'Commande non trouvée.' });

        const items = await db.all(`
            SELECT oi.*, p.name as product_name, p.image_url
            FROM order_items oi
                     JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);

        res.json({ ...order, items });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la commande.' });
    }
};

export const updateOrderStatus = async (req: any, res: Response) => {
    const { status } = req.body;
    const validStatuses = ['En attente', 'Payée', 'Expédiée', 'Livrée', 'Annulée'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }
    try {
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) return res.status(404).json({ message: 'Commande introuvable.' });

        await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

        // Notifier l'acheteur du changement de statut
        const { notifyUser } = await import('../utils/socket.ts');
        const msg = `Votre commande #${req.params.id} est maintenant : ${status}`;
        await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
            [(order as any).buyer_id, 'order', msg]);
        notifyUser((order as any).buyer_id, 'order', msg);

        res.json({ message: 'Statut mis à jour.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur mise à jour statut.' });
    }
};

export const getSellerOrders = async (req: any, res: Response) => {
    try {
        const orders = await db.all(`
            SELECT DISTINCT o.*, u.name as buyer_name
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN products p ON p.id = oi.product_id
            JOIN users u ON u.id = o.buyer_id
            WHERE p.producer_id = ?
            ORDER BY o.created_at DESC
        `, [req.user.id]);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Erreur récupération commandes vendeur.' });
    }
};