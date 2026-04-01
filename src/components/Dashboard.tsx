import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../App";
import { Transaction, BankAccount } from "../types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, ArrowUpRight, ArrowDownLeft, Send, Plus, History, ShieldCheck, TrendingUp, Wallet, User, Search, ChevronRight, Activity, AlertTriangle } from "lucide-react";
import confetti from "canvas-confetti";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transferAmount, setTransferAmount] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch recent transactions
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("sender_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(5);

      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
    };

    fetchTransactions();

    // Subscribe to new transactions
    const channel = supabase
      .channel("public:transactions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions", filter: `sender_id=eq.${user.id}` }, (payload) => {
        setTransactions(prev => [payload.new as Transaction, ...prev].slice(0, 5));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return toast.error("Invalid amount");
    if (amount > profile.balance) return toast.error("Insufficient balance");

    setLoading(true);
    try {
      // 1. Check Risk Score via API
      const riskResponse = await fetch("/api/security/risk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          amount,
          location: "New Delhi, India",
          deviceId: "DEMO_DEVICE_ID",
          lastLoginLocation: "New Delhi, India"
        })
      });
      
      const riskData = await riskResponse.json();
      
      if (riskData.riskScore > 70) {
        toast.error("Transaction Blocked: High risk detected. Please contact support.");
        return;
      }

      // 2. Find receiver
      const { data: receiver, error: receiverError } = await supabase
        .from("users")
        .select("uid, display_name")
        .eq("email", receiverEmail)
        .single();
      
      if (receiverError || !receiver) {
        toast.error("Receiver not found");
        return;
      }

      if (receiver.uid === user.id) {
        toast.error("Cannot transfer to yourself");
        return;
      }

      // 3. Perform transfer (In real app, use a Supabase RPC or transaction)
      // Update sender balance
      const { error: senderUpdateError } = await supabase
        .from("users")
        .update({ balance: profile.balance - amount })
        .eq("uid", user.id);

      if (senderUpdateError) throw senderUpdateError;

      // Update receiver balance (Need to fetch current balance first or use RPC)
      const { data: receiverProfile } = await supabase.from("users").select("balance").eq("uid", receiver.uid).single();
      await supabase.from("users").update({ balance: (receiverProfile?.balance || 0) + amount }).eq("uid", receiver.uid);

      // Create transaction record
      await supabase.from("transactions").insert({
        sender_id: user.id,
        receiver_id: receiver.uid,
        amount,
        type: "transfer",
        status: "completed",
        timestamp: new Date().toISOString(),
        description: `Transfer to ${receiver.display_name}`
      });

      // Log security event
      await supabase.from("security_logs").insert({
        user_id: user.id,
        event_type: "mfa_success",
        severity: "low",
        timestamp: new Date().toISOString(),
        details: `Successful transfer of ₹${amount} to ${receiverEmail}`
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f97316", "#ffffff", "#10b981"]
      });

      toast.success("Transfer Successful!");
      setShowTransferModal(false);
      setTransferAmount("");
      setReceiverEmail("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Hello, {profile?.display_name?.split(" ")[0]}!</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Your account is protected by adaptive security
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            Quick Transfer
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-[2rem] shadow-2xl shadow-orange-500/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="w-32 h-32" />
          </div>
          <p className="text-orange-100/80 font-medium uppercase tracking-widest text-xs mb-2">Total Balance</p>
          <h2 className="text-4xl font-bold text-white mb-6">₹{profile?.balance?.toLocaleString()}</h2>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +2.4%
            </div>
            <p className="text-orange-100/60 text-xs">Updated just now</p>
          </div>
        </motion.div>

        {/* Security Score Card */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-[#0A0A0B] border border-white/10 p-8 rounded-[2rem] relative overflow-hidden"
        >
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mb-2">Security Risk Score</p>
          <div className="flex items-end gap-3 mb-6">
            <h2 className="text-4xl font-bold text-white">{profile?.risk_score || 0}</h2>
            <span className="text-green-500 font-bold text-sm mb-1 uppercase tracking-wider">Low Risk</span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${profile?.risk_score || 0}%` }}
              className="h-full bg-green-500"
            />
          </div>
          <p className="text-gray-500 text-xs mt-4">Based on your recent login behavior and device trust.</p>
        </motion.div>

        {/* Active Sessions Card */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-[#0A0A0B] border border-white/10 p-8 rounded-[2rem] relative overflow-hidden"
        >
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mb-2">Active Sessions</p>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">1 Active</h2>
              <p className="text-xs text-gray-500">This Device (New Delhi, IN)</p>
            </div>
          </div>
          <button className="text-orange-500 text-xs font-bold hover:underline">Manage Sessions</button>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" />
              Recent Transactions
            </h3>
            <button className="text-gray-500 hover:text-white text-sm font-medium flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center">
                <p className="text-gray-500">No recent transactions found.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#0A0A0B] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      tx.sender_id === user?.id ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                    }`}>
                      {tx.sender_id === user?.id ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{tx.description}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.sender_id === user?.id ? "text-white" : "text-green-500"}`}>
                      {tx.sender_id === user?.id ? "-" : "+"}₹{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">{tx.status}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Security Alerts / Quick Actions */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Security Center
          </h3>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-6 space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">MFA Protection Active</p>
                <p className="text-xs text-gray-500 mt-1">Your account is secured with 2-factor authentication.</p>
              </div>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Identity Verified</p>
                <p className="text-xs text-gray-500 mt-1">KYC documentation is up to date.</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0B] border border-white/10 rounded-3xl p-6">
            <h4 className="font-bold text-white mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-center transition-all">
                <CreditCard className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <span className="text-xs font-bold">Cards</span>
              </button>
              <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-center transition-all">
                <Plus className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <span className="text-xs font-bold">Deposit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTransferModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0B] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 relative shadow-2xl"
            >
              <button
                onClick={() => setShowTransferModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Secure Transfer</h2>
                <p className="text-gray-500 text-sm">Funds will be transferred instantly via RAKSHAKAVACH Secure Rail.</p>
              </div>

              <form onSubmit={handleTransfer} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Recipient Email</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-orange-500 outline-none transition-all"
                      placeholder="recipient@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Amount (₹)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      required
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-2xl font-bold focus:border-orange-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    By proceeding, you authorize this transaction. Our AI risk engine will analyze this transfer for potential fraud.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm Transfer"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  )
}
