import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { UserProfile, Transaction } from "../types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Users, CreditCard, Shield, Lock, Unlock, Search, Filter, MoreVertical, Eye, CheckCircle, AlertCircle, TrendingUp, UserPlus, FileText } from "lucide-react";

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .limit(50);
      if (!error && data) setUsers(data as UserProfile[]);
      setLoading(false);
    };

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50);
      if (!error && data) setTransactions(data as Transaction[]);
    };

    fetchUsers();
    fetchTransactions();

    // Subscribe to changes
    const usersChannel = supabase
      .channel("public:users")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => fetchUsers())
      .subscribe();

    const txsChannel = supabase
      .channel("public:transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => fetchTransactions())
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(txsChannel);
    };
  }, []);

  const toggleAccountLock = async (userId: string, currentStatus: string) => {
    try {
      // In a real app, we'd have a status field on the user profile
      // For now, let's just log it and show a toast
      toast.success(`Account ${currentStatus === "locked" ? "Unlocked" : "Locked"} successfully`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Administrative Control</h1>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <Shield className="w-3 h-3 text-orange-500" />
            High-privilege access granted
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
            <FileText className="w-4 h-4" />
            Export Audit Log
          </button>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all">
            <UserPlus className="w-4 h-4" />
            Create Admin
          </button>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatCard label="Total Users" value={users.length.toString()} icon={Users} trend="+12%" />
        <AdminStatCard label="Total Volume" value={`₹${transactions.reduce((acc, tx) => acc + tx.amount, 0).toLocaleString()}`} icon={TrendingUp} trend="+5.4%" />
        <AdminStatCard label="Flagged Txs" value="3" icon={AlertCircle} trend="-2" />
      </div>

      {/* User Management Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            User Management
          </h3>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-12 pr-4 text-sm text-white focus:border-orange-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="bg-[#0A0A0B] border border-white/10 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A0A0B] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Balance</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Risk</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-orange-500 border border-white/10">
                          {u.display_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{u.display_name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                        u.role === "admin" ? "bg-orange-500/20 text-orange-500" : "bg-blue-500/20 text-blue-500"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">₹{u.balance.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${u.risk_score}%` }} />
                        </div>
                        <span className="text-xs font-mono text-gray-500">{u.risk_score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
                          <Lock className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Transactions Monitor */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-orange-500" />
          Global Transaction Monitor
        </h3>
        <div className="bg-[#0A0A0B] border border-white/10 rounded-[2.5rem] overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0A0A0B] border-b border-white/10 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">#{tx.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white">₹{tx.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{tx.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                        tx.status === "completed" ? "bg-green-500/20 text-green-500" :
                        tx.status === "flagged" ? "bg-red-500/20 text-red-500" :
                        "bg-orange-500/20 text-orange-500"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({ label, value, icon: Icon, trend }: { label: string; value: string; icon: any; trend: string }) {
  return (
    <div className="bg-[#0A0A0B] border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
        <Icon className="w-24 h-24" />
      </div>
      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-4">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        <span className={`text-xs font-bold mb-1 ${trend.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
