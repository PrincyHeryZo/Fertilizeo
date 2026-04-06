import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getMyMessages = async (req: any, res: Response) => {
    try {
        const messages = await db.all(`
            SELECT m.*,
                   s.name as sender_name,
                   r.name as receiver_name
            FROM messages m
                     JOIN users s ON m.sender_id = s.id
                     JOIN users r ON m.receiver_id = r.id
            WHERE m.sender_id = ? OR m.receiver_id = ?
            ORDER BY m.created_at ASC
        `, [req.user.id, req.user.id]);
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

        const sender: any = await db.get('SELECT name FROM users WHERE id = ?', [req.user.id]);
        await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
            [receiver_id, 'message', `Nouveau message de ${sender?.name || 'un utilisateur'}.`]);

        res.status(201).json({ id: result.lastInsertRowid, message: 'Message envoyé.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'envoi du message.' });
    }
};

export const markMessagesRead = async (req: any, res: Response) => {
    const { sender_id } = req.body;
    try {
        await db.run(
            'UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0',
            [req.user.id, sender_id]
        );
        res.json({ message: 'Messages marqués comme lus.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur mise à jour.' });
    }
};