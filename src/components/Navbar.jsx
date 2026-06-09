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
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
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
  const menuRef = useRef(null);

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

  // Improved scroll handler without blinking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isSmallScreen = window.innerWidth < 768;
      
      // Only apply auto-hide on mobile screens
      if (!isSmallScreen) {
        setIsNavbarVisible(true);
        return;
      }
      
      // Don't hide at the top of the page
      if (currentScrollY <= 10) {
        setIsNavbarVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }
      
      // Scrolling down - hide navbar
      if (currentScrollY > lastScrollY + 5) {
        setIsNavbarVisible(false);
        setIsMenuOpen(false);
      } 
      // Scrolling up - show navbar
      else if (currentScrollY < lastScrollY - 5) {
        setIsNavbarVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    // Throttle the scroll event for better performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", throttledScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [lastScrollY]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

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
    <header 
      ref={menuRef}
      className={`sticky top-0 z-50 transition-transform duration-300 ease-in-out ${
        !isNavbarVisible ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* TOP NAVBAR */}
      <div className="bg-[#071330] text-white shadow-lg">
        <div className="mx-auto grid max-w-[1440px] gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 md:px-6 lg:grid-cols-[auto_auto_minmax(280px,1fr)_auto] lg:items-center">
          {/* LOGO - Always visible on desktop, conditionally on mobile */}
          <a
            className="text-3xl font-black tracking-tight text-white no-underline sm:text-4xl"
            href="/"
          >
            <span className="text-white">shubh</span>
            <span className="text-amber-400">deal</span>
          </a>

          {/* LOCATION - Hide on mobile, show on tablet+ */}
          <div className="hidden gap-0.5 text-slate-200 sm:grid">
            <small className="text-[11px] uppercase tracking-[0.3em]">
              Deliver to.
            </small>
            <strong className="text-lg md:text-xl">India</strong>
          </div>

          {/* SEARCH BAR - Full width on mobile */}
          <div className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)_70px] overflow-hidden rounded-xl bg-white shadow-sm sm:grid-cols-[120px_minmax(0,1fr)_100px] md:rounded-full">
            <select
              className="min-w-0 border-0 bg-slate-100 px-2 py-2.5 text-xs text-slate-700 outline-none sm:px-3 sm:py-3 sm:text-sm"
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
              className="min-w-0 border-0 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:py-3 sm:px-4"
              placeholder="Search products..."
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
              className="bg-amber-400 px-3 py-2.5 text-xs font-bold text-slate-900 transition-all hover:bg-amber-500 active:scale-95 sm:px-6 sm:py-3 sm:text-sm"
              type="button"
              onClick={handleSearch}
            >
              <span className="sm:hidden">Go</span>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* RIGHT SIDE MENU - Desktop and tablet view */}
          <div className="hidden min-w-0 flex-wrap items-center gap-2 text-sm font-bold text-white lg:flex lg:justify-end">
            {token ? (
              <button
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 transition-all hover:bg-white/20 active:scale-95"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-white no-underline transition-all hover:bg-white/20 active:scale-95"
                  to="/login"
                >
                  Login
                </Link>
                
                <Link
                  className="rounded-full px-3 py-2 text-white no-underline transition-all hover:bg-white/10 active:scale-95"
                  to="/signup"
                >
                  Signup
                </Link>
              </>
            )}

            <NavLink
              className="rounded-full px-3 py-2 text-white no-underline transition-all hover:bg-white/10 active:scale-95"
              to="/products"
            >
              Products
            </NavLink>

            <NavLink
              className="rounded-full px-3 py-2 text-white no-underline transition-all hover:bg-white/10 active:scale-95"
              to="/orderHistory"
            >
              Orders
            </NavLink>

            {token && (
              <div className="relative">
                <button
                  className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
                  type="button"
                  onClick={handleNotificationToggle}
                  aria-label="Notifications"
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
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

                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-900">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 bg-gradient-to-br from-[#071330] to-[#0f1a3a] px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 opacity-80">
                            Shubhdeal
                          </p>
                          <h3 className="mt-1 text-lg font-black text-white">
                            Notifications
                          </h3>
                        </div>
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-amber-400 transition-colors hover:text-amber-300"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[460px] overflow-y-auto bg-white">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`cursor-pointer border-b border-slate-100 px-5 py-4 transition-colors hover:bg-slate-50 ${
                              !seenNotificationIds.includes(String(notification.id)) ? "bg-amber-50" : ""
                            }`}
                            onClick={() => handleNotificationClick(notification.id)}
                          >
                            <div className="flex gap-3">
                              <div className="shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                                  <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                                  </svg>
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <p className="text-sm font-bold text-[#071330]">
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                                  {notification.message}
                                </p>
                                {notification.created_at && (
                                  <p className="mt-2 text-xs font-medium text-slate-400">
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
                                <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                            <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                            </svg>
                          </div>
                          <p className="text-base font-bold text-slate-700">No notifications yet</p>
                          <p className="mt-1 text-sm text-slate-500">We'll notify you when something arrives</p>
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50 py-3 text-center">
                        <button
                          onClick={() => setIsNotificationOpen(false)}
                          className="text-xs font-semibold text-[#071330] transition-colors hover:text-amber-600"
                        >
                          View all notifications →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <NavLink
              className="relative rounded-full py-2 pl-6 pr-3 text-white no-underline transition-all hover:bg-white/10 active:scale-95"
              to="/cart"
            >
              <span className="absolute -top-2 left-0 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[11px] font-black text-slate-900">
                {cartCount}
              </span>
              Cart
            </NavLink>
          </div>

          {/* Mobile Menu Button - Only on mobile */}
          <div className="flex items-center justify-end gap-2 lg:hidden">
            <NavLink
              className="relative rounded-full p-2 text-white no-underline transition-all hover:bg-white/10 active:scale-95"
              to="/cart"
            >
              <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900">
                {cartCount}
              </span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M10 21h4" />
              </svg>
            </NavLink>
            
            <button
              className="rounded-full p-2 text-white transition-all hover:bg-white/10 active:scale-95 lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* CATEGORY NAVBAR - Desktop only, Mobile shows in slide menu */}
      <div className="hidden bg-[#1b2947] lg:block">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-6 py-3">
          <button
            className="shrink-0 rounded-full bg-amber-400 px-5 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#081b45] transition-all hover:bg-amber-500 active:scale-95"
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? "Close Menu" : "All Menu"}
          </button>

          {category.slice(0, 8).map((item) => (
            <button
              key={item.id}
              className={`shrink-0 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white transition-all ${
                activeCategory === item.cname ? "bg-[#3b4c72]" : "bg-[#293858] hover:bg-[#34456a]"
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
      </div>

      {/* MOBILE SLIDE MENU */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 lg:hidden ${
          isMenuOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-50' : 'opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* Menu Panel */}
        <div
          className={`absolute left-0 top-0 h-full w-[85%] max-w-[320px] transform bg-[#132443] shadow-2xl transition-transform duration-300 ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col overflow-y-auto">
            {/* Mobile Menu Header */}
            <div className="border-b border-white/10 bg-[#1b2947] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">shubh<span className="text-amber-400">deal</span></h2>
                  <p className="mt-1 text-xs text-slate-300">Shop with confidence</p>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full p-2 text-white hover:bg-white/10"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Mobile Auth Buttons */}
              <div className="mt-4 flex gap-2">
                {token ? (
                  <button
                    onClick={handleLogout}
                    className="flex-1 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="flex-1 rounded-lg bg-amber-400 px-4 py-2 text-center text-sm font-bold text-slate-900"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-center text-sm font-bold text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Signup
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            {/* Mobile Categories */}
            <div className="flex-1 p-4">
              <h3 className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-300">Categories</h3>
              <div className="space-y-1">
                {category.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                      activeCategory === item.cname
                        ? "bg-amber-400 text-[#081b45]"
                        : "bg-[#1f3155] text-white hover:bg-[#2c4067]"
                    }`}
                    type="button"
                    onClick={() => {
                      setActiveCategory(item.cname);
                      setIsMenuOpen(false);
                    }}
                  >
                    {item.cname}
                  </button>
                ))}
              </div>
              
              {activeSubcategories.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-300">
                    {activeCategory} Subcategories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeSubcategories.map((subCategoryName) => (
                      <button
                        key={subCategoryName}
                        className="rounded-full bg-[#1f3155] px-4 py-2 text-sm font-bold text-white hover:bg-[#2c4067]"
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
                </div>
              )}
              
              {/* Mobile Navigation Links */}
              <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
                <NavLink
                  to="/products"
                  className="block rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Products
                </NavLink>
                <NavLink
                  to="/orderHistory"
                  className="block rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Orders
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP CATEGORY DROPDOWN */}
      {isMenuOpen && (
        <div className="absolute left-0 right-0 top-full z-40 hidden border-t border-white/10 bg-[#132443] shadow-xl lg:block">
          <div className="mx-auto max-w-[1440px] px-6 py-6">
            <div className="grid grid-cols-[280px_1fr] gap-6">
              <aside className="rounded-2xl bg-[#1f3155] p-4">
                <h4 className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-300">
                  Categories
                </h4>
                <div className="grid gap-1">
                  {category.map((item) => (
                    <button
                      key={item.id}
                      className={`rounded-xl px-3 py-2 text-left text-sm font-bold transition-all ${
                        activeCategory === item.cname
                          ? "bg-amber-400 text-[#081b45]"
                          : "bg-[#293858] text-white hover:bg-[#3b4c72]"
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
                        className="rounded-full bg-[#2c4067] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#3b4c72] hover:scale-105"
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
    </header>
  );
}

export default Navbar;