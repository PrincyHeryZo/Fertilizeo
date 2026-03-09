import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getAllPosts = (req: Request, res: Response) => {
    try {
        const posts = db.prepare(`
            SELECT fp.*, u.name as author_name 
            FROM forum_posts fp 
            JOIN users u ON fp.user_id = u.id 
            ORDER BY fp.created_at DESC
        `).all();
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des discussions.' });
    }
};

export const createPost = (req: any, res: Response) => {
    const { title, content } = req.body;
    try {
        const result = db.prepare('INSERT INTO forum_posts (user_id, title, content) VALUES (?, ?, ?)')
            .run(req.user.id, title, content);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Discussion créée.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création de la discussion.' });
    }
};

export const getPostComments = (req: Request, res: Response) => {
    try {
        const comments = db.prepare(`
            SELECT fc.*, u.name as author_name 
            FROM forum_comments fc 
            JOIN users u ON fc.user_id = u.id 
            WHERE fc.post_id = ? 
            ORDER BY fc.created_at ASC
        `).all(req.params.id);
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des commentaires.' });
    }
};

export const createComment = (req: any, res: Response) => {
    const { content, post_id } = req.body;
    try {
        const result = db.prepare('INSERT INTO forum_comments (post_id, user_id, content) VALUES (?, ?, ?)')
            .run(post_id, req.user.id, content);
        
        // Notify post author
        const post: any = db.prepare('SELECT user_id FROM forum_posts WHERE id = ?').get(post_id);
        if (post && post.user_id !== req.user.id) {
            db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
                .run(post.user_id, 'forum', `Quelqu'un a répondu à votre discussion.`);
        }

        res.status(201).json({ id: result.lastInsertRowid, message: 'Commentaire ajouté.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l’ajout du commentaire.' });
    }
};
