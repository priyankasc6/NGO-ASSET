import { useState, useContext, createContext, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import "./App.css";
import { QRCodeSVG } from 'qrcode.react';
// ─── API LAYER ────────────────────────────────────────────────────────────────
const BASE_URL = process.env.REACT_APP_API_URL || "https://ngo-asset.onrender.com/api";

const getToken = () => localStorage.getItem("token");
const setToken = (t) => localStorage.setItem("token", t);
const clearToken = () => localStorage.removeItem("token");

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const authAPI = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),
};

const assetsAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/assets${q ? "?" + q : ""}`);
  },
  create: (data) => request("/assets", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/assets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(`/assets/${id}`, { method: "DELETE" }),
};

const assignmentsAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/assignments${q ? "?" + q : ""}`);
  },
  create: (data) => request("/assignments", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/assignments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};

const maintenanceAPI = {
  getAll: () => request("/maintenance"),
  create: (data) => request("/maintenance", { method: "POST", body: JSON.stringify(data) }),
};

const categoriesAPI = {
  getAll: () => request("/categories"),
  create: (data) => request("/categories", { method: "POST", body: JSON.stringify(data) }),
  delete: (id) => request(`/categories/${id}`, { method: "DELETE" }),
};

const reportsAPI = {
  byCategory: () => request("/reports/by-category"),
  byStatus: () => request("/reports/by-status"),
  monthlyAssignments: () => request("/reports/monthly-assignments"),
  topAssigned: () => request("/reports/top-assigned"),
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      authAPI
        .me()
        .then((res) => setUser(res.user))
        .catch(() => clearToken())
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
const useAuth = () => useContext(AuthContext);

// ─── DATA CONTEXT ─────────────────────────────────────────────────────────────
const DataContext = createContext(null);
function DataProvider({ children }) {
  const [assets, setAssets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, asn, m, c] = await Promise.all([
        assetsAPI.getAll(),
        assignmentsAPI.getAll(),
        maintenanceAPI.getAll(),
        categoriesAPI.getAll(),
      ]);
      setAssets(a.data || []);
      setAssignments(asn.data || []);
      setMaintenance(m.data || []);
      setCategories(c.data || []);
    } catch (err) {
      console.error("Failed to load data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addAsset = async (asset) => {
    const res = await assetsAPI.create({ ...asset, status: "Available", assignedTo: null });
    setAssets((prev) => [res.data, ...prev]);
    return res.data;
  };

  const updateAsset = async (id, data) => {
    const res = await assetsAPI.update(id, data);
    setAssets((prev) => prev.map((a) => (a._id === id ? res.data : a)));
    return res.data;
  };

  const deleteAsset = async (id) => {
    await assetsAPI.delete(id);
    setAssets((prev) => prev.filter((a) => a._id !== id));
  };

  const addAssignment = async (asgn) => {
    const res = await assignmentsAPI.create(asgn);
    setAssignments((prev) => [res.data, ...prev]);
    setAssets((prev) =>
      prev.map((a) =>
        a._id === asgn.assetId
          ? { ...a, status: "Assigned", assignedTo: asgn.assignedTo }
          : a
      )
    );
    return res.data;
  };

  const addMaintenance = async (rec) => {
    const res = await maintenanceAPI.create(rec);
    setMaintenance((prev) => [res.data, ...prev]);
    return res.data;
  };

  const addCategory = async (cat) => {
    const res = await categoriesAPI.create(cat);
    setCategories((prev) => [...prev, res.data]);
    return res.data;
  };

  const deleteCategory = async (id) => {
    await categoriesAPI.delete(id);
    setCategories((prev) => prev.filter((c) => c._id !== id));
  };

  return (
    <DataContext.Provider
      value={{
        assets, assignments, maintenance, categories, loading,
        fetchAll, addAsset, updateAsset, deleteAsset,
        addAssignment, addMaintenance, addCategory, deleteCategory,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
const useData = () => useContext(DataContext);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const statusColors = {
  Available: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Assigned: "bg-blue-100 text-blue-800 border border-blue-200",
  Maintenance: "bg-amber-100 text-amber-800 border border-amber-200",
  Retired: "bg-red-100 text-red-800 border border-red-200",
  Active: "bg-blue-100 text-blue-800 border border-blue-200",
  Returned: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Overdue: "bg-red-100 text-red-800 border border-red-200",
  Completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  "In Progress": "bg-amber-100 text-amber-800 border border-amber-200",
  Scheduled: "bg-purple-100 text-purple-800 border border-purple-200",
};

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] || "bg-gray-100 text-gray-700"}`}>
    {status}
  </span>
);

const Toast = ({ toasts, removeToast }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 min-w-64 ${
          t.type === "error" ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        <span>{t.type === "error" ? "❌" : "✅"}</span>
        <span>{t.message}</span>
        <button onClick={() => removeToast(t.id)} className="ml-auto">✕</button>
      </div>
    ))}
  </div>
);

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, addToast: add, removeToast: remove };
}



const Modal = ({ open, onClose, title, children, size = "md" }) => {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal-content ${sizes[size]}`}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, error, ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
      }`}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const Select = ({ label, error, children, ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
        error ? "border-red-400" : "border-gray-200"
      }`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const Btn = ({ variant = "primary", className = "", children, ...props }) => {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    success: "btn-success",
    ghost: "btn-ghost",
  };
  return (
    <button className={`btn ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "assets", label: "Assets", icon: "📦" },
  { key: "assign", label: "Assign Asset", icon: "🔀" },
  { key: "history", label: "Assignment History", icon: "📋" },
  { key: "maintenance", label: "Maintenance Log", icon: "🔧" },
  { key: "categories", label: "Categories", icon: "🗂️", adminOnly: true },
  { key: "reports", label: "Reports", icon: "📈" },
];

function Sidebar({ page, setPage, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
  const links = NAV.filter((n) => !n.adminOnly || user?.role === "Admin");
  return (
    <>
      {sidebarOpen && (
        <div className="sidebar-backdrop lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌍</div>
          <div>
            <div className="sidebar-title">NGO Assets</div>
            <div className="sidebar-role">{user?.role} Panel</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {links.map((n) => (
            <button
              key={n.key}
              onClick={() => { setPage(n.key); setSidebarOpen(false); }}
              className={`nav-item ${page === n.key ? "nav-item-active" : "nav-item-inactive"}`}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {page === n.key && <div className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.email?.[0]?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-email">{user?.email}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} className="sidebar-logout">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState("login"); // "login" | "register"

  // Login state
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginServerError, setLoginServerError] = useState("");


  // Register state
  const [regForm, setRegForm] = useState({ email: "", password: "", confirmPassword: "", role: "Staff" });
  const [regErrors, setRegErrors] = useState({});
  const [regLoading, setRegLoading] = useState(false);
  const [regServerError, setRegServerError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  // ── Login submit ──
  const validateLogin = () => {
    const e = {};
    if (!loginForm.email || !loginForm.email.includes("@")) e.email = "Valid email required";
    if (!loginForm.password || loginForm.password.length < 4) e.password = "Password must be at least 4 characters";
    return e;
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setLoginServerError("");
    const errs = validateLogin();
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
    } catch (err) {
      setLoginServerError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register submit ──
  const validateReg = () => {
    const e = {};
    if (!regForm.email || !regForm.email.includes("@")) e.email = "Valid email required";
    if (!regForm.password || regForm.password.length < 4) e.password = "Password must be at least 4 characters";
    if (regForm.password !== regForm.confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setRegServerError("");
    setRegSuccess("");
    const errs = validateReg();
    if (Object.keys(errs).length) { setRegErrors(errs); return; }
    setRegLoading(true);
    try {
      await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: regForm.email, password: regForm.password, role: regForm.role }),
      });
      setRegSuccess("Account created! You can now log in.");
      setRegForm({ email: "", password: "", confirmPassword: "", role: "Staff" });
      setRegErrors({});
      setTimeout(() => setTab("login"), 1500);
    } catch (err) {
      setRegServerError(err.message || "Registration failed. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-wrapper">
        <div className="login-header">
          <div className="login-logo">🌍</div>
          <h1 className="login-title">NGO Asset Manager</h1>
          <p className="login-subtitle">Manage your organization's assets</p>
        </div>
        <div className="login-card">
          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
            <button
              onClick={() => { setTab("login"); setLoginServerError(""); }}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                cursor: "pointer", fontWeight: "600", fontSize: "14px",
                background: tab === "login" ? "#6366f1" : "#f1f5f9",
                color: tab === "login" ? "#fff" : "#64748b",
                transition: "all 0.2s",
              }}
            >Login</button>
            <button
              onClick={() => { setTab("register"); setRegServerError(""); setRegSuccess(""); }}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                cursor: "pointer", fontWeight: "600", fontSize: "14px",
                background: tab === "register" ? "#6366f1" : "#f1f5f9",
                color: tab === "register" ? "#fff" : "#64748b",
                transition: "all 0.2s",
              }}
            >Register</button>
          </div>

          {/* ── Login Form ── */}
          {tab === "login" && (
            <form onSubmit={submitLogin} className="login-form">
              {loginServerError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {loginServerError}
                </div>
              )}
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@ngo.org"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                error={loginErrors.email}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                error={loginErrors.password}
              />
              <Btn type="submit" disabled={loginLoading} className="login-btn">
                {loginLoading ? "Signing in..." : "Sign In"}
              </Btn>
              <p className="login-hint">Don't have an account? Click Register above.</p>
            </form>
          )}

          {/* ── Register Form ── */}
          {tab === "register" && (
            <form onSubmit={submitRegister} className="login-form">
              {regServerError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {regServerError}
                </div>
              )}
              {regSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">
                  {regSuccess}
                </div>
              )}
              <Input
                label="Email Address"
                type="email"
                placeholder="you@ngo.org"
                value={regForm.email}
                onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                error={regErrors.email}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={regForm.password}
                onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                error={regErrors.password}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={regForm.confirmPassword}
                onChange={(e) => setRegForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                error={regErrors.confirmPassword}
              />
              <Select
                label="Role"
                value={regForm.role}
                onChange={(e) => setRegForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </Select>
              <Btn type="submit" disabled={regLoading} className="login-btn">
                {regLoading ? "Creating account..." : "Create Account"}
              </Btn>
              <p className="login-hint">Already have an account? Click Login above.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ setPage }) {
  const { assets } = useData();
  const { user } = useAuth();
  const [reportData, setReportData] = useState({ byCategory: [], byStatus: [], monthly: [] });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      reportsAPI.byCategory(),
      reportsAPI.byStatus(),
      reportsAPI.monthlyAssignments(),
    ])
      .then(([cat, stat, monthly]) => {
        setReportData({
          byCategory: cat.data || [],
          byStatus: stat.data || [],
          monthly: monthly.data || [],
        });
      })
      .catch(console.error);
  }, [user]);

  const stats = {
    total: assets.length,
    available: assets.filter((a) => a.status === "Available").length,
    assigned: assets.filter((a) => a.status === "Assigned").length,
    maintenance: assets.filter((a) => a.status === "Maintenance").length,
  };

  const STATUS_COLORS = {
    Available: "#10b981", Assigned: "#3b82f6", Maintenance: "#f59e0b", Retired: "#ef4444",
  };
  const statusChartData = reportData.byStatus.map((s) => ({
    ...s,
    color: STATUS_COLORS[s.name] || "#6366f1",
  }));

  const StatCard = ({ label, value, icon, colorClass }) => (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's your asset overview.</p>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => setPage("add-asset")}>+ Add Asset</Btn>
          <Btn variant="secondary" onClick={() => setPage("assign")}>🔀 Assign</Btn>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Assets" value={stats.total} icon="📦" colorClass="stat-icon-indigo" />
        <StatCard label="Available" value={stats.available} icon="✅" colorClass="stat-icon-emerald" />
        <StatCard label="Assigned" value={stats.assigned} icon="📋" colorClass="stat-icon-blue" />
        <StatCard label="Maintenance" value={stats.maintenance} icon="🔧" colorClass="stat-icon-amber" />
      </div>

      <div className="charts-grid">
        <div className="card">
          <h2 className="card-title">Assets by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={reportData.byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="card-title">Assets by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
                fontSize={11}
              >
                {statusChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Monthly Assignments</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={reportData.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── ASSET LIST ───────────────────────────────────────────────────────────────
function AssetList({ setPage, setSelectedAsset, addToast }) {
  const { assets, updateAsset, categories } = useData();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [qrAsset, setQrAsset] = useState(null);

  const [statusChange, setStatusChange] = useState(null);
  const perPage = 6;

  const filtered = assets.filter((a) => {
    const s = search.toLowerCase();
    return (
      (!s || a.name.toLowerCase().includes(s) || a.serialNumber.toLowerCase().includes(s)) &&
      (!filterCat || a.category === filterCat) &&
      (!filterStatus || a.status === filterStatus)
    );
  });
  const total = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleStatusChange = (asset, newStatus) => {
    if (newStatus === "Retired") { setStatusChange({ asset, newStatus }); return; }
    updateAsset(asset._id, { status: newStatus })
      .then(() => addToast("Status updated"))
      .catch((err) => addToast(err.message, "error"));
  };

  const confirmRetire = async () => {
    try {
      await updateAsset(statusChange.asset._id, { status: "Retired" });
      addToast("Asset retired");
    } catch (err) {
      addToast(err.message, "error");
    }
    setStatusChange(null);
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Asset Inventory</h1>
        <Btn onClick={() => setPage("add-asset")}>+ Add New Asset</Btn>
      </div>

      <div className="filters-bar">
        <input
          className="filter-search"
          placeholder="🔍 Search by name or serial..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
        />
        <select
          className="filter-select"
          value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id}>{c.name}</option>)}
        </select>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Statuses</option>
          {["Available", "Assigned", "Maintenance", "Retired"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {["Asset Name", "Category", "Status", "Assigned To", "Purchase Date", "Actions"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((asset) => (
                <tr key={asset._id}>
                  <td>
                    <div className="asset-name">{asset.name}</div>
                    <div className="asset-serial">{asset.serialNumber}</div>
                  </td>
                  <td className="text-gray-600">{asset.category}</td>
                  <td>
                    <select
                      value={asset.status}
                      onChange={(e) => handleStatusChange(asset, e.target.value)}
                      className={`status-select ${statusColors[asset.status]}`}
                    >
                      {["Available", "Assigned", "Maintenance", "Retired"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-gray-600">{asset.assignedTo || "—"}</td>
                  <td className="text-gray-600">{asset.purchaseDate}</td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="action-btn action-view"
                        onClick={() => { setSelectedAsset(asset); setPage("asset-detail"); }}
                      >View</button>
                      <button
                        className="action-btn action-edit"
                        onClick={() => { setSelectedAsset(asset); setPage("edit-asset"); }}
                      >Edit</button>
                      <button className="action-btn action-qr" onClick={() => setQrAsset(asset)}>QR</button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={6} className="table-empty">No assets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
            </span>
            <div className="pagination-btns">
              {Array.from({ length: total }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`page-btn ${currentPage === i + 1 ? "page-btn-active" : ""}`}
                >{i + 1}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={!!qrAsset} onClose={() => setQrAsset(null)} title="Asset QR Code" size="sm">
        {qrAsset && (
          <div className="qr-modal-body">
            <div className="qr-box">
              <QRCodeSVG value={`https://localhost:3000/assets/${qrAsset._id}`} size={180} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800">{qrAsset.name}</p>
              <p className="text-sm text-gray-500">{qrAsset.assetId} · {qrAsset.serialNumber}</p>
            </div>
            <Btn variant="secondary" className="w-full" onClick={() => addToast("QR code ready to download")}>
              ⬇ Download QR Code
            </Btn>
          </div>
        )}
      </Modal>

      <Modal open={!!statusChange} onClose={() => setStatusChange(null)} title="Retire Asset?" size="sm">
        {statusChange && (
          <div>
            <p className="text-gray-600 mb-4">
              Retiring <strong>{statusChange.asset.name}</strong> will mark it as decommissioned. Continue?
            </p>
            <div className="modal-actions">
              <Btn variant="secondary" onClick={() => setStatusChange(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={confirmRetire}>Retire Asset</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── ADD / EDIT ASSET ─────────────────────────────────────────────────────────
function AssetForm({ editAsset, setPage, addToast }) {
  const { addAsset, updateAsset, categories } = useData();
  const blank = {
    name: "", category: "", serialNumber: "", purchaseDate: "",
    purchaseCost: "", condition: "Good", description: "", location: "",
  };
  const [form, setForm] = useState(editAsset ? { ...editAsset } : blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name) e.name = "Required";
    if (!form.category) e.category = "Required";
    if (!form.serialNumber) e.serialNumber = "Required";
    if (!form.purchaseDate) e.purchaseDate = "Required";
    if (!form.location) e.location = "Required";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editAsset) {
        await updateAsset(editAsset._id, form);
        addToast("Asset updated successfully");
      } else {
        await addAsset(form);
        addToast("Asset added successfully");
      }
      setPage("assets");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const f = (k) => ({
    value: form[k] || "",
    onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
    error: errors[k],
  });

  return (
    <div className="form-page">
      <div className="form-page-header">
        <button onClick={() => setPage("assets")} className="back-btn">←</button>
        <h1 className="page-title">{editAsset ? "Edit Asset" : "Add New Asset"}</h1>
      </div>
      <div className="card">
        <form onSubmit={submit} className="asset-form-grid">
          <div className="col-span-2">
            <Input label="Asset Name *" placeholder="e.g. Dell Latitude Laptop" {...f("name")} />
          </div>
          <Select
            label="Category *"
            error={errors.category}
            value={form.category || ""}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          >
            <option value="">Select category...</option>
            {categories.map((c) => <option key={c._id}>{c.name}</option>)}
          </Select>
          <Input label="Serial Number *" placeholder="e.g. DL-2024-001" {...f("serialNumber")} />
          <Input label="Purchase Date *" type="date" {...f("purchaseDate")} />
          <Input label="Purchase Cost ($)" type="number" placeholder="0.00" {...f("purchaseCost")} />
          <Select
            label="Condition"
            value={form.condition || "Good"}
            onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
          >
            {["Excellent", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Location *" placeholder="e.g. Office A" {...f("location")} />
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Brief description..."
              value={form.description || ""}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="col-span-2 form-actions">
            <Btn type="button" variant="secondary" onClick={() => setPage("assets")}>Cancel</Btn>
            <Btn type="submit" disabled={saving}>
              {saving ? "Saving..." : editAsset ? "Update Asset" : "Add Asset"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ASSET DETAIL ─────────────────────────────────────────────────────────────
function AssetDetail({ asset, setPage, setSelectedAsset, addToast }) {
  const { assignments, maintenance } = useData();
  const [qrOpen, setQrOpen] = useState(false);

  if (!asset) return (
    <div className="empty-state">
      No asset selected.{" "}
      <button className="text-indigo-600" onClick={() => setPage("assets")}>Go to Assets</button>
    </div>
  );

  const assetAssignments = assignments.filter(
    (a) => a.assetId === asset._id || a.assetId?._id === asset._id
  );
  const assetMaintenance = maintenance.filter(
    (m) => m.assetId === asset._id || m.assetId?._id === asset._id
  );

  return (
    <div className="space-y-5">
      <div className="form-page-header">
        <button onClick={() => setPage("assets")} className="back-btn">←</button>
        <h1 className="page-title">Asset Detail</h1>
      </div>

      <div className="card">
        <div className="detail-header">
          <div className="detail-identity">
            <div className="detail-icon">📦</div>
            <div>
              <h2 className="detail-name">{asset.name}</h2>
              <p className="detail-meta">{asset.serialNumber} · {asset.category}</p>
            </div>
          </div>
          <div className="detail-actions">
            <StatusBadge status={asset.status} />
            <Btn variant="secondary" onClick={() => setQrOpen(true)}>📱 QR Code</Btn>
            <Btn onClick={() => { setSelectedAsset(asset); setPage("assign"); }}>🔀 Assign</Btn>
            <Btn variant="secondary" onClick={() => { setSelectedAsset(asset); setPage("edit-asset"); }}>✏️ Edit</Btn>
          </div>
        </div>
        <div className="detail-meta-grid">
          {[
            ["Location", asset.location],
            ["Condition", asset.condition],
            ["Purchase Date", asset.purchaseDate],
            ["Purchase Cost", asset.purchaseCost ? `$${asset.purchaseCost}` : "—"],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="meta-label">{l}</p>
              <p className="meta-value">{v || "—"}</p>
            </div>
          ))}
        </div>
        {asset.description && <p className="detail-description">{asset.description}</p>}
      </div>

      <div className="card">
        <h3 className="card-title">Assignment History</h3>
        {assetAssignments.length ? (
          <table className="data-table">
            <thead>
              <tr>{["Assigned To", "Type", "Start", "Return", "Status"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {assetAssignments.map((a) => (
                <tr key={a._id}>
                  <td className="font-medium text-gray-800">{a.assignedTo}</td>
                  <td className="text-gray-500">{a.type}</td>
                  <td className="text-gray-500">{a.startDate}</td>
                  <td className="text-gray-500">{a.returnDate}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-gray-400 text-sm">No assignment history.</p>}
      </div>

      <div className="card">
        <h3 className="card-title">Maintenance Log</h3>
        {assetMaintenance.length ? (
          <table className="data-table">
            <thead>
              <tr>{["Date", "Description", "Technician", "Cost", "Status"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {assetMaintenance.map((m) => (
                <tr key={m._id}>
                  <td className="text-gray-500">{m.date}</td>
                  <td className="font-medium text-gray-800">{m.description}</td>
                  <td className="text-gray-500">{m.technician}</td>
                  <td className="text-gray-500">${m.cost}</td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-gray-400 text-sm">No maintenance records.</p>}
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="Asset QR Code" size="sm">
        <div className="qr-modal-body">
          <div className="qr-box">
            <QRCodeSVG value={`https://ngo-assets.app/assets/${asset._id}`} size={180} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">{asset.name}</p>
            <p className="text-sm text-gray-500">{asset.assetId}</p>
          </div>
          <Btn variant="secondary" className="w-full" onClick={() => addToast("QR downloaded")}>
            ⬇ Download QR Code
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── ASSIGN ASSET ─────────────────────────────────────────────────────────────
function AssignAsset({ prefillAsset, setPage, addToast }) {
  const { assets, addAssignment } = useData();
  const availableAssets = assets.filter((a) => a.status === "Available");
  const [form, setForm] = useState({
    assetId: prefillAsset?._id || "",
    type: "Person",
    name: "", role: "", department: "",
    eventName: "", eventLocation: "", eventDate: "",
    startDate: "", returnDate: "", notes: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.assetId) e.assetId = "Select an asset";
    if (form.type === "Person" && !form.name) e.name = "Required";
    if (form.type === "Event" && !form.eventName) e.eventName = "Required";
    if (!form.startDate) e.startDate = "Required";
    if (!form.returnDate) e.returnDate = "Required";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await addAssignment({
        assetId: form.assetId,
        assignedTo: form.type === "Person" ? form.name : form.eventName,
        type: form.type,
        role: form.role,
        department: form.department,
        eventName: form.eventName,
        location: form.eventLocation,
        eventDate: form.eventDate,
        startDate: form.startDate,
        returnDate: form.returnDate,
        notes: form.notes,
        status: "Active",
      });
      addToast("Asset assigned successfully!");
      setPage("history");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const f = (k) => ({
    value: form[k],
    onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
    error: errors[k],
  });

  return (
    <div className="form-page">
      <div className="form-page-header">
        <button onClick={() => setPage("assets")} className="back-btn">←</button>
        <h1 className="page-title">Assign Asset</h1>
      </div>
      <div className="card">
        <form onSubmit={submit} className="asset-form-grid">
          <div className="col-span-2">
            <Select
              label="Select Asset *"
              error={errors.assetId}
              value={form.assetId}
              onChange={(e) => setForm((p) => ({ ...p, assetId: e.target.value }))}
            >
              <option value="">Choose an available asset...</option>
              {availableAssets.map((a) => (
                <option key={a._id} value={a._id}>{a.name} ({a.assetId})</option>
              ))}
            </Select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-2">Assign To</label>
            <div className="type-toggle">
              {["Person", "Event"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: t }))}
                  className={`type-btn ${form.type === t ? "type-btn-active" : "type-btn-inactive"}`}
                >{t}</button>
              ))}
            </div>
          </div>
          {form.type === "Person" ? (
            <>
              <Input label="Person Name *" placeholder="Full name" {...f("name")} />
              <Input label="Role" placeholder="e.g. Field Officer" {...f("role")} />
              <div className="col-span-2">
                <Input label="Department" placeholder="e.g. Operations" {...f("department")} />
              </div>
            </>
          ) : (
            <>
              <Input label="Event Name *" placeholder="e.g. Community Outreach 2024" {...f("eventName")} />
              <Input label="Event Location" placeholder="e.g. District 5" {...f("eventLocation")} />
              <div className="col-span-2">
                <Input label="Event Date" type="date" {...f("eventDate")} />
              </div>
            </>
          )}
          <Input label="Start Date *" type="date" {...f("startDate")} />
          <Input label="Expected Return Date *" type="date" {...f("returnDate")} />
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </div>
          <div className="col-span-2 form-actions">
            <Btn type="button" variant="secondary" onClick={() => setPage("assets")}>Cancel</Btn>
            <Btn type="submit" disabled={saving}>
              {saving ? "Assigning..." : "Assign Asset"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ASSIGNMENT HISTORY ───────────────────────────────────────────────────────
function AssignmentHistory() {
  const { assignments } = useData();
  const [filterStatus, setFilterStatus] = useState("");
  const filtered = assignments.filter((a) => !filterStatus || a.status === filterStatus);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Assignment History</h1>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {["Active", "Returned", "Overdue"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {["Asset Name", "Assigned To", "Type", "Start Date", "Return Date", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a._id} className={a.status === "Overdue" ? "row-overdue" : ""}>
                  <td className="font-medium text-gray-800">{a.assetName}</td>
                  <td className="text-gray-600">{a.assignedTo}</td>
                  <td className="text-gray-600">{a.type}</td>
                  <td className="text-gray-600">{a.startDate}</td>
                  <td className="text-gray-600">{a.returnDate}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="table-empty">No assignments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MAINTENANCE LOG ──────────────────────────────────────────────────────────
function MaintenanceLog({ addToast }) {
  const { maintenance, assets, addMaintenance } = useData();
  const [open, setOpen] = useState(false);
  const blank = { assetId: "", date: "", description: "", technician: "", cost: "", status: "Scheduled" };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.assetId) e.assetId = "Required";
    if (!form.date) e.date = "Required";
    if (!form.description) e.description = "Required";
    if (!form.technician) e.technician = "Required";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await addMaintenance(form);
      addToast("Maintenance record added");
      setOpen(false);
      setForm(blank);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const f = (k) => ({
    value: form[k],
    onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
    error: errors[k],
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Maintenance Log</h1>
        <Btn onClick={() => setOpen(true)}>+ Log Maintenance</Btn>
      </div>
      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {["Asset", "Date", "Description", "Technician", "Cost", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {maintenance.map((m) => (
                <tr key={m._id}>
                  <td className="font-medium text-gray-800">{m.assetName}</td>
                  <td className="text-gray-600">{m.date}</td>
                  <td className="text-gray-600 max-w-xs truncate">{m.description}</td>
                  <td className="text-gray-600">{m.technician}</td>
                  <td className="text-gray-600">${m.cost}</td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              ))}
              {maintenance.length === 0 && (
                <tr><td colSpan={6} className="table-empty">No maintenance records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Maintenance Record">
        <form onSubmit={submit} className="asset-form-grid">
          <div className="col-span-2">
            <Select
              label="Asset *"
              error={errors.assetId}
              value={form.assetId}
              onChange={(e) => setForm((p) => ({ ...p, assetId: e.target.value }))}
            >
              <option value="">Select asset...</option>
              {assets.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </Select>
          </div>
          <Input label="Date *" type="date" {...f("date")} />
          <Input label="Technician *" placeholder="Name or company" {...f("technician")} />
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Description *</label>
            <textarea
              className={`form-textarea ${errors.description ? "border-red-400" : ""}`}
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Issue description..."
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
          </div>
          <Input label="Cost ($)" type="number" placeholder="0.00" {...f("cost")} />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            {["Scheduled", "In Progress", "Completed"].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <div className="col-span-2 form-actions">
            <Btn type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={saving}>{saving ? "Saving..." : "Save Record"}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
function Categories({ addToast }) {
  const { categories, addCategory, deleteCategory } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "📦" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const ICONS = ["📦", "💻", "🪑", "🚗", "🏥", "📎", "🔧", "📱", "🖨️", "📷"];

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name) errs.name = "Required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await addCategory(form);
      addToast("Category added");
      setOpen(false);
      setForm({ name: "", description: "", icon: "📦" });
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      addToast("Category deleted");
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Category Management</h1>
        <Btn onClick={() => setOpen(true)}>+ Add Category</Btn>
      </div>
      <div className="category-grid">
        {categories.map((c) => (
          <div key={c._id} className="category-card">
            <div className="category-card-header">
              <div className="flex items-center gap-3">
                <div className="category-icon">{c.icon}</div>
                <div>
                  <p className="category-name">{c.name}</p>
                  <p className="category-count">{c.assetCount ?? 0} assets</p>
                </div>
              </div>
              <button onClick={() => handleDelete(c._id)} className="delete-icon">🗑️</button>
            </div>
            <p className="category-desc">{c.description}</p>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Category" size="sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label="Category Name *"
            placeholder="e.g. Electronics"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            error={errors.name}
          />
          <Input
            label="Description"
            placeholder="Brief description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Icon</label>
            <div className="icon-picker">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, icon: ic }))}
                  className={`icon-btn ${form.icon === ic ? "icon-btn-active" : ""}`}
                >{ic}</button>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <Btn type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={saving}>{saving ? "Adding..." : "Add Category"}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState({ byCategory: [], byStatus: [], monthly: [], topAssets: [] });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      reportsAPI.byCategory(),
      reportsAPI.byStatus(),
      reportsAPI.monthlyAssignments(),
      reportsAPI.topAssigned(),
    ])
      .then(([cat, stat, monthly, top]) => {
        setData({
          byCategory: cat.data || [],
          byStatus: stat.data || [],
          monthly: monthly.data || [],
          topAssets: top.data || [],
        });
      })
      .catch(console.error);
  }, [user]);

  const STATUS_COLORS = {
    Available: "#10b981", Assigned: "#3b82f6", Maintenance: "#f59e0b", Retired: "#ef4444",
  };
  const statusData = data.byStatus.map((s) => ({
    ...s,
    color: STATUS_COLORS[s.name] || "#6366f1",
  }));

  return (
    <div className="space-y-5">
      <h1 className="page-title">Reports & Analytics</h1>
      <div className="charts-grid">
        <div className="card">
          <h2 className="card-title">Assets by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="card-title">Assets by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%" cy="50%"
                outerRadius={85}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                fontSize={11}
              >
                {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="card-title">Monthly Assignments</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="card-title">Most Assigned Assets</h2>
          <table className="data-table">
            <thead>
              <tr><th>Asset</th><th>Assignments</th></tr>
            </thead>
            <tbody>
              {data.topAssets.map(({ name, count }) => (
                <tr key={name}>
                  <td className="font-medium text-gray-800">{name}</td>
                  <td>
                    <div className="bar-cell">
                      <div className="bar-fill" style={{ width: `${count * 30}px` }} />
                      <span className="text-gray-600">{count}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const { user, authLoading } = useAuth();
  const { fetchAll, loading } = useData();
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  // Fetch all data once user logs in
  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  if (authLoading) return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">
      Loading...
    </div>
  );

  if (!user) return <LoginPage />;

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">
      Loading data...
    </div>
  );

  const navigate = (p) => setPage(p);

  const renderPage = () => {
    switch (page) {
      case "dashboard":    return <Dashboard setPage={navigate} />;
      case "assets":       return <AssetList setPage={navigate} setSelectedAsset={setSelectedAsset} addToast={addToast} />;
      case "add-asset":    return <AssetForm setPage={navigate} addToast={addToast} />;
      case "edit-asset":   return <AssetForm editAsset={selectedAsset} setPage={navigate} addToast={addToast} />;
      case "asset-detail": return <AssetDetail asset={selectedAsset} setPage={navigate} setSelectedAsset={setSelectedAsset} addToast={addToast} />;
      case "assign":       return <AssignAsset prefillAsset={selectedAsset} setPage={navigate} addToast={addToast} />;
      case "history":      return <AssignmentHistory />;
      case "maintenance":  return <MaintenanceLog addToast={addToast} />;
      case "categories":   return user.role === "Admin" ? <Categories addToast={addToast} /> : <div className="empty-state">Admin access required.</div>;
      case "reports":      return <Reports />;
      default:             return <Dashboard setPage={navigate} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={navigate} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main-area">
        <header className="app-header">
          <button onClick={() => setSidebarOpen(true)} className="hamburger lg:hidden">☰</button>
          <h2 className="header-page-name">{page.replace("-", " ")}</h2>
          <div className="header-right">
            <span className="role-badge">{user.role}</span>
            <span className="header-email">{user.email}</span>
          </div>
        </header>
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  );
}