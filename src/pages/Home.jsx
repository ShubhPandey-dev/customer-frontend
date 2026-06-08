import { useState,useEffect } from "react";
import axios from "axios";
import CategorySection from "../components/CategorySection";
import HomeCartSection from "../components/HomeCartSection";
import ProductCard from "../components/ProductCard";

const promoCards = [
  // { title: "Smart Watches", subtitle: "Starting at Rs 200" },
  // { title: "Summer Fashion", subtitle: "Up to 60% off" },
  // { title: "Home Refresh", subtitle: "Top picks under Rs 130" },
];

const featureHighlights = [
  {
    title: "Fast delivery",
    description: "",
  },
  {
    title: "Premium support",
    description: "",
  },
  {
    title: "Curated offers",
    description: "",
  },
];

function Home() {

  const [products, setProducts] = useState([]);

  async function getProducts(){
    const res = await axios.get(
      "http://https://ecom-common-backend.onrender.com:5000/customer/products/viewproducts"
    );
    setProducts(res.data);
  }

  useEffect(()=>{
    getProducts();
  },[]);

  return (
    <section className="grid gap-11">

      <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">

        <section className="rounded-[28px] bg-[linear-gradient(135deg,#0f83d7,#4739ea_56%,#f8bf2e)] p-8 text-white shadow-[0_10px_30px_rgba(12,28,59,0.08)] md:p-10">
          <span className="text-xs font-black uppercase tracking-[0.3em]">
            New user offer
          </span>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            Discover deals that feel premium, built for your daily essentials.
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-white/90">
            Shop the latest gadgets, fashion, and home refreshes with lightning-fast checkout
            and curated collections.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button className="rounded-full bg-amber-400 px-6 py-3 text-lg font-black text-[#081b45]">
              Shop Deals
            </button>

            <button className="rounded-full border border-white/35 bg-white/10 px-6 py-3 text-lg font-black text-white">
              Browse Categories
            </button>
          </div>
        </section>

        <div className="grid gap-5">
          {promoCards.map((promo) => (
            <article
              key={promo.title}
              className="min-h-[146px] rounded-[24px] bg-white px-7 py-8 shadow-[0_10px_30px_rgba(12,28,59,0.08)]"
            >
              <h3 className="mb-2 text-2xl font-extrabold text-[#081b45]">
                {promo.title}
              </h3>
              <p className="text-lg text-slate-500">{promo.subtitle}</p>
            </article>
          ))}
        </div>

      </div>

      <CategorySection />

      {/* Products Section */}

      <section className="grid gap-6">

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">

          <div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
              Spotlight
            </span>

            <h2 className="mt-2 text-4xl font-black text-[#081b45] md:text-5xl">
              Featured products
            </h2>
          </div>

          <strong className="text-xl font-bold text-slate-500">
            {products.length} results
          </strong>

        </div>

        <div className="grid items-stretch grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}

        </div>

      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {featureHighlights.map((highlight) => (
          <article
            key={highlight.title}
            className="rounded-[24px] bg-white p-6 shadow-[0_10px_30px_rgba(12,28,59,0.08)]"
          >
            <h3 className="mb-2 text-2xl font-extrabold text-[#081b45]">
              {highlight.title}
            </h3>
            <p className="text-slate-500">{highlight.description}</p>
          </article>
        ))}
      </section>

      <HomeCartSection />

    </section>
  );
}

export default Home;

