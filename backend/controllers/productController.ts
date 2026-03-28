import { Request, Response } from 'express';
import db from '../../database/db.ts';

export const getAllProducts = async (req: Request, res: Response) => {
    const { category, minPrice, maxPrice, search, page = 1, limit = 8 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = 'SELECT p.*, u.name as producer_name, u.location as producer_location FROM products p JOIN users u ON p.producer_id = u.id WHERE p.is_approved = TRUE';
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
        const countQuery = `SELECT COUNT(*) as count FROM (${query}) AS subquery`;
        const totalCount = await db.get(countQuery, params) as any;

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        const productsParams = [...params, Number(limit), offset];

        const products = await db.all(query, productsParams);
        res.json({
            products,
            pagination: {
                total: Number(totalCount.count),
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(Number(totalCount.count) / Number(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des produits.' });
    }
};

export const getNearbyProducts = async (req: Request, res: Response) => {
    const { location } = req.query;
    try {
        const products = await db.all(`
            SELECT p.*, u.name as producer_name, u.location as producer_location
            FROM products p
                     JOIN users u ON p.producer_id = u.id
            WHERE p.is_approved = TRUE AND u.location LIKE ?
                LIMIT 4
        `, [`%${location}%`]);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des produits à proximité.' });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const product = await db.get(
            'SELECT p.*, u.name as producer_name FROM products p JOIN users u ON p.producer_id = u.id WHERE p.id = ?',
            [req.params.id]
        );
        if (!product) return res.status(404).json({ message: 'Produit non trouvé.' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du produit.' });
    }
};

export const createProduct = async (req: any, res: Response) => {
    const { name, description, price, category, stock, image_url } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO products (name, description, price, category, stock, image_url, producer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, category, stock, image_url, req.user.id]
        );
        res.status(201).json({ id: result.lastInsertRowid, message: "Produit créé et en attente d'approbation." });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du produit.' });
    }
};

export const updateProduct = async (req: any, res: Response) => {
    const { name, description, price, category, stock, image_url } = req.body;
    try {
        const product: any = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé.' });
        if (product.producer_id !== req.user.id && req.user.role !== 'Administrateur') {
            return res.status(403).json({ message: 'Non autorisé.' });
        }
        await db.run(
            'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ? WHERE id = ?',
            [name, description, price, category, stock, image_url, req.params.id]
        );
        res.json({ message: 'Produit mis à jour.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du produit.' });
    }
};

export const deleteProduct = async (req: any, res: Response) => {
    try {
        const product: any = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé.' });
        if (product.producer_id !== req.user.id && req.user.role !== 'Administrateur') {
            return res.status(403).json({ message: 'Non autorisé.' });
        }
        await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Produit supprimé.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du produit.' });
    }
};

export const getMyProducts = async (req: any, res: Response) => {
    try {
        const products = await db.all(
            'SELECT * FROM products WHERE producer_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de vos produits.' });
    }
};