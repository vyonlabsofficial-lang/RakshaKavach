import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../App";
import { Transaction } from "../types";
import { motion } from "motion/react";
import { CreditCard, ArrowUpRight, ArrowDownLeft, Search, Filter, Download, Calendar, ArrowRight } from "lucide-react";

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("timestamp", { ascending: false });
      
      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
    };

    fetchTransactions();

    const channel = supabase
      .channel("public:transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `sender_id=eq.${user.id}` }, () => fetchTransactions())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `receiver_id=eq.${user.id}` }, () => fetchTransactions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredTxs = transactions.filter(tx => 
    tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tx.amount.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <Calendar className="w-3 h-3 text-orange-500" />
            Showing all activity for your account
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
            <Download className="w-4 h-4" />
            Statement
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by description or amount..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-orange-500 outline-none transition-all"
          />
        </div>
        <button className="bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all">
          <Filter className="w-5 h-5" />
          Filters
        </button>
      </div>

      <div className="bg-[#0A0A0B] border border-white/10 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A0A0B] border-b border-white/10">
              <tr>
                <th className="px-6 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Description</th>
                <th className="px-6 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 italic">No transactions found matching your criteria.</td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-white">{new Date(tx.timestamp).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.sender_id === user?.id ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                        }`}>
                          {tx.sender_id === user?.id ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <p className="text-sm font-bold text-white">{tx.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{tx.type}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className={`text-sm font-bold ${tx.sender_id === user?.id ? "text-white" : "text-green-500"}`}>
                        {tx.sender_id === user?.id ? "-" : "+"}₹{tx.amount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${
                        tx.status === "completed" ? "bg-green-500/20 text-green-500" :
                        tx.status === "flagged" ? "bg-red-500/20 text-red-500" :
                        "bg-orange-500/20 text-orange-500"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
