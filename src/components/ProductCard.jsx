import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";

function ProductCard({ product }) {
  const token = useAuthStore((state) => state.token);
  const refreshCartCount = useCartStore((state) => state.refreshCartCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const finalPrice = Number(product.final_price ?? product.price ?? 0);
  const hasOffer = Number(product.discount_amount || 0) > 0;
  const originalPrice = Number(product.price || 0);
  const discountAmount = Number(product.discount_amount || 0);
  const offerLabel =
    product.discount_type === "percentage"
      ? `${Number(product.discount_value || 0)}% OFF`
      : `Rs ${Number(product.discount_value || 0)} OFF`;

  async function handleAddToCart() {
    if (!token) {
      navigate("/login", {
        state: {
          from: location,
          message: "Please login first to add products in cart.",
        },
      });
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("https://ecom-common-backend.onrender.com/customer/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Unable to add product");
      } else {
        setMessage(data.message || "Added to cart");
        refreshCartCount(token);
      }
    } catch (error) {
      console.log(error);
      setMessage("Server error");
    }

    setLoading(false);
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(12,28,59,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(12,28,59,0.14)] sm:rounded-[28px]">
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.pname || product.name || "Product"}
          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] shadow-lg sm:text-xs sm:tracking-[0.18em] ${
              hasOffer ? "bg-[#081b45] text-white" : "bg-white/90 text-[#081b45]"
            }`}
          >
            {hasOffer ? offerLabel : "Best Price"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="grid min-h-[72px] gap-1">
          <h3
            className="line-clamp-2 text-lg font-extrabold leading-tight text-[#081b45] sm:text-xl"
            title={product.pname}
          >
            {product.pname}
          </h3>

          <p
            className="line-clamp-2 text-sm font-medium text-slate-500"
            title={`${product.cname} - ${product.sname}`}
          >
            {product.cname} - {product.sname}
          </p>
        </div>

        <div className="grid min-h-[108px] content-start gap-3 rounded-[18px] bg-[linear-gradient(180deg,#fffaf0_0%,#fff_100%)] p-4 sm:rounded-[22px]">
          <div className="flex flex-wrap items-end gap-3">
            <strong className="text-2xl font-black text-[#081b45] sm:text-3xl">
              Rs {finalPrice.toFixed(2)}
            </strong>
            {hasOffer ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-700 sm:tracking-[0.16em]">
                Save Rs {discountAmount.toFixed(2)}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600 sm:tracking-[0.16em]">
                Best price
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {hasOffer && product.offer_name ? (
              <span className="line-clamp-2 text-sm font-semibold text-emerald-600">
                {product.offer_name}
              </span>
            ) : null}

            {hasOffer ? (
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                Discount Applied -
                <span className="font-bold text-emerald-700">{offerLabel}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">No active offer</span>
            )}

            {hasOffer ? (
              <span className="text-sm text-slate-400 line-through">
                Rs {originalPrice.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>

        <button
          className="mt-auto rounded-full bg-[#081b45] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0d275f] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          onClick={handleAddToCart}
          type="button"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add to Cart"}
        </button>

        {message ? (
          <p className="text-sm font-semibold text-emerald-600">{message}</p>
        ) : null}
      </div>
    </article>
  );
}

export default ProductCard;
