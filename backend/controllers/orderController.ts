import { Request, Response } from 'express';
import db from '../../database/db.ts';
import { notifyUser } from '../utils/socket.ts';

export const createOrder = (req: any, res: Response) => {
    const { items, total_amount } = req.body; // items: [{product_id, quantity, price}]
    
    const transaction = db.transaction(() => {
        const orderResult = db.prepare('INSERT INTO orders (buyer_id, total_amount) VALUES (?, ?)').run(req.user.id, total_amount);
        const orderId = orderResult.lastInsertRowid;

        const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)');
        const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

        for (const item of items) {
            insertItem.run(orderId, item.product_id, item.quantity, item.price);
            updateStock.run(item.quantity, item.product_id);
            
            // Notify producer
            const product: any = db.prepare('SELECT producer_id, name FROM products WHERE id = ?').get(item.product_id);
            if (product) {
                const content = `Nouvelle commande pour votre produit: ${product.name}`;
                db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
                    .run(product.producer_id, 'order', content);
                notifyUser(product.producer_id, 'order', content);
            }
        }

        // Create notification for the buyer
        const buyerContent = `Votre commande #${orderId} a été enregistrée.`;
        db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
            .run(req.user.id, 'order', buyerContent);
        notifyUser(req.user.id, 'order', buyerContent);

        return orderId;
    });

    try {
        const orderId = transaction();
        res.status(201).json({ id: orderId, message: 'Commande passée avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la commande.' });
    }
};

export const getMyOrders = (req: any, res: Response) => {
    try {
        const orders = db.prepare('SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC').all(req.user.id);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des commandes.' });
    }
};

export const getOrderById = (req: any, res: Response) => {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ message: 'Commande non trouvée.' });
        
        const items = db.prepare(`
            SELECT oi.*, p.name as product_name, p.image_url 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `).all(req.params.id);

        res.json({ ...order, items });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la commande.' });
    }
};
