import { useEffect, useState } from "react";
import CategoryCard from "./CategoryCard";

// const categoryItems = [
//   { id: 1, title: "Automotive" },
//   { id: 2, title: "Beauty" },
//   { id: 3, title: "Books" },
//   { id: 4, title: "Electronics" },
//   { id: 5, title: "Fashion" },
//   { id: 6, title: "Grocery" },
// ];

function CategorySection() {
  const [category , setCategory] = useState([]);

  async function getCategory(){
    try {
      let result = await fetch('http://https://ecom-common-backend.onrender.com:5000/customer/category/viewcategory');
      let res = await result.json();
      setCategory(Array.isArray(res) ? res : []);
    } catch (error) {
      console.log(error);
      setCategory([]);
    }
  }
  useEffect(()=>{
    getCategory()
  },[])
  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Browse</span>
          <h2 className="mt-2 text-4xl font-black text-[#081b45] md:text-5xl">Shop by category</h2>
        </div>
        <strong className="text-xl font-bold text-slate-500">{category.length}</strong>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {category.map((item) => (
          <CategoryCard key={item.id} category={item} />
        ))}
      </div>
    </section>
  );
}

export default CategorySection;
