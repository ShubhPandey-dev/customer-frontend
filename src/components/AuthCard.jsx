import { Link } from "react-router-dom";

function AuthCard({ title, subtitle, alternateText, alternateLabel, alternateTo, children }) {
  return (
    <section className="grid min-h-[70vh] place-items-center">
      <div className="w-full max-w-[520px] rounded-[28px] bg-white p-7 shadow-[0_10px_30px_rgba(12,28,59,0.08)] md:p-8">
        <div className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-amber-500">Customer Auth</span>
          <h1 className="text-4xl font-black text-[#081b45]">{title}</h1>
          <p className="text-slate-500">{subtitle}</p>
        </div>

        {children}

        <p className="mt-6 text-sm text-slate-500">
          {alternateText}{" "}
          <Link className="font-bold text-[#081b45]" to={alternateTo}>
            {alternateLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}

export default AuthCard;
