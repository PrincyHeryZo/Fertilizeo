import { Response } from 'express';
import db from '../../database/db.ts';

export const getMyNotifications = async (req: any, res: Response) => {
    try {
        const notifications = await db.all(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des notifications.' });
    }
};

export const markAllRead = async (req: any, res: Response) => {
    try {
        await db.run('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'Notifications marquées comme lues.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
    }
};
