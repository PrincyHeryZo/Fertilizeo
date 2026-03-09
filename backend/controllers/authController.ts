import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../database/db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export const register = async (req: Request, res: Response) => {
    const { name, email, password, phone, location, role } = req.body;

    try {
        const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = db.prepare(
            'INSERT INTO users (name, email, password, phone, location, role) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(name, email, hashedPassword, phone, location, role);

        const token = jwt.sign({ id: result.lastInsertRowid, role, email }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            token,
            user: { id: result.lastInsertRowid, name, email, role, phone, location }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l’inscription.' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(400).json({ message: 'Identifiants invalides.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Identifiants invalides.' });
        }

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la connexion.' });
    }
};

export const getProfile = (req: any, res: Response) => {
    try {
        const user = db.prepare('SELECT id, name, email, role, phone, location FROM users WHERE id = ?').get(req.user.id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du profil.' });
    }
};

export const updateProfile = (req: any, res: Response) => {
    const { name, phone, location } = req.body;
    try {
        db.prepare('UPDATE users SET name = ?, phone = ?, location = ? WHERE id = ?')
            .run(name, phone, location, req.user.id);
        res.json({ message: 'Profil mis à jour avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du profil.' });
    }
};
