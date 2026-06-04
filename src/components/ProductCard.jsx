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

      const response = await fetch("http://localhost:5000/customer/cart/add", {
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
    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(12,28,59,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(12,28,59,0.14)]">
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] shadow-lg ${
              hasOffer
                ? "bg-[#081b45] text-white"
                : "bg-white/92 text-[#081b45]"
            }`}
          >
 {hasOffer ? offerLabel : "Best Price"}{" "}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="grid min-h-[72px] gap-1">
          <h3
            className="truncate text-xl font-extrabold leading-tight text-[#081b45]"
            title={product.pname}
          >
            {product.pname}
          </h3>

          <p
            className="truncate text-sm font-medium text-slate-500"
            title={`${product.cname} - ${product.sname}`}
          >
            {product.cname} - {product.sname}
          </p>
        </div>

        <div className="grid min-h-[108px] content-start gap-3 rounded-[22px] bg-[linear-gradient(180deg,#fffaf0_0%,#fff 100%)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <strong className="text-3xl font-black text-[#081b45]">
              Rs {finalPrice.toFixed(2)}
            </strong>
            {hasOffer ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Save Rs {discountAmount.toFixed(2)}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                Best price
              </span>
            )}
          </div>

        <div className="flex flex-col gap-1">

  {/* 🔥 FIRST LINE: PRICE + OFFER NAME */}
  <div className="flex items-center gap-2">
    {/* <strong className="text-3xl font-black text-[#081b45]">
      Rs {finalPrice.toFixed(2)}
    </strong> */}

    {hasOffer && (
      <span className="text-sm font-semibold text-emerald-600">
        {product.offer_name}
      </span>
    )}
  </div>

  {/* 🔥 SECOND LINE: DISCOUNT INFO */}
  {hasOffer ? (
<span className="flex items-center gap-2 text-m font-semibold text-black-600">
  Discount Applied · 
  <span className="font-bold text-emerald-700">
    {offerLabel}
  </span>
</span>
  ) : (
    <span className="text-xs text-slate-500">
      No active offer
    </span>
  )}

  {/* 🔥 STRIKE PRICE BELOW */}
  <span className="text-sm text-slate-400 line-through">
    Rs {originalPrice.toFixed(2)}
  </span>

</div>
{/* 
          {hasOffer ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[#081b45]">
                Discount applied
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {offerLabel}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                No extra discount
              </span>
            </div>
          )} */}
        </div>

        <button
          className="mt-auto rounded-full bg-[#081b45] px-5 py-3 text-base font-black text-white transition hover:bg-[#0d275f] disabled:cursor-not-allowed disabled:opacity-60"
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
