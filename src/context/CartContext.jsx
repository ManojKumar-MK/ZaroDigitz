import { createContext, useContext, useReducer } from 'react';
import { clampQty, priceForQty } from '../utils/pricing';

const CartContext = createContext();

// Every line is simply price x quantity (any quantity from 1);
// 200...) and its per-card price follows the quantity tiers. basePrice is the price before
// tiers, so lowering the quantity raises the per-card price again.
function line(item, quantity) {
  const qty = clampQty(item, quantity);
  return { ...item, quantity: qty, price: priceForQty(item, qty) };
}

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        const extra = action.payload.quantity || existing.qtyStep || 0;
        return { ...state, items: state.items.map(i => (i.id === action.payload.id ? line(i, i.quantity + extra) : i)) };
      }
      const item = { ...action.payload, basePrice: action.payload.basePrice ?? action.payload.price };
      return { ...state, items: [...state.items, line(item, action.payload.quantity || 0)] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    case 'UPDATE_QUANTITY':
      return { ...state, items: state.items.map(i => (i.id === action.payload.id ? line(i, action.payload.quantity) : i)) };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (id) => dispatch({ type: 'REMOVE_ITEM', payload: id });
  const updateQuantity = (id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  // Badge counts designs, not individual cards (one order of 300 cards is one item).
  const totalItems = state.items.length;
  const totalCards = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart: state.items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalCards, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
