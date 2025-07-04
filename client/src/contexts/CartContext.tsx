import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import cartService, { type Cart } from '../services/cartService';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: Cart | null;
  refreshCart: () => Promise<void>;
  setCart: React.Dispatch<React.SetStateAction<Cart | null>>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const { isAuthenticated } = useAuth();

  const refreshCart = async () => {
    if (isAuthenticated) {
      try {
        const cartData = await cartService.getCart();
        setCart(cartData);
      } catch (error) {
        setCart(null);
      }
    } else {
      setCart(null);
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await cartService.clearCart();
        setCart(null);
      } catch (error) {
        console.error('Error al vaciar el carrito:', error);
      }
    }
  };

  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line
  }, [isAuthenticated]);

  return (
    <CartContext.Provider value={{ cart, refreshCart, setCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
}; 