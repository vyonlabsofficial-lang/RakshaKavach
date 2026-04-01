import React, { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "./types";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Shield, LayoutDashboard, CreditCard, Activity, Users, Settings, LogOut, Menu, X, Bell, AlertTriangle } from "lucide-react";

// --- Contexts ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthContext);

// --- Components ---
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import SecurityDashboard from "./components/SecurityDashboard";
import AdminPanel from "./components/AdminPanel";
import Transactions from "./components/Transactions";

const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) => {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Transactions", path: "/transactions", icon: CreditCard },
    { name: "Security SOC", path: "/security", icon: Shield },
    ...(profile?.role === "admin" ? [{ name: "Admin Panel", path: "/admin", icon: Users }] : []),
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -300 }}
        className={`fixed top-0 left-0 h-full w-64 bg-[#0A0A0B] border-r border-white/10 z-50 lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">RAKSHA</h1>
              <p className="text-[10px] text-orange-500 font-bold tracking-[0.2em] uppercase">KAVACH</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, "", item.path);
                  window.dispatchEvent(new PopStateEvent("popstate"));
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  location.pathname === item.path
                    ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-5 h-5 ${location.pathname === item.path ? "text-orange-500" : "group-hover:text-white"}`} />
                <span className="font-medium">{item.name}</span>
              </a>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

const Header = ({ setIsOpen }: { setIsOpen: (v: boolean) => void }) => {
  const { profile } = useAuth();
  return (
    <header className="h-16 border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <button onClick={() => setIsOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white">
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-400 hover:text-white relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-[#0A0A0B]" />
        </button>
        <div className="h-8 w-px bg-white/10 mx-2" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{profile?.display_name || "User"}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{profile?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border border-white/10 flex items-center justify-center font-bold text-white">
            {profile?.display_name?.[0] || "U"}
          </div>
        </div>
      </div>
    </header>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen bg-[#0A0A0B] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("uid", uid)
      .single();

    if (!error && data) {
      setProfile(data as UserProfile);
      
      // Subscribe to profile changes
      supabase
        .channel(`public:users:uid=eq.${uid}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `uid=eq.${uid}` }, (payload) => {
          setProfile(payload.new as UserProfile);
        })
        .subscribe();
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      <Router>
        <Toaster position="top-right" theme="dark" richColors />
        <div className="min-h-screen bg-[#0A0A0B] text-gray-200 font-sans selection:bg-orange-500/30">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex">
                    <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                    <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
                      <Header setIsOpen={setIsSidebarOpen} />
                      <div className="p-4 lg:p-8 flex-1">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/transactions" element={<Transactions />} />
                          <Route path="/security" element={<SecurityDashboard />} />
                          <Route path="/admin" element={<AdminPanel />} />
                          <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                      </div>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
