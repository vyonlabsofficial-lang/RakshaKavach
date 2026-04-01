-- RAKSHAKAVACH Supabase Schema

-- 1. Users Table
CREATE TABLE users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  balance DECIMAL(12, 2) DEFAULT 1000.00,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT TRUE,
  risk_score INTEGER DEFAULT 10
);

-- 2. Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(uid),
  receiver_id UUID REFERENCES users(uid),
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT CHECK (type IN ('transfer', 'deposit', 'withdrawal')),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'flagged')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- 3. Security Logs Table
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(uid),
  event_type TEXT CHECK (event_type IN ('login', 'logout', 'mfa_success', 'mfa_failure', 'fraud_alert', 'account_lock')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  details TEXT
);

-- 4. Fraud Alerts Table
CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(uid),
  transaction_id UUID REFERENCES transactions(id),
  risk_score INTEGER,
  reason TEXT,
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for Users
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "Admins can view all profiles" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);

-- Policies for Transactions
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can create their own transactions" ON transactions FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Policies for Security Logs
CREATE POLICY "Users can view their own logs" ON security_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON security_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);

-- Policies for Fraud Alerts
CREATE POLICY "Users can view their own alerts" ON fraud_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all alerts" ON fraud_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);
