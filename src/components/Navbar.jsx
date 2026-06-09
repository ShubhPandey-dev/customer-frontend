import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";

const API_BASE_URL = "https://ecom-common-backend.onrender.com";
const SEEN_BELL_KEY = "shubhdeal_seen_notification_ids";

function readSeenNotificationIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_BELL_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function Navbar() {
  const [category, setCategory] = useState([]);
  const [subCategoryMap, setSubCategoryMap] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState(
    readSeenNotificationIds,
  );
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const cartCount = useCartStore((state) => state.cartCount);
  const refreshCartCount = useCartStore((state) => state.refreshCartCount);
  const setCartCount = useCartStore((state) => state.setCartCount);
  const navigate = useNavigate();
  
  const scrollTimeoutRef = useRef(null);

  async function getCategory() {
    try {
      const result = await axios.get(
        "https://ecom-common-backend.onrender.com/customer/category/viewcategory",
      );
      setCategory(result.data);
    } catch (error) {
      console.log(error);
    }
  }

  async function getSubcategories() {
    try {
      const result = await axios.get(
        "https://ecom-common-backend.onrender.com/customer/products/viewproducts",
      );
      const products = Array.isArray(result.data) ? result.data : [];

      const nextMap = products.reduce((acc, item) => {
        const categoryName = item.cname || "Other";
        const subCategoryName = item.sname || "General";

        if (!acc[categoryName]) {
          acc[categoryName] = new Set();
        }

        acc[categoryName].add(subCategoryName);
        return acc;
      }, {});

      const normalizedMap = Object.fromEntries(
        Object.entries(nextMap).map(([key, value]) => [key, Array.from(value)]),
      );

      setSubCategoryMap(normalizedMap);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getCategory();
    getSubcategories();
  }, []);

  useEffect(() => {
    if (!token) {
      setCartCount(0);
      setNotifications([]);
      return;
    }
    refreshCartCount(token);
  }, [token, refreshCartCount, setCartCount]);

  async function getNotifications() {
    if (!token) return;

    try {
      const result = await axios.get(
        `${API_BASE_URL}/api/notification/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (!token) return;

    getNotifications();

    if (typeof window !== 'undefined' && window.shubhdealNotifications?.init) {
      window.shubhdealNotifications.init(token, () => {
        getNotifications();
      });
    }
  }, [token]);

  useEffect(() => {
    if (category.length > 0 && !activeCategory) {
      setActiveCategory(category[0].cname);
    }
  }, [category, activeCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 600);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!hasSearched) {
      return;
    }

    const query = new URLSearchParams();

    if (debouncedSearch) {
      query.set("search", debouncedSearch);
    }

    if (searchCategory !== "All") {
      query.set("category", searchCategory);
    }

    navigate(query.toString() ? `/products?${query.toString()}` : "/products");
  }, [debouncedSearch, hasSearched, navigate, searchCategory]);

  const activeSubcategories = useMemo(() => {
    return subCategoryMap[activeCategory] || [];
  }, [subCategoryMap, activeCategory]);

  const handleLogout = useCallback(() => {
    logout();
    setCartCount(0);
    setNotifications([]);
    navigate("/login");
  }, [logout, setCartCount, navigate]);

  const handleNotificationToggle = useCallback(() => {
    const nextOpen = !isNotificationOpen;
    setIsNotificationOpen(nextOpen);

    if (nextOpen) {
      getNotifications();

      const ids = notifications.map((notification) => String(notification.id));
      const nextSeenIds = Array.from(new Set([...seenNotificationIds, ...ids]));

      setSeenNotificationIds(nextSeenIds);
      localStorage.setItem(SEEN_BELL_KEY, JSON.stringify(nextSeenIds));

      if (typeof window !== 'undefined' && window.shubhdealNotifications?.markBrowserNotificationSeen) {
        ids.forEach((id) =>
          window.shubhdealNotifications.markBrowserNotificationSeen(id),
        );
      }
    }
  }, [isNotificationOpen, notifications, seenNotificationIds]);

  const handleSearch = useCallback(() => {
    const query = new URLSearchParams();
    const trimmedSearch = searchText.trim();

    setHasSearched(true);

    if (trimmedSearch) {
      query.set("search", trimmedSearch);
    }

    if (searchCategory !== "All") {
      query.set("category", searchCategory);
    }

    navigate(query.toString() ? `/products?${query.toString()}` : "/products");
  }, [searchText, searchCategory, navigate]);

  const unreadNotificationCount = notifications.filter(
    (notification) => !seenNotificationIds.includes(String(notification.id)),
  ).length;

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => String(n.id));
    setSeenNotificationIds(allIds);
    localStorage.setItem(SEEN_BELL_KEY, JSON.stringify(allIds));
  }, [notifications]);

  const handleNotificationClick = useCallback((notificationId) => {
    if (!seenNotificationIds.includes(String(notificationId))) {
      const newSeenIds = [...seenNotificationIds, String(notificationId)];
      setSeenNotificationIds(newSeenIds);
      localStorage.setItem(SEEN_BELL_KEY, JSON.stringify(newSeenIds));
    }
  }, [seenNotificationIds]);

  return (
    <header className="sticky top-0 z-50">
      {/* TOP NAVBAR */}
      <div className="bg-[#071330] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 md:px-6 lg:grid-cols-[auto_auto_minmax(280px,1fr)_auto] lg:items-center">
          {/* LOGO */}
          <a
            className="text-3xl font-black tracking-tight text-white no-underline sm:text-4xl"
            href="/"
          >
            <span className="text-white">shubh</span>
            <span className="text-amber-400">deal</span>
          </a>

          {/* LOCATION */}
          <div className="hidden gap-0.5 text-slate-200 sm:grid">
            <small className="text-[11px] uppercase tracking-[0.3em]">
              Deliver to.
            </small>
            <strong className="text-xl">India</strong>
          </div>

          {/* SEARCH BAR */}
          <div className="grid min-w-0 grid-cols-[82px_minmax(0,1fr)_56px] overflow-hidden rounded-xl bg-white shadow-sm sm:grid-cols-[120px_minmax(0,1fr)_100px] sm:rounded-full">
            <select
              className="min-w-0 border-0 bg-slate-100 px-2 py-3 text-xs text-slate-700 outline-none sm:px-3 sm:text-sm"
              value={searchCategory}
              onChange={(event) => {
                setSearchCategory(event.target.value);
                setHasSearched(true);
              }}
            >
              <option>All</option>
              {category.map((item) => (
                <option key={item.id} value={item.cname}>
                  {item.cname}
                </option>
              ))}
            </select>

            <input
              className="min-w-0 border-0 px-3 py-3 text-sm text-slate-700 outline-none sm:px-4"
              placeholder="Search products"
              type="text"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setHasSearched(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            <button
              className="bg-amber-400 px-2 py-3 text-xs font-bold text-slate-900 sm:px-4 sm:text-sm"
              type="button"
              onClick={handleSearch}
            >
              <span className="sm:hidden">Go</span>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* RIGHT SIDE MENU */}
          <div
            className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-bold text-white lg:justify-end"
          >
            {token ? (
              <button
                className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white sm:px-4"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white no-underline sm:px-4"
                  to="/login"
                >
                  Login
                </Link>
                

                <Link
                  className="rounded-full px-2 py-2 text-white no-underline hover:bg-white/10"
                  to="/signup"
                >
                  Signup
                </Link>
              </>
            )}

            <NavLink
              className="rounded-full px-2 py-2 text-white no-underline hover:bg-white/10"
              to="/products"
            >
              Products
            </NavLink>

            <NavLink
              className="rounded-full px-2 py-2 text-white no-underline hover:bg-white/10"
              to="/orderHistory"
            >
              Orders
            </NavLink>

            {token ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* NOTIFICATION BUTTON */}
                <button
                  style={{
                    position: 'relative',
                    display: 'grid',
                    height: '40px',
                    width: '40px',
                    placeItems: 'center',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                  type="button"
                  onClick={handleNotificationToggle}
                  aria-label="Notifications"
                >
                  <svg
                    aria-hidden="true"
                    style={{ height: '20px', width: '20px' }}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                    <path d="M9 17a3 3 0 0 0 6 0" />
                  </svg>

                  {/* UNREAD COUNT */}
                  {unreadNotificationCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        right: '-4px',
                        top: '-4px',
                        display: 'flex',
                        height: '20px',
                        minWidth: '20px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '9999px',
                        backgroundColor: '#fbbf24',
                        paddingLeft: '4px',
                        paddingRight: '4px',
                        fontSize: '10px',
                        fontWeight: '900',
                        color: '#020617'
                      }}
                    >
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {/* NOTIFICATION DROPDOWN */}
                {isNotificationOpen && (
                  <div
                    style={{
                      position: 'fixed',
                      top: '72px',
                      right: '12px',
                      zIndex: 999999,
                      width: '380px',
                      maxWidth: 'calc(100vw - 24px)',
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: 'linear-gradient(135deg, #071330 0%, #0f1a3a 100%)',
                        padding: '16px 20px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#fbbf24', opacity: 0.8 }}>
                            Shubhdeal
                          </p>
                          <h3 style={{ marginTop: '4px', fontSize: '18px', fontWeight: '900', color: 'white' }}>
                            Notifications
                          </h3>
                        </div>
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            style={{ fontSize: '12px', color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notification List */}
                    <div style={{ maxHeight: '460px', overflowY: 'auto', backgroundColor: 'white' }}>
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              padding: '16px 20px',
                              cursor: 'pointer',
                              backgroundColor: !seenNotificationIds.includes(String(notification.id)) ? '#fffbeb' : 'white'
                            }}
                            onClick={() => handleNotificationClick(notification.id)}
                          >
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ flexShrink: 0 }}>
                                <div style={{ height: '32px', width: '32px', borderRadius: '9999px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg style={{ height: '16px', width: '16px', color: '#d97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                                  </svg>
                                </div>
                              </div>
                              
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', fontWeight: '700', color: '#071330' }}>
                                  {notification.title}
                                </p>
                                <p style={{ marginTop: '4px', fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                                  {notification.message}
                                </p>
                                {notification.created_at && (
                                  <p style={{ marginTop: '8px', fontSize: '11px', fontWeight: '500', color: '#94a3b8' }}>
                                    {new Date(notification.created_at).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </p>
                                )}
                              </div>
                              
                              {!seenNotificationIds.includes(String(notification.id)) && (
                                <div style={{ height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#fbbf24', flexShrink: 0, marginTop: '8px' }} />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                          <div style={{ height: '64px', width: '64px', borderRadius: '9999px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                            <svg style={{ height: '32px', width: '32px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                            </svg>
                          </div>
                          <p style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>No notifications yet</p>
                          <p style={{ marginTop: '4px', fontSize: '14px', color: '#64748b' }}>We'll notify you when something arrives</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', padding: '12px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => setIsNotificationOpen(false)}
                          style={{ fontSize: '12px', fontWeight: '600', color: '#071330', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          View all notifications →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <NavLink
              className="relative rounded-full py-2 pl-6 pr-2 text-white no-underline hover:bg-white/10"
              to="/cart"
            >
              <span className="absolute left-0 top-[-8px] grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[11px] font-black text-slate-950">
                {cartCount}
              </span>
              Cart
            </NavLink>
          </div>
        </div>
      </div>

      {/* CATEGORY NAVBAR */}
      <div className="relative bg-[#1b2947]">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-3 py-3 sm:px-4 md:px-6">
          <button
            className="shrink-0 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#081b45] sm:px-5 sm:tracking-[0.24em]"
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? "Close Menu" : "All Menu"}
          </button>

          {category.slice(0, 6).map((item) => (
            <button
              key={item.id}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white sm:px-5 sm:tracking-[0.24em] ${
                activeCategory === item.cname ? "bg-[#3b4c72]" : "bg-[#293858]"
              }`}
              type="button"
              onClick={() => {
                setActiveCategory(item.cname);
                setIsMenuOpen(true);
              }}
            >
              {item.cname}
            </button>
          ))}
        </div>

        {isMenuOpen && (
          <div className="absolute left-0 right-0 top-full border-t border-white/10 bg-[#132443] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
            <div className="max-h-[calc(100vh-120px)] w-full overflow-y-auto">
              <div className="mx-auto grid max-w-[1440px] gap-4 px-3 py-5 sm:px-4 md:grid-cols-[260px_1fr] md:px-6">
                <aside className="rounded-2xl bg-[#1f3155] p-4">
                  <h4 className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-300">
                    Categories
                  </h4>
                  <div className="grid gap-2">
                    {category.map((item) => (
                      <button
                        key={item.id}
                        className={`rounded-xl px-3 py-2 text-left text-sm font-bold ${
                          activeCategory === item.cname
                            ? "bg-amber-400 text-[#081b45]"
                            : "bg-[#293858] text-white"
                        }`}
                        type="button"
                        onClick={() => setActiveCategory(item.cname)}
                      >
                        {item.cname}
                      </button>
                    ))}
                  </div>
                </aside>

                <section className="rounded-2xl bg-[#1f3155] p-4">
                  <h4 className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-300">
                    {activeCategory || "Subcategories"}
                  </h4>

                  {activeSubcategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeSubcategories.map((subCategoryName) => (
                        <button
                          key={subCategoryName}
                          className="rounded-full bg-[#2c4067] px-4 py-2 text-sm font-bold text-white hover:bg-[#3b4c72]"
                          type="button"
                          onClick={() => {
                            const query = new URLSearchParams({
                              category: activeCategory,
                              subcategory: subCategoryName,
                            });
                            navigate(`/products?${query.toString()}`);
                            setIsMenuOpen(false);
                          }}
                        >
                          {subCategoryName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-300">
                      No subcategories found.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;