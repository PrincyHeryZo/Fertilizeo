// Cart utility - each user has their own cart stored separately
// Key format: cart_userId (e.g., cart_1, cart_2)
// Guests share cart_guest

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  stock: number;
}

export const getCartKey = (userId?: number): string => {
  return userId ? `cart_${userId}` : 'cart_guest';
};

export const getCart = (userId?: number): CartItem[] => {
  try {
    return JSON.parse(localStorage.getItem(getCartKey(userId)) || '[]');
  } catch {
    return [];
  }
};

export const saveCart = (items: CartItem[], userId?: number): void => {
  localStorage.setItem(getCartKey(userId), JSON.stringify(items));
};

export const getCartCount = (userId?: number): number => {
  return getCart(userId).reduce((sum, item) => sum + item.quantity, 0);
};

export const addToCart = (product: CartItem, userId?: number): { success: boolean; message: string } => {
  if (product.stock === 0) return { success: false, message: 'Produit en rupture de stock' };
  const cart = getCart(userId);
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    if (existing.quantity >= product.stock) return { success: false, message: `Stock maximum : ${product.stock}` };
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart(cart, userId);
  return { success: true, message: `${product.name} ajouté au panier !` };
};
