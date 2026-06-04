function CategoryCard({ category }) {
  

  return (
    <button
      className="rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-[0_10px_30px_rgba(12,28,59,0.08)] transition hover:-translate-y-0.5"
      type="button"
    >
      <div className="mb-4 min-h-[120px] rounded-2xl bg-gradient-to-br from-slate-200 to-amber-100" />
      <h3 className="text-2xl font-extrabold text-[#081b45]">{category.cname}</h3>
    </button>
  );
}

export default CategoryCard;
