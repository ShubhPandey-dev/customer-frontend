import { Link } from "react-router-dom";

const cartPreviewItems = [
  {
    id: 1,
    title: "Xiaomi 14 Pro",
    category: "Electronics",
    quantity: 1,
    price: "Rs 79999",
  },
  {
    id: 2,
    title: "Summer Linen Shirt",
    category: "Fashion",
    quantity: 2,
    price: "Rs 1499",
  },
  {
    id: 3,
    title: "Spigen Tough Armor Case",
    category: "Accessories",
    quantity: 1,
    price: "Rs 1399",
  },
];

function HomeCartSection() {
  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
            Cart Preview
          </span>
          <h2 className="mt-2 text-4xl font-black text-[#081b45] md:text-5xl">Bag summary on home</h2>
        </div>
        <strong className="text-xl font-bold text-slate-500">{cartPreviewItems.length} items</strong>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.8fr]">
        <div className="grid gap-4">
          {cartPreviewItems.map((item) => (
            <article
              key={item.id}
              className="grid items-center gap-f4 rounded-[24px] bg-white p-5 shadow-[0_10px_30px_rgba(12,28,59,0.08)] md:grid-cols-[96px_1fr]"
            >
              <div className="min-h-[88px] rounded-[18px] bg-gradient-to-br from-slate-200 to-amber-100" />
              <div>
                <h3 className="mb-2 text-2xl font-extrabold text-[#081b45]">{item.title}</h3>
                <p className="mb-2 text-slate-500">{item.category}</p>
                <span className="font-bold text-[#081b45]">
                  Qty {item.quantity} | {item.price}
                </span>
              </div>
            </article>
          ))}
        </div>

        <aside className="grid gap-4 self-start rounded-[24px] bg-white p-6 shadow-[0_10px_30px_rgba(12,28,59,0.08)]">
          <h3 className="text-2xl font-extrabold text-[#081b45]">Order snapshot</h3>
          <div className="flex items-center justify-between gap-3">
            <span>Subtotal</span>
            <strong className="text-xl font-black text-[#081b45]">Rs 84396</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Delivery</span>
            <strong className="text-xl font-black text-[#081b45]">Free</strong>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <span>Total</span>
            <strong className="text-xl font-black text-[#081b45]">Rs 84396</strong>
          </div>
          <Link
            className="rounded-full bg-amber-400 px-6 py-3 text-center text-lg font-black text-[#081b45] no-underline"
            to="/cart"
          >
            View full cart
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default HomeCartSection;
