import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getAllPosts = async (req: Request, res: Response) => {
    try {
        const posts = await db.all(`
            SELECT fp.*, u.name as author_name,
                   (SELECT COUNT(*) FROM forum_comments fc WHERE fc.post_id = fp.id) as comment_count
            FROM forum_posts fp
            JOIN users u ON fp.author_id = u.id
            ORDER BY fp.created_at DESC
        `);
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des discussions.' });
    }
};

export const createPost = async (req: any, res: Response) => {
    const { title, content, category } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO forum_posts (author_id, title, content, category, views) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, title, content, category || 'Général', 0]
        );
        res.status(201).json({ id: result.lastInsertRowid, message: 'Discussion créée.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création de la discussion.' });
    }
};

export const getPostComments = async (req: Request, res: Response) => {
    try {
        // Increment views
        await db.run('UPDATE forum_posts SET views = views + 1 WHERE id = ?', [req.params.id]);

        const comments = await db.all(`
            SELECT fc.*, u.name as author_name
            FROM forum_comments fc
            JOIN users u ON fc.author_id = u.id
            WHERE fc.post_id = ?
            ORDER BY fc.created_at ASC
        `, [req.params.id]);
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des commentaires.' });
    }
};

export const createComment = async (req: any, res: Response) => {
    const { content, post_id } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO forum_comments (post_id, author_id, content) VALUES (?, ?, ?)',
            [post_id, req.user.id, content]
        );

        // Notify post author
        const post: any = await db.get('SELECT author_id FROM forum_posts WHERE id = ?', [post_id]);
        if (post && post.author_id !== req.user.id) {
            await db.run('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
                [post.author_id, 'forum', "Quelqu'un a répondu à votre discussion."]);
        }

        res.status(201).json({ id: result.lastInsertRowid, message: 'Commentaire ajouté.' });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de l'ajout du commentaire." });
    }
};
