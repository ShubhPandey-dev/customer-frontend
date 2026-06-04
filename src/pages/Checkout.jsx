import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import * as Yup from "yup";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";

const API_BASE_URL = "http://localhost:5000";
const FREE_DELIVERY_THRESHOLD = 599;
const DELIVERY_CHARGE = 49;

const initialAddressForm = {
  name: "",
  email: "",
  phone: "",
  full_address: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

const addressSchema = Yup.object({
  name: Yup.string().required("Name is required").min(2, "Name must be at least 2 characters"),
  email: Yup.string().email("Invalid email format").required("Email is required"),
  phone: Yup.string().matches(/^[0-9]{10}$/, "Enter valid 10 digit number").required("Phone number is required"),
  full_address: Yup.string().required("Full address is required").min(5, "Address must be at least 5 characters"),
  landmark: Yup.string(),
  city: Yup.string().required("City is required").min(2, "City must be at least 2 characters"),
  state: Yup.string().required("State is required").min(2, "State must be at least 2 characters"),
  pincode: Yup.string().matches(/^[0-9]{6}$/, "Invalid pincode (6 digits required)").required("Pincode is required"),
});

function Checkout() {
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [message, setMessage] = useState("");

  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const setCartCount = useCartStore((state) => state.setCartCount);
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const getAuthConfig = useCallback(() => {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }, [token]);

  const handleSessionExpired = useCallback(() => {
    logout();
    setCartCount(0);
    navigate("/login", {
      replace: true,
      state: { message: "Session expired. Please login again." },
    });
  }, [logout, navigate, setCartCount]);

  const fetchAddresses = useCallback(async () => {
    const res = await axios.post(`${API_BASE_URL}/customer/address/getadress`, {}, getAuthConfig());
    const savedAddresses = Array.isArray(res.data) ? res.data : [];

    setAddresses(savedAddresses);

    if (savedAddresses.length > 0) {
      setSelectedAddressId((currentSelectedId) => {
        const selectedStillExists = savedAddresses.some((address) => address.id === currentSelectedId);
        return selectedStillExists ? currentSelectedId : savedAddresses[0].id;
      });
      setShowAddressForm(false);
    } else {
      setSelectedAddressId(null);
      setShowAddressForm(true);
    }

    return savedAddresses;
  }, [getAuthConfig]);

  const formik = useFormik({
    initialValues: initialAddressForm,
    validationSchema: addressSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { resetForm }) => {
      const savedAddressId = await saveAddress(values);
      if (savedAddressId) {
        resetForm();
        setShowAddressForm(false);
      }
    },
  });

  async function handleAddressInputChange(event) {
    const { name, value } = event.target;
    formik.handleChange(event);

    if (name === "pincode") {
      if (value.length === 6 && /^[0-9]+$/.test(value)) {
        try {
          setMessage("Fetching location...");
          const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
          const data = await res.json();

          if (data[0].Status === "Success") {
            const postOffice = data[0].PostOffice[0];
            formik.setFieldValue("city", postOffice.District);
            formik.setFieldValue("state", postOffice.State);
            setMessage("");
          } else {
            setMessage("Invalid Pincode");
          }
        } catch {
          setMessage("Error fetching pincode data");
        }
      } else if (value.length < 6) {
        setMessage("");
      }
    }
  }

  async function saveAddress(addressData) {
    setSavingAddress(true);
    setMessage("");

    try {
      const payload = {
        ...addressData,
        name: addressData.name.trim(),
        email: addressData.email.trim(),
        phone: addressData.phone.trim(),
        full_address: addressData.full_address.trim(),
        landmark: addressData.landmark.trim(),
        city: addressData.city.trim(),
        state: addressData.state.trim(),
        pincode: addressData.pincode.trim(),
        is_default: addresses.length === 0 ? true : addressData.is_default,
      };

      const res = await axios.post(`${API_BASE_URL}/customer/address/addadress`, payload, getAuthConfig());
      const savedAddressId = res.data?.address_id;

      await fetchAddresses();
      if (savedAddressId) setSelectedAddressId(savedAddressId);

      setMessage(res.data?.message || "Address saved successfully.");
      return savedAddressId || true;
    } catch (error) {
      if (error.response?.status === 401) {
        handleSessionExpired();
        return null;
      }
      setMessage(error.response?.data?.message || "Unable to save address.");
      return null;
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(addressId, userId) {
    try {
      setMessage("");
      await axios.post(`${API_BASE_URL}/customer/address/deleteadress/${addressId}/${userId}`, {}, getAuthConfig());

      const updatedAddresses = await fetchAddresses();
      if (!updatedAddresses.length) setShowAddressForm(true);

      setMessage("Address deleted successfully.");
    } catch (error) {
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      setMessage(error.response?.data?.message || "Unable to delete address.");
    }
  }

  useEffect(() => {
    async function loadCheckoutData() {
      if (!token) {
        navigate("/login", {
          replace: true,
          state: { message: "Please login first to continue checkout." },
        });
        return;
      }

      try {
        const [cartRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/customer/cart/viewCart`, getAuthConfig()),
          fetchAddresses(),
        ]);

        const items = Array.isArray(cartRes.data) ? cartRes.data : [];
        setCartItems(
          items.map((item) => ({
            ...item,
            unit_price: Number(item.final_price ?? item.price ?? 0),
            subtotal: Number(item.subtotal ?? Number(item.final_price ?? item.price ?? 0) * Number(item.quantity || 0)),
            gst_amount: Number(item.gst_amount ?? 0),
            total: Number(item.total ?? 0),
          }))
        );
      } catch (error) {
        if (error.response?.status === 401) {
          handleSessionExpired();
          return;
        }
        setMessage(error.response?.data?.message || "Unable to load checkout details.");
      } finally {
        setLoading(false);
      }
    }

    loadCheckoutData();
  }, [fetchAddresses, getAuthConfig, handleSessionExpired, navigate, token]);

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0), [cartItems]);
  const gstTotal = useMemo(() => cartItems.reduce((sum, item) => sum + Number(item.gst_amount || 0), 0), [cartItems]);
  const savingsTotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const original = Number(item.price || 0) * Number(item.quantity || 0);
        const discounted = Number(item.unit_price || item.final_price || item.price || 0) * Number(item.quantity || 0);
        return sum + Math.max(0, original - discounted);
      }, 0),
    [cartItems]
  );
  const itemsTotal = subtotal + gstTotal;
  const deliveryCharge = useMemo(() => {
    if (itemsTotal === 0) return 0;
    return itemsTotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  }, [itemsTotal]);
  const finalTotal = itemsTotal + deliveryCharge;
  const totalItems = useMemo(() => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [cartItems]);
  const selectedAddress = useMemo(() => addresses.find((address) => address.id === selectedAddressId) || null, [addresses, selectedAddressId]);

  async function handlePlaceOrder() {
    if (!cartItems.length || placingOrder) return;

    let activeAddressId = selectedAddressId;

    if (!activeAddressId && showAddressForm) {
      const errors = await formik.validateForm();
      if (Object.keys(errors).length > 0) {
        setMessage("Fix address errors first");
        return;
      }

      const savedAddressId = await saveAddress(formik.values);
      if (!savedAddressId) return;
      activeAddressId = savedAddressId;
    }

    if (!activeAddressId) {
      setMessage("Select address first");
      return;
    }

    setPlacingOrder(true);
    setMessage("");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/customer/checkout/viewcheckout`,
        {
          payment_method: paymentMethod,
          address_id: activeAddressId,
        },
        getAuthConfig()
      );

      const orderId = res.data.order_id;

      if (paymentMethod === "online") {
        const paymentRes = await axios.post(
          `${API_BASE_URL}/api/payment/create-payment`,
          { order_id: orderId },
          getAuthConfig()
        );

        const paymentData = paymentRes.data;
        const options = {
          key: paymentData.key,
          amount: paymentData.amount,
          currency: "INR",
          order_id: paymentData.razorpayOrderId,
          handler: async function (response) {
            try {
              await axios.post(`${API_BASE_URL}/api/payment/verify-payment`, response, getAuthConfig());
              setCartItems([]);
              setCartCount(0);
              setMessage("Order confirmed");
              setTimeout(() => navigate("/orders"), 1500);
            } catch {
              setMessage("Payment verification failed");
            }
          },
          modal: {
            ondismiss: function () {
              setMessage("Payment cancelled");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setCartItems([]);
        setCartCount(0);
        setMessage("Order placed successfully (COD)");
        setTimeout(() => navigate("/orders"), 1500);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Order failed");
    } finally {
      setPlacingOrder(false);
    }
  }

  if (loading) {
    return <p className="text-lg font-bold text-slate-600">Loading checkout...</p>;
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#f8f5ef_0%,#fffdf8_40%,#eef4ff_100%)] p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,196,0,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(8,27,69,0.12),transparent_28%)]" />

      <div className="relative grid gap-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">
              Checkout
            </span>
            <h1 className="mt-2 text-4xl font-black leading-tight text-[#081b45] md:text-5xl">
              Confirm your order with delivery details
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Original price, offer price, and final payable total are shown together so the discount stays clear.
            </p>
          </div>

          <div className="rounded-[24px] bg-white/80 px-5 py-4 shadow-[0_12px_30px_rgba(12,28,59,0.08)] backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Cart Snapshot
            </p>
            <strong className="mt-1 block text-3xl font-black text-[#081b45]">
              {totalItems} items
            </strong>
            <span className="text-sm text-slate-500">Subtotal Rs {subtotal.toFixed(2)}</span>
          </div>
        </div>

        {message ? (
          <div className="rounded-[22px] border border-white/60 bg-white/85 px-5 py-4 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(12,28,59,0.08)]">
            {message}
          </div>
        ) : null}

        {cartItems.length === 0 ? (
          <div className="rounded-[28px] bg-white p-8 shadow-[0_16px_40px_rgba(12,28,59,0.08)]">
            <h2 className="text-2xl font-black text-[#081b45]">Your cart is empty</h2>
            <p className="mt-3 text-slate-600">Add products before moving ahead with checkout.</p>
            <Link
              className="mt-5 inline-block rounded-full bg-[#081b45] px-6 py-3 font-black text-white no-underline"
              to="/products"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <section className="rounded-[30px] bg-white p-6 shadow-[0_16px_40px_rgba(12,28,59,0.08)] md:p-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                      Delivery Address
                    </span>
                    <h2 className="mt-2 text-3xl font-black text-[#081b45]">
                      Choose saved address
                    </h2>
                  </div>
                  <button
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-bold text-[#081b45] transition hover:border-amber-400 hover:bg-amber-50"
                    type="button"
                    onClick={() => {
                      setShowAddressForm((current) => !current);
                      setMessage("");
                      if (!showAddressForm) formik.resetForm();
                    }}
                  >
                    {showAddressForm ? "Hide form" : "Add new address"}
                  </button>
                </div>

                {addresses.length ? (
                  <div className="mt-6 grid gap-4">
                    {addresses.map((address) => {
                      const isSelected = selectedAddressId === address.id;
                      return (
                        <article
                          key={address.id}
                          className={`rounded-[24px] border p-5 transition ${
                            isSelected
                              ? "border-[#081b45] bg-[#f4f7ff] shadow-[0_12px_25px_rgba(8,27,69,0.10)]"
                              : "border-slate-200 bg-[#fcfbf7]"
                          }`}
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <label className="flex cursor-pointer gap-3">
                              <input
                                type="radio"
                                name="selected_address"
                                checked={isSelected}
                                onChange={() => setSelectedAddressId(address.id)}
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-black text-[#081b45]">{address.name}</h3>
                                  {Number(address.is_default) === 1 ? (
                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                                      Default
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm font-semibold text-slate-600">{address.phone}</p>
                                <p className="mt-1 text-sm text-slate-600">{address.email}</p>
                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                  {address.full_address}
                                  {address.landmark ? `, ${address.landmark}` : ""}
                                  {`, ${address.city}, ${address.state} - ${address.pincode}`}
                                </p>
                              </div>
                            </label>

                            <button
                              className="text-sm font-bold text-rose-600 transition hover:text-rose-700"
                              type="button"
                              onClick={() => handleDeleteAddress(address.id, address.userid)}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-medium text-slate-600">
                    No saved address found. Add one below to continue checkout.
                  </div>
                )}

                {showAddressForm ? (
                  <form className="mt-6 border-t border-slate-100 pt-6" onSubmit={formik.handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-sm font-bold text-slate-600">Receiver Name *</label>
                        <input
                          className={`rounded-2xl border bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400 ${
                            formik.touched.name && formik.errors.name ? "border-red-500" : "border-slate-200"
                          }`}
                          type="text"
                          name="name"
                          value={formik.values.name}
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="Receiver name"
                        />
                        {formik.touched.name && formik.errors.name ? (
                          <p className="text-xs text-red-500">{formik.errors.name}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-bold text-slate-600">Email *</label>
                        <input
                          className={`rounded-2xl border bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400 ${
                            formik.touched.email && formik.errors.email ? "border-red-500" : "border-slate-200"
                          }`}
                          type="email"
                          name="email"
                          value={formik.values.email}
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="Email address"
                        />
                        {formik.touched.email && formik.errors.email ? (
                          <p className="text-xs text-red-500">{formik.errors.email}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-bold text-slate-600">Phone Number *</label>
                        <input
                          className={`rounded-2xl border bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400 ${
                            formik.touched.phone && formik.errors.phone ? "border-red-500" : "border-slate-200"
                          }`}
                          type="tel"
                          name="phone"
                          value={formik.values.phone}
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                        />
                        {formik.touched.phone && formik.errors.phone ? (
                          <p className="text-xs text-red-500">{formik.errors.phone}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-bold text-slate-600">Pincode *</label>
                        <input
                          className={`rounded-2xl border bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400 ${
                            formik.touched.pincode && formik.errors.pincode ? "border-red-500" : "border-slate-200"
                          }`}
                          type="text"
                          name="pincode"
                          value={formik.values.pincode}
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="6-digit pincode"
                          maxLength={6}
                        />
                        {formik.touched.pincode && formik.errors.pincode ? (
                          <p className="text-xs text-red-500">{formik.errors.pincode}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-600">Full Address *</label>
                        <textarea
                          className={`rounded-2xl border bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400 ${
                            formik.touched.full_address && formik.errors.full_address
                              ? "border-red-500"
                              : "border-slate-200"
                          }`}
                          name="full_address"
                          value={formik.values.full_address}
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="House number, street, area"
                          rows="3"
                        />
                        {formik.touched.full_address && formik.errors.full_address ? (
                          <p className="text-xs text-red-500">{formik.errors.full_address}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-bold text-slate-600">Landmark</label>
                        <input
                          className="rounded-2xl border border-slate-200 bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400"
                          type="text"
                          name="landmark"
                          value={formik.values.landmark}
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="Nearby landmark"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-bold text-slate-600">City *</label>
                        <input
                          className={`rounded-2xl border bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400 ${
                            formik.touched.city && formik.errors.city ? "border-red-500" : "border-slate-200"
                          }`}
                          type="text"
                          name="city"
                          value={formik.values.city}
                          readOnly
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="City"
                        />
                        {formik.touched.city && formik.errors.city ? (
                          <p className="text-xs text-red-500">{formik.errors.city}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-bold text-slate-600">State *</label>
                        <input
                          className={`rounded-2xl border bg-[#fffdf9] px-4 py-3 font-medium text-[#081b45] outline-none transition focus:border-amber-400 ${
                            formik.touched.state && formik.errors.state ? "border-red-500" : "border-slate-200"
                          }`}
                          type="text"
                          name="state"
                          value={formik.values.state}
                          readOnly
                          onChange={handleAddressInputChange}
                          onBlur={formik.handleBlur}
                          placeholder="State"
                        />
                        {formik.touched.state && formik.errors.state ? (
                          <p className="text-xs text-red-500">{formik.errors.state}</p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3 md:col-span-2">
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={formik.values.is_default}
                          onChange={handleAddressInputChange}
                        />
                        <span className="text-sm font-semibold text-slate-600">Set this as default address</span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-[#081b45] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0d275f] disabled:cursor-not-allowed disabled:opacity-60"
                        type="submit"
                        disabled={savingAddress}
                      >
                        {savingAddress ? "Saving address..." : "Save address"}
                      </button>

                      <button
                        className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        type="button"
                        onClick={() => {
                          formik.resetForm();
                          setShowAddressForm(false);
                          setMessage("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </section>

              <section className="rounded-[30px] bg-white p-6 shadow-[0_16px_40px_rgba(12,28,59,0.08)] md:p-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                      Basket Review
                    </span>
                    <h2 className="mt-2 text-3xl font-black text-[#081b45]">
                      Items in this order
                    </h2>
                  </div>
                  <p className="text-sm text-slate-500">Live data fetched from your current cart.</p>
                </div>

                <div className="mt-6 grid gap-4">
                  {cartItems.map((item) => (
                    <article
                      key={item.cart_item_id}
                      className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(12,28,59,0.06)] md:grid-cols-[120px_1fr_auto]"
                    >
                      <img
                        src={item.image}
                        alt={item.pname}
                        className="h-28 w-full rounded-[22px] object-cover"
                      />

                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black text-[#081b45]">{item.pname}</h3>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              {item.cname} • {item.sname}
                            </p>
                          </div>

                          {Number(item.discount_amount || 0) > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                              {item.discount_type === "percentage"
                                ? `${Number(item.discount_value || 0)}% OFF`
                                : `Rs ${Number(item.discount_value || 0)} OFF`}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-end gap-3 rounded-[22px] bg-[linear-gradient(180deg,#fffaf0_0%,#fff_100%)] p-4">
                          <strong className="text-3xl font-black text-[#081b45]">
                            Rs {Number(item.unit_price || item.final_price || item.price || 0).toFixed(2)}
                          </strong>
                          {Number(item.discount_amount || 0) > 0 ? (
                            <span className="text-sm font-semibold text-slate-500 line-through">
                              Rs {Number(item.price || 0).toFixed(2)}
                            </span>
                          ) : null}
                          {Number(item.discount_amount || 0) > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                              Save Rs {Number(item.discount_amount).toFixed(2)}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1">Qty: {item.quantity}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            GST ({item.gst_percentage}%): Rs {Number(item.gst_amount || 0).toFixed(2)}
                          </span>
                          {item.offer_name ? (
                            <span className="rounded-full bg-[#eef4ff] px-3 py-1 font-bold text-[#081b45]">
                              {item.offer_name} · {item.discount_type === "percentage"
                                ? `${Number(item.discount_value || 0)}% OFF`
                                : `Rs ${Number(item.discount_value || 0)} OFF`}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:block md:text-right">
                        <span className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                          Line Total
                        </span>
                        <strong className="mt-2 block text-2xl font-black text-[#081b45]">
                          Rs {Number(item.total || 0).toFixed(2)}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="grid gap-6 self-start">
              <section className="rounded-[30px] bg-[#081b45] p-6 text-white shadow-[0_20px_50px_rgba(8,27,69,0.28)] md:p-8">
                <span className="text-xs font-black uppercase tracking-[0.28em] text-[#c4d0ea]">
                  Payment
                </span>
                <h2 className="mt-2 text-3xl font-black">Complete the checkout</h2>
                <p className="mt-3 text-sm leading-6 text-[#d6def2]">
                  Original price, offer savings, and GST are already aligned with the backend total.
                </p>

                <div className="mt-6 grid gap-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    />
                    <div>
                      <strong className="block text-base font-black">Cash on Delivery</strong>
                      <span className="text-sm text-[#d6def2]">Order will stay pending in your current backend</span>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
                    <input
                      type="radio"
                      name="payment_method"
                      value="online"
                      checked={paymentMethod === "online"}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    />
                    <div>
                      <strong className="block text-base font-black">Online Payment</strong>
                      <span className="text-sm text-[#d6def2]">Order gets confirmed by current backend logic</span>
                    </div>
                  </label>
                </div>

                <div className="mt-6 rounded-[24px] bg-white px-5 py-5 text-[#081b45]">
                  <h3 className="text-lg font-black">Order Summary</h3>

                  <div className="mt-4 rounded-[20px] bg-[#f7f8fc] p-4 text-sm text-slate-600">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Deliver To
                    </p>
                    {selectedAddress ? (
                      <div className="mt-3 grid gap-1">
                        <strong className="text-base text-[#081b45]">{selectedAddress.name}</strong>
                        <span>{selectedAddress.phone}</span>
                        <span>{selectedAddress.full_address}</span>
                        <span>
                          {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-3">Select or add an address to continue.</p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
                    {savingsTotal > 0 ? (
                      <div className="flex items-center justify-between rounded-[18px] bg-emerald-50 px-4 py-3 text-emerald-700">
                        <span>You saved</span>
                        <span className="font-black">Rs {savingsTotal.toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span>Items</span>
                      <span>{totalItems}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Unit Subtotal</span>
                      <span>Rs {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>GST</span>
                      <span>Rs {gstTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Delivery</span>
                      <span className={deliveryCharge > 0 ? "text-[#081b45]" : "text-emerald-600"}>
                        {deliveryCharge > 0 ? `Rs ${deliveryCharge}` : "Free"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-black text-[#081b45]">
                      <span>Total</span>
                      <span>Rs {finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    className="mt-6 w-full rounded-full bg-amber-400 px-6 py-4 text-lg font-black text-[#081b45] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || savingAddress}
                  >
                    {placingOrder ? "Placing your order..." : `Place Order • Rs ${finalTotal.toFixed(2)}`}
                  </button>

                  <Link className="mt-4 block text-center text-sm font-bold text-slate-500 no-underline" to="/cart">
                    Back to cart
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

export default Checkout;
