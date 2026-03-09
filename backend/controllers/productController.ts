import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getAllProducts = (req: Request, res: Response) => {
    const { category, minPrice, maxPrice, search } = req.query;
    let query = 'SELECT p.*, u.name as producer_name FROM products p JOIN users u ON p.producer_id = u.id WHERE p.is_approved = 1';
    const params: any[] = [];

    if (category) {
        query += ' AND p.category = ?';
        params.push(category);
    }
    if (minPrice) {
        query += ' AND p.price >= ?';
        params.push(Number(minPrice));
    }
    if (maxPrice) {
        query += ' AND p.price <= ?';
        params.push(Number(maxPrice));
    }
    if (search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    try {
        const products = db.prepare(query).all(...params);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des produits.' });
    }
};

export const getProductById = (req: Request, res: Response) => {
    try {
        const product = db.prepare('SELECT p.*, u.name as producer_name FROM products p JOIN users u ON p.producer_id = u.id WHERE p.id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé.' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du produit.' });
    }
};

export const createProduct = (req: any, res: Response) => {
    const { name, description, price, category, stock, image_url } = req.body;
    try {
        const result = db.prepare(
            'INSERT INTO products (name, description, price, category, stock, image_url, producer_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(name, description, price, category, stock, image_url, req.user.id);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Produit créé et en attente d’approbation.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du produit.' });
    }
};

export const updateProduct = (req: any, res: Response) => {
    const { name, description, price, category, stock, image_url } = req.body;
    try {
        const product: any = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé.' });
        if (product.producer_id !== req.user.id && req.user.role !== 'Administrateur') {
            return res.status(403).json({ message: 'Non autorisé.' });
        }

        db.prepare(
            'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ? WHERE id = ?'
        ).run(name, description, price, category, stock, image_url, req.params.id);
        res.json({ message: 'Produit mis à jour.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du produit.' });
    }
};

export const deleteProduct = (req: any, res: Response) => {
    try {
        const product: any = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé.' });
        if (product.producer_id !== req.user.id && req.user.role !== 'Administrateur') {
            return res.status(403).json({ message: 'Non autorisé.' });
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
        res.json({ message: 'Produit supprimé.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du produit.' });
    }
};
