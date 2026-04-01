import React, { useState } from "react";
import { supabase } from "../supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP, 3: Success
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ q: "", a: 0 });
  const [userAnswer, setUserAnswer] = useState("");

  // Generate simple math captcha
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${num1} + ${num2}`, a: num1 + num2 });
  };

  React.useEffect(() => {
    generateCaptcha();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(userAnswer) !== captcha.a) {
      toast.error("Invalid CAPTCHA answer");
      generateCaptcha();
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { display_name: displayName }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          // Create initial profile in public.users table
          const { error: profileError } = await supabase.from("users").insert({
            uid: data.user.id,
            email,
            display_name: displayName,
            role: "user",
            balance: 1000,
            last_login: new Date().toISOString(),
            mfa_enabled: true,
            risk_score: 10
          });
          if (profileError) throw profileError;
        }
      }

      // Proceed to OTP step
      const response = await fetch("/api/auth/generate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        setStep(2);
        toast.success("MFA Required: OTP sent to your email");
      } else {
        throw new Error("Failed to generate OTP");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });

      if (response.ok) {
        setStep(3);
        toast.success("Authentication Successful");
      } else {
        toast.error("Invalid OTP code");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#0A0A0B]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.4)]">
              <Shield className="text-white w-10 h-10" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 1 ? (isLogin ? "Welcome Back" : "Create Account") : step === 2 ? "Verify Identity" : "Access Granted"}
            </h1>
            <p className="text-gray-400 text-sm">
              {step === 1 ? "Secure access to your RAKSHAKAVACH portal" : step === 2 ? `Enter the 6-digit code sent to ${email}` : "Redirecting to your secure dashboard..."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleAuth}
                className="space-y-4"
              >
                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Security Check: {captcha.q}</label>
                  <div className="relative">
                    <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={generateCaptcha} />
                    <input
                      type="number"
                      required
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all"
                      placeholder="Result"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                    <>
                      {isLogin ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-gray-500">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-orange-500 font-bold hover:underline"
                  >
                    {isLogin ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={verifyOtp}
                className="space-y-6"
              >
                <div className="flex justify-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 text-center text-3xl font-bold tracking-[0.5em] text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify & Continue"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-gray-500 text-sm font-medium hover:text-white transition-colors"
                >
                  Back to Login
                </button>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="text-green-500 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Secure Session Initialized</h2>
                <p className="text-gray-400">Welcome to RAKSHAKAVACH. Your session is protected by AES-256 encryption.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-gray-600">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <Shield className="w-4 h-4" />
            <span>ISO 27001</span>
          </div>
          <div className="w-1 h-1 bg-gray-800 rounded-full" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <Lock className="w-4 h-4" />
            <span>PCI DSS</span>
          </div>
          <div className="w-1 h-1 bg-gray-800 rounded-full" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <AlertCircle className="w-4 h-4" />
            <span>GDPR</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
