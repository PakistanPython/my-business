// User and Authentication Types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Financial Data Types
export interface Income {
  id: number;
  amount: number;
  description?: string;
  category: string;
  source?: string;
  date: string;
  charity_required: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  amount: number;
  description?: string;
  category: string;
  payment_method: string;
  date: string;
  receipt_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  amount: number;
  description?: string;
  category: string;
  payment_method: string;
  date: string;
  receipt_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Charity {
  id: number;
  income_id?: number;
  amount_required: number;
  amount_paid: number;
  amount_remaining: number;
  status: 'pending' | 'partial' | 'paid';
  payment_date?: string;
  description?: string;
  recipient?: string;
  created_at: string;
  updated_at: string;
  income_amount?: number;
  income_description?: string;
  income_date?: string;
}

export interface Account {
  id: number;
  account_type: 'cash' | 'bank' | 'savings' | 'investment';
  account_name: string;
  balance: number;
  bank_name?: string;
  account_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  loan_type: 'personal' | 'business' | 'mortgage' | 'auto' | 'other';
  lender_name: string;
  principal_amount: number;
  current_balance: number;
  interest_rate?: number;
  monthly_payment?: number;
  start_date: string;
  due_date?: string;
  status: 'active' | 'paid' | 'defaulted';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense' | 'purchase';
  color: string;
  icon: string;
  created_at: string;
  transaction_count?: number;
  total_amount?: number;
}

export interface Transaction {
  id: number;
  transaction_type: 'income' | 'expense' | 'purchase' | 'transfer' | 'loan_payment' | 'charity';
  reference_id?: number;
  reference_table?: string;
  amount: number;
  description?: string;
  account_id?: number;
  date: string;
  created_at: string;
}

// Dashboard and Analytics Types
export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  total_accounts_balance: number;
  total_active_loans: number;
  total_charity_required: number;
  total_charity_paid: number;
  total_charity_remaining: number;
  net_worth: number;
  available_cash: number;
}

export interface MonthlyData {
  month_num: number;
  month_name: string;
  monthly_income: number;
  monthly_expenses: number;
  monthly_charity: number;
  monthly_profit: number;
}

export interface TrendData {
  month: string;
  month_label: string;
  income: number;
  expenses: number;
}

export interface CategoryStats {
  category: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

export interface CharityOverview {
  status: string;
  count: number;
  total_required: number;
  total_paid: number;
  total_remaining: number;
}

export interface AnalyticsData {
  period: string;
  year: number;
  income_analytics: AnalyticsRecord[];
  expense_analytics: AnalyticsRecord[];
  profit_analysis: ProfitAnalysisRecord[];
}

export interface AnalyticsRecord {
  period: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
  category: string;
  charity_generated?: number;
}

export interface ProfitAnalysisRecord {
  period: string;
  income: number;
  expenses: number;
  profit: number;
  profit_margin: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  monthly_data: MonthlyData[];
  recent_transactions: Transaction[];
  top_expense_categories: CategoryStats[];
  trend_data: TrendData[];
  charity_overview: CharityOverview[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    [key: string]: T[] | PaginationInfo;
    pagination: PaginationInfo;
  };
}

// Form Types
export interface LoginForm {
  login: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface IncomeForm {
  amount: number;
  description?: string;
  category: string;
  source?: string;
  date: string;
}

export interface ExpenseForm {
  amount: number;
  description?: string;
  category: string;
  payment_method: string;
  date: string;
}

export interface PurchaseForm {
  amount: number;
  description?: string;
  category: string;
  payment_method: string;
  date: string;
}

export interface CharityPaymentForm {
  charity_id: number;
  payment_amount: number;
  payment_date: string;
  recipient?: string;
  description?: string;
}

export interface AccountForm {
  account_type: 'cash' | 'bank' | 'savings' | 'investment';
  account_name: string;
  balance?: number;
  bank_name?: string;
  account_number?: string;
}

export interface LoanForm {
  loan_type: 'personal' | 'business' | 'mortgage' | 'auto' | 'other';
  lender_name: string;
  principal_amount: number;
  current_balance?: number;
  interest_rate?: number;
  monthly_payment?: number;
  start_date: string;
  due_date?: string;
}

export interface CategoryForm {
  name: string;
  type: 'income' | 'expense' | 'purchase';
  color?: string;
  icon?: string;
}

// Filter and Query Types
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FinancialQueryParams extends BaseQueryParams {
  category?: string;
  start_date?: string;
  end_date?: string;
}

export interface CharityQueryParams extends BaseQueryParams {
  status?: 'pending' | 'partial' | 'paid';
  start_date?: string;
  end_date?: string;
}

export interface LoanQueryParams extends BaseQueryParams {
  status?: 'active' | 'paid' | 'defaulted';
  loan_type?: 'personal' | 'business' | 'mortgage' | 'auto' | 'other';
}
