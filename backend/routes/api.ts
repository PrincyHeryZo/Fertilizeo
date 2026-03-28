import express from 'express';
import * as authController from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/controllers/authController.ts';
import * as productController from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/controllers/productController.ts';
import * as orderController from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/controllers/orderController.ts';
import * as forumController from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/controllers/forumController.ts';
import * as messageController from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/controllers/messageController.ts';
import * as adminController from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/controllers/adminController.ts';
import { authenticateToken, authorizeRoles } from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/middleware/auth.ts';
import { validate } from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/middleware/validate.ts';
import { registerSchema, loginSchema, productSchema } from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/schemas/auth.ts';

const router = express.Router();

// Auth Routes
router.post('/auth/register', validate(registerSchema), authController.register);
router.post('/auth/login', validate(loginSchema), authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/profile', authenticateToken, authController.updateProfile);

// Product Routes
router.get('/products', productController.getAllProducts);
router.get('/products/nearby', productController.getNearbyProducts);
router.get('/products/my', authenticateToken, productController.getMyProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', authenticateToken, authorizeRoles('Producteur', 'Fournisseur', 'Administrateur'), validate(productSchema), productController.createProduct);
router.put('/products/:id', authenticateToken, productController.updateProduct);
router.delete('/products/:id', authenticateToken, productController.deleteProduct);

// Order Routes
router.post('/orders', authenticateToken, orderController.createOrder);
router.get('/orders', authenticateToken, orderController.getMyOrders);
router.get('/orders/:id', authenticateToken, orderController.getOrderById);

// Forum Routes
router.get('/forum/posts', forumController.getAllPosts);
router.post('/forum/posts', authenticateToken, forumController.createPost);
router.get('/forum/posts/:id/comments', forumController.getPostComments);
router.post('/forum/comments', authenticateToken, forumController.createComment);

// Message Routes
router.get('/messages', authenticateToken, messageController.getMyMessages);
router.post('/messages', authenticateToken, messageController.sendMessage);

// Notification Routes
import * as notificationController from '../../../../Documents/MUSIC LYRICS/Fertilizeo_clean/backend/controllers/notificationController.ts';
router.get('/notifications', authenticateToken, notificationController.getMyNotifications);
router.put('/notifications/read-all', authenticateToken, notificationController.markAllRead);

// Admin Routes
router.get('/admin/users', authenticateToken, authorizeRoles('Administrateur'), adminController.getAllUsers);
router.put('/admin/users/:id/role', authenticateToken, authorizeRoles('Administrateur'), adminController.updateUserRole);
router.get('/admin/products/pending', authenticateToken, authorizeRoles('Administrateur'), adminController.getPendingProducts);
router.put('/admin/products/:id/approve', authenticateToken, authorizeRoles('Administrateur'), adminController.approveProduct);
router.get('/admin/stats', authenticateToken, authorizeRoles('Administrateur'), adminController.getStats);

export default router;
