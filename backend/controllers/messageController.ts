import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getMyMessages = async (req: any, res: Response) => {
    try {
        const messages = await db.all(`
            SELECT m.*, u.name as other_user_name 
            FROM messages m 
            JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
            WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?
            ORDER BY m.created_at DESC
        `, [req.user.id, req.user.id, req.user.id]);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des messages.' });
    }
};

export const sendMessage = async (req: any, res: Response) => {
    const { receiver_id, content } = req.body;
    try {
        const result = await db.run('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [req.user.id, receiver_id, content]);
        
        await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
            [receiver_id, 'message', `Vous avez reçu un nouveau message.`]);

        res.status(201).json({ id: result.lastInsertRowid, message: 'Message envoyé.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l’envoi du message.' });
    }
};
