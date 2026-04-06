import express from 'express';
import * as authController from '../controllers/authController.ts';
import * as productController from '../controllers/productController.ts';
import * as orderController from '../controllers/orderController.ts';
import { createReview } from '../controllers/productController.ts';
import * as forumController from '../controllers/forumController.ts';
import * as messageController from '../controllers/messageController.ts';
import { markMessagesRead } from '../controllers/messageController.ts';
import * as adminController from '../controllers/adminController.ts';
import * as notificationController from '../controllers/notificationController.ts';
import * as aiController from '../controllers/aiController.ts';
import { authenticateToken, authorizeRoles } from '../middleware/auth.ts';
import { authenticateApiKey, createApiKey, listApiKeys, revokeApiKey } from '../middleware/apiKey.ts';
import { validate } from '../middleware/validate.ts';
import { registerSchema, loginSchema, productSchema } from '../schemas/auth.ts';

const router = express.Router();

// Auth
router.post('/auth/register', validate(registerSchema), authController.register);
router.post('/auth/login', validate(loginSchema), authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/profile', authenticateToken, authController.updateProfile);

// Products
router.get('/products', productController.getAllProducts);
router.get('/products/nearby', productController.getNearbyProducts);
router.get('/products/my', authenticateToken, productController.getMyProducts);
router.get('/products/:id', productController.getProductById);
router.get('/products/:id/reviews', productController.getProductReviews);
router.post('/products/:id/reviews', authenticateToken, createReview);
router.post('/products', authenticateToken, authorizeRoles('Producteur', 'Fournisseur', 'Administrateur'), validate(productSchema), productController.createProduct);
router.put('/products/:id', authenticateToken, productController.updateProduct);
router.delete('/products/:id', authenticateToken, productController.deleteProduct);

// Orders
router.post('/orders', authenticateToken, orderController.createOrder);
router.get('/orders', authenticateToken, orderController.getMyOrders);
router.get('/orders/:id', authenticateToken, orderController.getOrderById);
router.put('/orders/:id/status', authenticateToken, orderController.updateOrderStatus);
router.get('/orders/seller/mine', authenticateToken, orderController.getSellerOrders);

// Forum
router.get('/forum/posts', forumController.getAllPosts);
router.post('/forum/posts', authenticateToken, forumController.createPost);
router.get('/forum/posts/:id/comments', forumController.getPostComments);
router.post('/forum/comments', authenticateToken, forumController.createComment);

// Messages
router.get('/messages', authenticateToken, messageController.getMyMessages);
router.post('/messages', authenticateToken, messageController.sendMessage);
router.put('/messages/read', authenticateToken, markMessagesRead);

// Notifications
router.get('/notifications', authenticateToken, notificationController.getMyNotifications);
router.put('/notifications/read-all', authenticateToken, notificationController.markAllRead);

// ── IA — Chatbot interne (JWT requis) ─────────────────────────
router.post('/ai/chat', authenticateToken, aiController.chat);

// ── IA — API publique vendable (API key requise) ───────────────
router.post('/ai/query', authenticateApiKey, aiController.query);

// ── IA — Admin knowledge base ────────────────────────────────
router.get('/ai/kb/stats',  authenticateToken, authorizeRoles('Administrateur'), aiController.kbStats);
router.get('/ai/kb/search', authenticateToken, authorizeRoles('Administrateur'), aiController.kbSearch);

// ── IA — Gestion des clés API (admin) ─────────────────────────
router.post('/admin/ai/keys',         authenticateToken, authorizeRoles('Administrateur'), createApiKey);
router.get('/admin/ai/keys',          authenticateToken, authorizeRoles('Administrateur'), listApiKeys);
router.delete('/admin/ai/keys/:id',   authenticateToken, authorizeRoles('Administrateur'), revokeApiKey);

// Admin
router.get('/admin/users', authenticateToken, authorizeRoles('Administrateur'), adminController.getAllUsers);
router.put('/admin/users/:id/role', authenticateToken, authorizeRoles('Administrateur'), adminController.updateUserRole);
router.get('/admin/products/pending', authenticateToken, authorizeRoles('Administrateur'), adminController.getPendingProducts);
router.put('/admin/products/:id/approve', authenticateToken, authorizeRoles('Administrateur'), adminController.approveProduct);
router.get('/admin/stats', authenticateToken, authorizeRoles('Administrateur'), adminController.getStats);

export default router;