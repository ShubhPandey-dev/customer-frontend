import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";

const FREE_DELIVERY_THRESHOLD = 599;
const DELIVERY_CHARGE = 49;

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loadError, setLoadError] = useState("");

  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const setCartCount = useCartStore((state) => state.setCartCount);
  const refreshCartCount = useCartStore((state) => state.refreshCartCount);

  const navigate = useNavigate();

  function syncCountFromItems(items) {
    const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    setCartCount(count);
  }

  async function getCartItems() {
    setLoadError("");
    try {
      const res = await axios.get("http://localhost:5000/customer/cart/viewCart", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const items = Array.isArray(res.data) ? res.data : [];
      const processed = items.map((item) => {
        const unitPrice = Number(item.final_price ?? item.price ?? 0);
        const subtotal = Number(
          item.subtotal ?? unitPrice * Number(item.quantity || 0)
        );
        const gst = Number(
          item.gst_amount ?? (subtotal * Number(item.gst_percentage || 0)) / 100
        );
        const total = Number(item.total ?? subtotal + gst);

        return {
          ...item,
          unit_price: unitPrice,
          subtotal,
          gst_amount: gst,
          total,
        };
      });

      setCartItems(processed);
      syncCountFromItems(processed);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        setCartCount(0);
        navigate("/login", { replace: true });
        return;
      }
      console.log(error);
      setLoadError(error.response?.data?.message || "Unable to load cart items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      getCartItems();
    } else {
      setLoading(false);
    }
  }, [token]);

  async function updateQuantity(item, nextQuantity) {
    if (!item.cart_item_id || nextQuantity < 1) return;

    setActionLoadingId(item.cart_item_id);

    try {
      await axios.patch(
        `http://localhost:5000/customer/cart/item/${item.cart_item_id}`,
        { quantity: nextQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedItems = cartItems.map((cartItem) => {
        if (cartItem.cart_item_id === item.cart_item_id) {
          const subtotal =
            Number(cartItem.unit_price || cartItem.final_price || cartItem.price || 0) *
            nextQuantity;
          const gst = (subtotal * Number(cartItem.gst_percentage || 0)) / 100;
          const total = subtotal + gst;

          return {
            ...cartItem,
            quantity: nextQuantity,
            subtotal,
            gst_amount: gst,
            total,
          };
        }
        return cartItem;
      });

      setCartItems(updatedItems);
      syncCountFromItems(updatedItems);
    } catch (error) {
      console.log(error);
      refreshCartCount(token);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function removeItem(item) {
    if (!item.cart_item_id) return;

    setActionLoadingId(item.cart_item_id);

    try {
      await axios.delete(`http://localhost:5000/customer/cart/item/${item.cart_item_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedItems = cartItems.filter(
        (cartItem) => cartItem.cart_item_id !== item.cart_item_id
      );

      setCartItems(updatedItems);
      syncCountFromItems(updatedItems);
    } catch (error) {
      console.log(error);
      refreshCartCount(token);
    } finally {
      setActionLoadingId(null);
    }
  }

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    [cartItems]
  );

  const gstTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.gst_amount || 0), 0),
    [cartItems]
  );

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [cartItems]
  );

  const savingsTotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const original = Number(item.price || 0) * Number(item.quantity || 0);
        const discounted =
          Number(item.unit_price || item.final_price || item.price || 0) *
          Number(item.quantity || 0);
        return sum + Math.max(0, original - discounted);
      }, 0),
    [cartItems]
  );

  const deliveryCharge = useMemo(() => {
    if (total === 0) return 0;
    return total < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  }, [total]);

  const finalTotal = total + deliveryCharge;

  const totalUnits = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  );

  if (loading) {
    return <p className="text-lg font-bold text-slate-600">Loading cart...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h2 className="text-2xl font-black">Cart unavailable</h2>
        <p className="mt-2 text-sm font-medium">{loadError}</p>
      </div>
    );
  }

  return (
    <section className="grid gap-7">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
            Cart
          </span>
          <h2 className="mt-2 text-4xl font-black text-[#081b45] md:text-5xl">
            Your selected products
          </h2>
        </div>
        <strong className="text-xl font-bold text-slate-500">{totalUnits} items</strong>
      </div>

      {cartItems.length === 0 ? (
        <div className="rounded-[28px] bg-white p-8 shadow-[0_10px_30px_rgba(12,28,59,0.08)]">
          <p className="text-lg text-slate-600">Cart is empty.</p>
          <Link
            className="mt-4 inline-block rounded-full bg-amber-400 px-6 py-3 font-black text-[#081b45]"
            to="/products"
          >
            Go to products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="grid gap-5">
            {cartItems.map((item) => {
              const isBusy = actionLoadingId === item.cart_item_id;
              const hasOffer = Number(item.discount_amount || 0) > 0;
              const offerLabel =
                item.discount_type === "percentage"
                  ? `${Number(item.discount_value || 0)}% OFF`
                  : `Rs ${Number(item.discount_value || 0)} OFF`;

              return (
                <article
                  key={item.cart_item_id}
                  className="grid min-h-[240px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(12,28,59,0.08)] md:grid-cols-[220px_1fr]"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-52 w-full object-cover md:h-full"
                  />

                  <div className="flex h-full flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-2xl font-extrabold text-[#081b45]">
                          {item.pname}
                        </h3>
                        <p className="mt-1 truncate text-sm font-medium text-slate-500">
                          {item.cname} - {item.sname}
                        </p>
                      </div>

                      {hasOffer ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                          {offerLabel}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-3 rounded-[22px] bg-[linear-gradient(180deg,#fffaf0_0%,#fff_100%)] p-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <strong className="text-3xl font-black text-[#081b45]">
                          Rs {Number(item.unit_price || item.final_price || item.price || 0).toFixed(2)}
                        </strong>
                        {hasOffer ? (
                          <span className="text-sm font-semibold text-slate-500 line-through">
                            Rs {Number(item.price || 0).toFixed(2)}
                          </span>
                        ) : null}
                      </div>

                      {hasOffer ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-700">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 font-black uppercase tracking-[0.14em]">
                            Save Rs {Number(item.discount_amount).toFixed(2)}
                          </span>
                          {item.offer_name ? <span>{item.offer_name} · {offerLabel}</span> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-500">
                        GST ({item.gst_percentage}%)
                      </span>
                      <strong className="font-black text-[#081b45]">
                        Rs {item.gst_amount.toFixed(2)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between rounded-[18px] bg-[#081b45] px-4 py-3 text-white">
                      <span className="text-sm font-semibold text-[#d6def2]">Line total</span>
                      <strong className="text-xl font-black">
                        Rs {item.total.toFixed(2)}
                      </strong>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                        <button
                          className="h-9 w-9 rounded-full bg-slate-100 text-lg font-black text-[#081b45] transition hover:bg-slate-200 disabled:opacity-40"
                          onClick={() => updateQuantity(item, item.quantity - 1)}
                          disabled={isBusy || item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center font-black text-[#081b45]">
                          {item.quantity}
                        </span>
                        <button
                          className="h-9 w-9 rounded-full bg-slate-100 text-lg font-black text-[#081b45] transition hover:bg-slate-200 disabled:opacity-40"
                          onClick={() => updateQuantity(item, item.quantity + 1)}
                          disabled={isBusy}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                        onClick={() => removeItem(item)}
                        disabled={isBusy}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="grid gap-4 self-start rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#081b45_0%,#132f66_100%)] p-7 text-white shadow-[0_18px_45px_rgba(8,27,69,0.22)]">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.28em] text-[#c4d0ea]">
                Order Summary
              </span>
              <h3 className="mt-2 text-3xl font-black">Price breakdown</h3>
            </div>

            {savingsTotal > 0 ? (
              <div className="rounded-[20px] bg-white/10 px-4 py-3 text-sm font-semibold text-[#d6def2]">
                You saved Rs {savingsTotal.toFixed(2)} on this cart
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-[18px] bg-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-[#d6def2]">Unit Subtotal</span>
              <strong className="text-xl font-black text-white">
                Rs {subtotal.toFixed(2)}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-[18px] bg-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-[#d6def2]">GST</span>
              <strong className="text-xl font-black text-white">
                Rs {gstTotal.toFixed(2)}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-[18px] bg-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-[#d6def2]">Shipping</span>
              <strong className="text-xl font-black text-white">
                {deliveryCharge > 0 ? `Rs ${deliveryCharge}` : "Free"}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-[18px] bg-amber-400 px-4 py-3 text-[#081b45]">
              <span className="text-sm font-black uppercase tracking-[0.14em]">Total</span>
              <strong className="text-2xl font-black">
                Rs {finalTotal.toFixed(2)}
              </strong>
            </div>

            <Link
              className="rounded-full bg-amber-400 px-6 py-3 text-center text-lg font-black text-[#081b45] transition hover:bg-amber-300"
              to="/checkout"
            >
              Proceed to checkout
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}

export default Cart;
