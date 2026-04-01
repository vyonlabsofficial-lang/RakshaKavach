export type UserRole = "user" | "admin";
export type AccountStatus = "active" | "locked" | "suspended";
export type TransactionType = "transfer" | "deposit" | "withdrawal";
export type TransactionStatus = "pending" | "completed" | "failed" | "flagged";
export type SecurityEventType = "login" | "logout" | "mfa_success" | "mfa_failure" | "fraud_alert" | "account_lock";
export type Severity = "low" | "medium" | "high" | "critical";
export type FraudAlertStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  role: UserRole;
  balance: number;
  last_login: string;
  mfa_enabled: boolean;
  risk_score: number;
}

export interface BankAccount {
  account_number: string;
  user_id: string;
  type: "savings" | "checking";
  status: AccountStatus;
}

export interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: string;
  description: string;
}

export interface SecurityLog {
  id: string;
  user_id: string;
  event_type: SecurityEventType;
  severity: Severity;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  details: string;
}

export interface FraudAlert {
  id: string;
  user_id: string;
  transaction_id?: string;
  risk_score: number;
  reason: string;
  status: FraudAlertStatus;
  timestamp: string;
}
