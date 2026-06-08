import { create } from "zustand";
import axios from "axios";

const useCartStore = create((set) => ({
  cartCount: 0,

  setCartCount: (count) => set({ cartCount: count }),

  refreshCartCount: async (token) => {
    if (!token) {
      set({ cartCount: 0 });
      return;
    }

    try {
      const res = await axios.get("http://https://ecom-common-backend.onrender.com:5000/customer/cart/viewCart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const items = Array.isArray(res.data) ? res.data : [];
      const nextCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      set({ cartCount: nextCount });
    } catch (error) {
      if (error.response?.status === 401) {
        set({ cartCount: 0 });
        return;
      }
      console.log(error);
    }
  },
}));

export default useCartStore;
