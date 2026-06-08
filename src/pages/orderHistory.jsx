import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import InvoiceButton from "./InvoiceButton";

const API_BASE_URL = "https://ecom-common-backend.onrender.com";

const statusStyles = {
  pending: "bg-amber-100 text-amber-700",
  packed: "bg-amber-100 text-black-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  shipped: "bg-sky-100 text-sky-700",
  out_for_delivery: "bg-indigo-100 text-indigo-400",
  delivered: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-rose-100 text-rose-700",
};

function formatOrderDate(value) {
  if (!value) return "Date unavailable";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return String(value);

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status) {
  if (!status) return "Pending";
  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeOrders(rows) {
  const groupedOrders = rows.reduce((acc, row, index) => {
    const orderId = row.order_id ?? row.id ?? `order-${index}`;

    if (!acc[orderId]) {
      acc[orderId] = {
        id: orderId,
        // status: getStatusLabel(row.order_status || row.status),
        tracking_status: getStatusLabel(
          String(row.tracking_status).toLowerCase(),
        ),
        placedOn: formatOrderDate(row.order_date || row.date || row.created_at),
        expected_delivery_date: formatOrderDate(
          row.expected_delivery_date || row.date || row.created_at,
        ),
        location: String(row.location || ""),
        paymentMethod: row.payment_method || "N/A",
        totalAmount: Number(
          row.order_total ?? row.total_amount ?? row.total ?? 0,
        ),
        deliveryAddress: row.delivery_address || "Address unavailable",
        items: [],
      };
    }

    acc[orderId].items.push({
      id: `${orderId}-${row.product_id ?? row.product_name ?? index}`,
      name: row.product_name || row.pname || "Product",
      image:
        row.product_image ||
        row.image ||
        "https://via.placeholder.com/300x300?text=Product",
      category: row.category_name || row.cname || "General",
      subcategory: row.subcategory_name || row.sname || "",
      quantity: Number(row.quantity || 0),
      price: Number(row.price || 0),
      subtotal:
        Number(row.subtotal) ||
        Number(row.quantity || 0) * Number(row.price || 0),
    });

    return acc;
  }, {});

  return Object.values(groupedOrders);
}

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [trackedOrders, setTrackedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  async function trackOrders() {
    if (!token) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/customer/tracking/track-orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      setTrackedOrders(data);
    } catch (err) {
      console.error(err);
      setTrackedOrders([]);
    }
  }

  useEffect(() => {
    trackOrders();
  }, [token]);

  useEffect(() => {
    async function getOrderHistory() {
      if (!token) {
        navigate("/login", {
          replace: true,
          state: {
            message: "Please login first to view your orders.",
          },
        });
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const response = await axios.get(
          `${API_BASE_URL}/customer/history/orderHistory`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const rows = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        setOrders(normalizeOrders(rows));
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
          navigate("/login", {
            replace: true,
            state: {
              message: "Session expired. Please login again.",
            },
          });
          return;
        }

        setOrders([]);
        setMessage(
          error.response?.data?.message || "Unable to load your orders.",
        );
      } finally {
        setLoading(false);
      }
    }

    getOrderHistory();
  }, [logout, navigate, token]);

  const totalItems = useMemo(() => {
    return orders.reduce((sum, order) => {
      return (
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);
  }, [orders]);

  if (loading) {
    return (
      <p className="text-lg font-bold text-slate-600">Loading your orders...</p>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#f7f3ea_0%,#fffdf8_42%,#edf5ff_100%)] p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,193,7,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(8,27,69,0.12),transparent_24%)]" />

      <div className="relative grid gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">
              Orders
            </span>
            <h1 className="mt-2 text-4xl font-black text-[#081b45] md:text-5xl">
              Review your recent purchases
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-600">
              Your order history .
            </p>
          </div>

          <div className="rounded-[24px] bg-white/80 px-5 py-4 shadow-[0_12px_30px_rgba(12,28,59,0.08)] backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Order Summary
            </p>
            <strong className="mt-1 block text-3xl font-black text-[#081b45]">
              {orders.length}
            </strong>
            <span className="text-sm text-slate-500">
              {totalItems} items across your recent orders
            </span>
          </div>
        </header>

        {message && (
          <div className="rounded-[22px] border border-white/60 bg-white/85 px-5 py-4 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(12,28,59,0.08)]">
            {message}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-[28px] bg-white p-8 shadow-[0_16px_40px_rgba(12,28,59,0.08)]">
            <h2 className="text-2xl font-black text-[#081b45]">
              No orders found yet
            </h2>
            <p className="mt-3 text-slate-600">
              Once you place an order, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => {
              const track = Array.isArray(trackedOrders)
                ? trackedOrders.find(
                    (t) => String(t.order_id) === String(order.id),
                  )
                : null;

              return (
                <article
                  key={order.id}
                  className="rounded-[30px] bg-white p-6 shadow-[0_16px_40px_rgba(12,28,59,0.08)] md:p-8"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-[#081b45]">
                          Order #{order.id}
                        </h2>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                            statusStyles[track?.tracking_status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {track?.tracking_status || "Not Available"}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-500">
                        Placed on {order.placedOn}
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        Expected delivery : {order.expected_delivery_date}
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        Reached Location : {track?.location || "Not available"}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:text-right">
                      <p>
                        <span className="font-black text-[#081b45]">
                          Payment:
                        </span>{" "}
                        {order.paymentMethod}
                      </p>
                      <p>
                        <span className="font-black text-[#081b45]">
                          Order Total:
                        </span>{" "}
                        Rs {order.totalAmount}
                      </p>
                      <p className="max-w-xl md:ml-auto">
                        <span className="font-black text-[#081b45]">
                          Deliver To:
                        </span>{" "}
                        {order.deliveryAddress}
                      </p>
                      <div className="flex justify-end">
                        <InvoiceButton orderId={order.id} token={token} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-4 rounded-[24px] border border-slate-100 bg-[#fcfbf7] p-4 md:grid-cols-[110px_1fr_auto]"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-28 w-full rounded-[20px] object-cover"
                        />

                        <div className="grid gap-2">
                          <h3 className="text-xl font-black text-[#081b45]">
                            {item.name}
                          </h3>
                          <p className="text-sm font-semibold text-slate-500">
                            {item.category}
                            {item.subcategory ? ` | ${item.subcategory}` : ""}
                          </p>

                          <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                            <span>Qty: {item.quantity}</span>
                            <span>Unit Price: Rs {item.price}</span>
                           
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:block">
                          <span className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                            Subtotal
                          </span>
                          <strong className="mt-2 block text-2xl font-black text-[#081b45]">
                            Rs {item.subtotal}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default OrderHistory;
