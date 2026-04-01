import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { SecurityLog, FraudAlert } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Shield, AlertTriangle, Activity, Terminal, Globe, Lock, UserCheck, Eye, Zap, Search, Filter, RefreshCw } from "lucide-react";

export default function SecurityDashboard() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [systemStatus, setSystemStatus] = useState<"Safe" | "Warning" | "Threat">("Safe");
  const [activeUsers, setActiveUsers] = useState(124); // Mock data
  const [failedLogins, setFailedLogins] = useState(3); // Mock data

  useEffect(() => {
    // Fetch initial logs
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("security_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);
      if (!error && data) setLogs(data as SecurityLog[]);
    };

    // Fetch initial alerts
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from("fraud_alerts")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);
      if (!error && data) {
        const newAlerts = data as FraudAlert[];
        setAlerts(newAlerts);
        updateSystemStatus(newAlerts);
      }
    };

    fetchLogs();
    fetchAlerts();

    // Subscribe to security logs
    const logsChannel = supabase
      .channel("public:security_logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_logs" }, (payload) => {
        setLogs(prev => [payload.new as SecurityLog, ...prev].slice(0, 20));
      })
      .subscribe();

    // Subscribe to fraud alerts
    const alertsChannel = supabase
      .channel("public:fraud_alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "fraud_alerts" }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const updateSystemStatus = (newAlerts: FraudAlert[]) => {
    if (newAlerts.some(a => a.status === "open" && a.risk_score > 80)) {
      setSystemStatus("Threat");
    } else if (newAlerts.some(a => a.status === "open")) {
      setSystemStatus("Warning");
    } else {
      setSystemStatus("Safe");
    }
  };

  const statusColors = {
    Safe: "text-green-500 bg-green-500/10 border-green-500/20",
    Warning: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    Threat: "text-red-500 bg-red-500/10 border-red-500/20"
  };

  return (
    <div className="space-y-8">
      {/* SOC Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
            <Shield className="text-orange-500 w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Security Operations Center</h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              <Zap className="w-3 h-3 text-orange-500" />
              Real-time threat monitoring active
            </p>
          </div>
        </div>

        <div className={`px-6 py-3 rounded-2xl border font-bold flex items-center gap-3 shadow-lg transition-all duration-500 ${statusColors[systemStatus]}`}>
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            systemStatus === "Safe" ? "bg-green-500" : systemStatus === "Warning" ? "bg-orange-500" : "bg-red-500"
          }`} />
          System Status: {systemStatus.toUpperCase()}
        </div>
      </div>

      {/* SOC Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Sessions" value={activeUsers.toString()} icon={Globe} color="text-blue-500" />
        <StatCard label="Failed Logins (24h)" value={failedLogins.toString()} icon={Lock} color="text-red-500" />
        <StatCard label="Threats Blocked" value="1,242" icon={Shield} color="text-green-500" />
        <StatCard label="Avg. Risk Score" value="14" icon={Activity} color="text-orange-500" />
      </div>

      {/* Main SOC Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Security Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-orange-500" />
              Live Security Feed
            </h3>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-[#0A0A0B] border border-white/10 rounded-[2.5rem] overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0A0A0B] border-b border-white/10 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Event</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Severity</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">Waiting for incoming telemetry...</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{log.event_type.replace("_", " ")}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                            log.severity === "critical" ? "bg-red-500/20 text-red-500" :
                            log.severity === "high" ? "bg-orange-500/20 text-orange-500" :
                            log.severity === "medium" ? "bg-blue-500/20 text-blue-500" :
                            "bg-green-500/20 text-green-500"
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 max-w-xs truncate">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fraud Alerts Sidebar */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Fraud Alerts
          </h3>
          
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center">
                <p className="text-gray-500 text-sm">No active fraud alerts detected.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-3xl border transition-all ${
                    alert.status === "open" ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      alert.risk_score > 80 ? "bg-red-500 text-white" : "bg-orange-500 text-white"
                    }`}>
                      Risk: {alert.risk_score}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mb-1">{alert.reason}</p>
                  <p className="text-xs text-gray-500 mb-4">User: {alert.user_id.slice(0, 8)}...</p>
                  <div className="flex items-center gap-2">
                    <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl transition-all">
                      Investigate
                    </button>
                    <button className="p-2 bg-white/10 hover:bg-white/20 text-gray-400 rounded-xl transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Risk Visualization */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Zap className="w-20 h-20 text-orange-500" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">AI Risk Engine</h4>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Our neural network is currently analyzing 1,242 data points per second across the global network.
            </p>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-orange-500">
              <span>Adaptive Mode</span>
              <span>Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-[#0A0A0B] border border-white/10 p-6 rounded-[2rem] flex items-center gap-5"
    >
      <div className={`w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
    </motion.div>
  );
}
