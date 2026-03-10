import { Request, Response } from 'express';
import db from '../../database/db.ts';
import { notifyUser } from '../utils/socket.ts';

export const createOrder = async (req: any, res: Response) => {
    const { items, total_amount } = req.body; // items: [{product_id, quantity, price}]
    
    try {
        let orderId: number | string = 0;
        await db.transaction(async () => {
            const orderResult = await db.run('INSERT INTO orders (buyer_id, total_amount) VALUES (?, ?)', [req.user.id, total_amount]);
            orderId = orderResult.lastInsertRowid;

            for (const item of items) {
                await db.run('INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)', 
                    [orderId, item.product_id, item.quantity, item.price]);
                await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', 
                    [item.quantity, item.product_id]);
                
                // Notify producer
                const product: any = await db.get('SELECT producer_id, name FROM products WHERE id = ?', [item.product_id]);
                if (product) {
                    const content = `Nouvelle commande pour votre produit: ${product.name}`;
                    await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)', 
                        [product.producer_id, 'order', content]);
                    notifyUser(product.producer_id, 'order', content);
                }
            }

            // Create notification for the buyer
            const buyerContent = `Votre commande #${orderId} a été enregistrée.`;
            await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)', 
                [req.user.id, 'order', buyerContent]);
            notifyUser(req.user.id, 'order', buyerContent);
        });

        res.status(201).json({ id: orderId, message: 'Commande passée avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la commande.' });
    }
};

export const getMyOrders = async (req: any, res: Response) => {
    try {
        const orders = await db.all('SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC', [req.user.id]);
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
