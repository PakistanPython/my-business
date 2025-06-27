import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  Wallet,
  CreditCard,
  Heart,
  Target,
  ArrowUp,
  ArrowDown,
  PieChart,
  LineChart
} from 'lucide-react';
import { dashboardApi, incomeApi, expenseApi, charityApi, loanApi } from '../lib/api';
import { DashboardData, TrendData, CategoryStats, MonthlyData } from '../lib/types';
import toast from 'react-hot-toast';

export const AnalyticsPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const response = await dashboardApi.getAnalytics({ time_range: timeRange });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    if (!dashboardData) return;
    
    const data = {
      summary: dashboardData.summary,
      monthly_data: dashboardData.monthly_data,
      trend_data: dashboardData.trend_data,
      expense_categories: dashboardData.top_expense_categories,
      charity_overview: dashboardData.charity_overview,
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_analytics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Analytics data exported successfully');
  };

  const SimpleChart: React.FC<{ data: any[], title: string, type: 'bar' | 'line' | 'pie' }> = ({ data, title, type }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.value || d.monthly_income || d.income || d.total_amount || 0));
    
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="space-y-3">
          {data.slice(0, 8).map((item, index) => {
            const value = item.value || item.monthly_income || item.income || item.total_amount || 0;
            const label = item.label || item.month_name || item.month || item.category || item.name || `Item ${index + 1}`;
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{label}</span>
                  <span className="font-medium">${value.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const MetricCard: React.FC<{ 
    title: string; 
    value: string | number; 
    change?: number; 
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
  }> = ({ title, value, change, icon, color, subtitle }) => (
    <Card className={`${color}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? `$${value.toFixed(2)}` : value}
        </div>
        {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
        {change !== undefined && (
          <p className="text-xs mt-1 flex items-center">
            {change >= 0 ? (
              <ArrowUp className="w-3 h-3 mr-1 text-green-600" />
            ) : (
              <ArrowDown className="w-3 h-3 mr-1 text-red-600" />
            )}
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(change).toFixed(1)}% from last period
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const { summary, monthly_data, trend_data, top_expense_categories, charity_overview } = dashboardData;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive financial insights and trends</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="24months">Last 24 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Net Worth"
          value={summary.net_worth}
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          color="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
          subtitle="Assets minus liabilities"
        />
        <MetricCard
          title="Monthly Income"
          value={monthly_data?.[monthly_data.length - 1]?.monthly_income || 0}
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          color="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
          subtitle="Current month average"
        />
        <MetricCard
          title="Monthly Expenses"
          value={monthly_data?.[monthly_data.length - 1]?.monthly_expenses || 0}
          icon={<CreditCard className="h-4 w-4 text-red-600" />}
          color="bg-gradient-to-br from-red-50 to-red-100 border-red-200"
          subtitle="Current month total"
        />
        <MetricCard
          title="Savings Rate"
          value={`${summary.total_income > 0 ? 
            (((summary.total_income - summary.total_expenses) / summary.total_income) * 100).toFixed(1) 
            : 0}%`}
          icon={<Target className="h-4 w-4 text-purple-600" />}
          color="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
          subtitle="Income vs expenses ratio"
        />
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Assets Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-green-700">Total Income</span>
              <span className="font-bold text-green-900">${summary.total_income.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Account Balances</span>
              <span className="font-bold text-green-900">${summary.total_accounts_balance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Available Cash</span>
              <span className="font-bold text-green-900">${summary.available_cash.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Liabilities Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-red-700">Total Expenses</span>
              <span className="font-bold text-red-900">${summary.total_expenses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">Active Loans</span>
              <span className="font-bold text-red-900">${summary.total_active_loans.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">Charity Due</span>
              <span className="font-bold text-red-900">${summary.total_charity_remaining.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Charity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-blue-700">Total Required</span>
              <span className="font-bold text-blue-900">${summary.total_charity_required.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Amount Paid</span>
              <span className="font-bold text-blue-900">${summary.total_charity_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Completion Rate</span>
              <span className="font-bold text-blue-900">
                {summary.total_charity_required > 0 ? 
                  ((summary.total_charity_paid / summary.total_charity_required) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="w-5 h-5 mr-2" />
              Monthly Financial Trends
            </CardTitle>
            <CardDescription>Income vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleChart 
              data={monthly_data?.map(m => ({ 
                label: m.month_name, 
                value: m.monthly_income 
              })) || []} 
              title="Monthly Income Trend" 
              type="line" 
            />
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Top Expense Categories
            </CardTitle>
            <CardDescription>Breakdown of spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleChart 
              data={top_expense_categories?.map(c => ({ 
                label: c.category, 
                value: c.total_amount 
              })) || []} 
              title="Expense Distribution" 
              type="pie" 
            />
          </CardContent>
        </Card>

        {/* Profit Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Monthly Profit Analysis
            </CardTitle>
            <CardDescription>Income minus expenses by month</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleChart 
              data={monthly_data?.map(m => ({ 
                label: m.month_name, 
                value: m.monthly_profit 
              })) || []} 
              title="Monthly Profit" 
              type="bar" 
            />
          </CardContent>
        </Card>

        {/* Charity Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Charity Payment Status
            </CardTitle>
            <CardDescription>Overview of charity obligations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {charity_overview?.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{item.status}</span>
                    <span className="text-sm text-gray-500">{item.count} items</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Required: ${item.total_required.toFixed(2)}</span>
                    <span className="text-xs text-gray-600">Paid: ${item.total_paid.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        item.status === 'paid' ? 'bg-green-500' : 
                        item.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: `${item.total_required > 0 ? (item.total_paid / item.total_required) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-4">
                  No charity data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Indicators</CardTitle>
          <CardDescription>Key metrics to track your financial wellbeing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Debt-to-Income Ratio</h4>
              <div className="text-2xl font-bold text-blue-600">
                {summary.total_income > 0 ? 
                  ((summary.total_active_loans / summary.total_income) * 100).toFixed(1) 
                  : 0}%
              </div>
              <p className="text-sm text-gray-500">
                {summary.total_income > 0 && (summary.total_active_loans / summary.total_income) < 0.36 
                  ? 'Healthy ratio' : 'Consider debt reduction'}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Emergency Fund Ratio</h4>
              <div className="text-2xl font-bold text-green-600">
                {monthly_data?.[monthly_data.length - 1]?.monthly_expenses > 0 ? 
                  (summary.available_cash / (monthly_data[monthly_data.length - 1].monthly_expenses || 1)).toFixed(1) 
                  : 0} months
              </div>
              <p className="text-sm text-gray-500">
                {summary.available_cash / (monthly_data?.[monthly_data.length - 1]?.monthly_expenses || 1) >= 3 
                  ? 'Good emergency coverage' : 'Build emergency fund'}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Charity Compliance</h4>
              <div className="text-2xl font-bold text-purple-600">
                {summary.total_charity_required > 0 ? 
                  ((summary.total_charity_paid / summary.total_charity_required) * 100).toFixed(1) 
                  : 100}%
              </div>
              <p className="text-sm text-gray-500">
                {(summary.total_charity_paid / summary.total_charity_required) >= 0.8 
                  ? 'On track with obligations' : 'Increase charity payments'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
