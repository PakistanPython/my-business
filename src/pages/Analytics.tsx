import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Download,
  Wallet,
  CreditCard,
  Heart,
  Target,
  ArrowUp,
  ArrowDown,
  PieChart,
  LineChart
} from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { AnalyticsData, DashboardSummary, MonthlyData, TrendData, CategoryStats, CharityOverview } from '../lib/types';
import toast from 'react-hot-toast';

// A helper function to safely format numbers to strings
const formatToFixed = (value: string | number | undefined | null, digits: number = 2): string => {
  const num = Number(value);
  if (isNaN(num)) {
    return '0.00';
  }
  return num.toFixed(digits);
};

export const AnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[] | null>(null);
  const [trendData, setTrendData] = useState<TrendData[] | null>(null);
  const [topExpenseCategories, setTopExpenseCategories] = useState<CategoryStats[] | null>(null);
  const [charityOverview, setCharityOverview] = useState<CharityOverview[] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
    loadAnalyticsData();
    loadDashboardSummary(); // Load summary data separately
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setAnalyticsData(null); 
      const response = await dashboardApi.getAnalytics({ time_range: timeRange });
      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardSummary = async () => {
    try {
      const response = await dashboardApi.getSummary();
      setDashboardSummary(response.data.data.summary);
      setMonthlyData(response.data.data.monthly_data);
      setTrendData(response.data.data.trend_data);
      setTopExpenseCategories(response.data.data.top_expense_categories);
      setCharityOverview(response.data.data.charity_overview);
    } catch (error) {
      console.error('Error loading dashboard summary:', error);
      toast.error('Failed to load dashboard summary data');
    }
  };

  const exportData = () => {
    if (!analyticsData || !dashboardSummary || !monthlyData || !trendData || !topExpenseCategories || !charityOverview) return;
    
    const data = {
      analytics: analyticsData,
      summary: dashboardSummary,
      monthly_data: monthlyData,
      trend_data: trendData,
      expense_categories: topExpenseCategories,
      charity_overview: charityOverview,
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
  
  const SimpleChart: React.FC<{ data: any[], title: string }> = ({ data, title }) => {
    if (!data || data.length === 0) {
      return <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>;
    }

    const numericData = data.map(d => ({
        ...d,
        value: Number(d.total_amount || d.income || d.monthly_income || 0),
        label: d.period || d.category || d.month_name || `Item`
    }));

    const maxValue = Math.max(...numericData.map(d => d.value));
    
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="space-y-3">
          {numericData.slice(0, 8).map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{item.label}</span>
                  <span className="font-medium">${item.value.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}/>
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
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card className={`${color}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? `$${formatToFixed(value)}` : value}
        </div>
        {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  if (isLoading || !dashboardSummary || !monthlyData || !trendData || !topExpenseCategories || !charityOverview || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = dashboardSummary;

  const savingsRate = Number(summary.total_income) > 0 
    ? ((Number(summary.total_income) - Number(summary.total_expenses)) / Number(summary.total_income)) * 100 
    : 0;

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
            <SelectTrigger className="w-40 bg-white">
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
          value={Number(summary.net_worth)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          color="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
          subtitle="Assets minus liabilities"
        />
        <MetricCard
          title="Monthly Income"
          value={Number(monthlyData[monthlyData.length - 1]?.monthly_income) || 0}
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          color="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
          subtitle="Current month"
        />
        <MetricCard
          title="Monthly Expenses"
          value={Number(monthlyData[monthlyData.length - 1]?.monthly_expenses) || 0}
          icon={<CreditCard className="h-4 w-4 text-red-600" />}
          color="bg-gradient-to-br from-red-50 to-red-100 border-red-200"
          subtitle="Current month"
        />
        <MetricCard
          title="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4 text-purple-600" />}
          color="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
          subtitle="Income vs expenses"
        />
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center"><Wallet className="w-5 h-5 mr-2" />Assets Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-green-700">Total Income</span><span className="font-bold text-green-900">${formatToFixed(summary.total_income)}</span></div>
            <div className="flex justify-between"><span className="text-green-700">Account Balances</span><span className="font-bold text-green-900">${formatToFixed(summary.total_accounts_balance)}</span></div>
            <div className="flex justify-between"><span className="text-green-700">Available Cash</span><span className="font-bold text-green-900">${formatToFixed(summary.available_cash)}</span></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center"><CreditCard className="w-5 h-5 mr-2" />Liabilities Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-red-700">Total Expenses</span><span className="font-bold text-red-900">${formatToFixed(summary.total_expenses)}</span></div>
            <div className="flex justify-between"><span className="text-red-700">Active Loans</span><span className="font-bold text-red-900">${formatToFixed(summary.total_active_loans)}</span></div>
            <div className="flex justify-between"><span className="text-red-700">Charity Due</span><span className="font-bold text-red-900">${formatToFixed(summary.total_charity_remaining)}</span></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center"><Heart className="w-5 h-5 mr-2" />Charity Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-blue-700">Total Required</span><span className="font-bold text-blue-900">${formatToFixed(summary.total_charity_required)}</span></div>
            <div className="flex justify-between"><span className="text-blue-700">Amount Paid</span><span className="font-bold text-blue-900">${formatToFixed(summary.total_charity_paid)}</span></div>
            <div className="flex justify-between"><span className="text-blue-700">Completion Rate</span><span className="font-bold text-blue-900">{Number(summary.total_charity_required) > 0 ? ((Number(summary.total_charity_paid) / Number(summary.total_charity_required)) * 100).toFixed(1) : '100.0'}%</span></div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><LineChart className="w-5 h-5 mr-2" />Income vs Expenses Trend</CardTitle>
            <CardDescription>Last {timeRange === '3months' ? '3' : timeRange === '6months' ? '6' : timeRange === '12months' ? '12' : '24'} Months</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleChart data={trendData} title="Income vs Expenses" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><PieChart className="w-5 h-5 mr-2" />Top Expense Categories</CardTitle>
            <CardDescription>Breakdown of spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleChart data={topExpenseCategories} title="Expense Categories" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="w-5 h-5 mr-2" />Monthly Income</CardTitle>
            <CardDescription>Income over the last {timeRange === '3months' ? '3' : timeRange === '6months' ? '6' : timeRange === '12months' ? '12' : '24'} months</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleChart data={analyticsData.income_analytics} title="Monthly Income" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="w-5 h-5 mr-2" />Monthly Expenses</CardTitle>
            <CardDescription>Expenses over the last {timeRange === '3months' ? '3' : timeRange === '6months' ? '6' : timeRange === '12months' ? '12' : '24'} months</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleChart data={analyticsData.expense_analytics} title="Monthly Expenses" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><TrendingUp className="w-5 h-5 mr-2" />Profitability Analysis</CardTitle>
          <CardDescription>Income, Expenses, and Profit over time</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleChart data={analyticsData.profit_analysis} title="Profit Analysis" />
        </CardContent>
      </Card>
    </div>
  );
};
