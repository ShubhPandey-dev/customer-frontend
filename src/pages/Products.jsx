import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";

function Products() {
  const [products, setProducts] = useState([]);
  const [searchParams] = useSearchParams();

  const selectedCategory = searchParams.get("category") || "";
  const selectedSubcategory = searchParams.get("subcategory") || "";
  const searchQuery = searchParams.get("search") || "";

  async function getProducts() {
    try {
      const res = await axios.get("http://localhost:5000/customer/products/viewproducts");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.log(error);
      setProducts([]);
    }
  }

  useEffect(() => {
    getProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase().trim();

    return products.filter((product) => {
      const categoryMatch = selectedCategory ? product.cname === selectedCategory : true;
      const subcategoryMatch = selectedSubcategory ? product.sname === selectedSubcategory : true;

      const searchableValues = [
        product.pname,
        product.name,
        product.product_name,
        product.brand,
        product.bname,
        product.brand_name,
        product.cname,
        product.category_name,
        product.sname,
        product.subcategory_name,
        product.price,
        product.final_price,
        `Rs ${product.price}`,
        `Rs ${product.final_price}`,
      ];

      const searchMatch = normalizedSearch
        ? searchableValues
            .filter((value) => value !== undefined && value !== null)
            .some((value) =>
              String(value).toLowerCase().includes(normalizedSearch)
            )
        : true;

      return categoryMatch && subcategoryMatch && searchMatch;
    });
  }, [products, searchQuery, selectedCategory, selectedSubcategory]);

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#f8f5ef_0%,#fffdf8_45%,#eef4ff_100%)] p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,196,0,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(8,27,69,0.10),transparent_24%)]" />

      <div className="relative grid gap-7">
        <div className="flex flex-col gap-4 rounded-[28px] bg-white/80 p-6 shadow-[0_16px_40px_rgba(12,28,59,0.08)] backdrop-blur md:flex-row md:items-end md:justify-between md:p-8">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#081b45] px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
                Products
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Offers applied
              </span>
            </div>

            <h2 className="text-4xl font-black leading-tight text-[#081b45] md:text-5xl">
              {searchQuery || selectedSubcategory || selectedCategory || "All products"}
            </h2>

            <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Browse products with the latest offer price, original MRP, and savings shown directly on each Product.
            </p>
          </div>

          <div className="grid gap-3 rounded-[24px] bg-[#081b45] px-5 py-4 text-white shadow-[0_16px_36px_rgba(8,27,69,0.22)]">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#c4d0ea]">
              Results
            </span>
            <strong className="text-3xl font-black">{filteredProducts.length}</strong>
            <span className="text-sm text-[#d6def2]">products in this view</span>
          </div>
        </div>

        <div className="grid items-stretch grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        </div>
      </div>
    </section>
  );
}

export default Products;
