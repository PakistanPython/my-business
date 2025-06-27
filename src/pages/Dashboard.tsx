import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Heart,
  DollarSign,
  Users,
  Activity,
  BarChart3
} from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { DashboardData, DashboardSummary } from '../lib/types';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [summaryResponse, analyticsResponse] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getAnalytics()
      ]);
      
      setSummary(summaryResponse.data.data);
      setDashboardData(analyticsResponse.data.data);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadDashboardData}>Try Again</Button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const statsCards = [
    {
      title: 'Total Income',
      value: formatCurrency(summary?.total_income || 0),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+12.5%',
      changeType: 'positive' as const,
      href: '/income'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(summary?.total_expenses || 0),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: '+4.3%',
      changeType: 'negative' as const,
      href: '/expenses'
    },
    {
      title: 'Account Balance',
      value: formatCurrency(summary?.total_accounts_balance || 0),
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+8.2%',
      changeType: 'positive' as const,
      href: '/accounts'
    },
    {
      title: 'Active Loans',
      value: formatCurrency(summary?.total_active_loans || 0),
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '-2.1%',
      changeType: 'positive' as const,
      href: '/loans'
    },
    {
      title: 'Charity Required',
      value: formatCurrency(summary?.total_charity_required || 0),
      icon: Heart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+5.4%',
      changeType: 'neutral' as const,
      href: '/charity'
    },
    {
      title: 'Net Worth',
      value: formatCurrency(summary?.net_worth || 0),
      icon: DollarSign,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: '+15.8%',
      changeType: 'positive' as const,
      href: '/analytics'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link to="/income">Add Income</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/expenses">Add Expense</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to={stat.href}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-md ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className={`text-xs ${
                    stat.changeType === 'positive' 
                      ? 'text-green-600' 
                      : stat.changeType === 'negative' 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Monthly Trends
            </CardTitle>
            <CardDescription>
              Income vs Expenses over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart will be rendered here</p>
                <p className="text-sm text-gray-400">Integration with chart library needed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Your latest financial activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.recent_transactions?.slice(0, 5).map((transaction, index) => (
                <div key={transaction.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      transaction.transaction_type === 'income' 
                        ? 'bg-green-100 text-green-600' 
                        : transaction.transaction_type === 'expense'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-blue-100 text-blue-600'
                    }`}>
                      {transaction.transaction_type === 'income' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : transaction.transaction_type === 'expense' ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {transaction.description || `${transaction.transaction_type} Transaction`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${
                    transaction.transaction_type === 'income' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {transaction.transaction_type === 'income' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </div>
                </div>
              )) || (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No recent transactions</p>
                  <p className="text-sm text-gray-400">Start by adding some income or expenses</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you might want to perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col" asChild>
              <Link to="/income">
                <TrendingUp className="h-6 w-6 mb-2" />
                Add Income
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col" asChild>
              <Link to="/expenses">
                <TrendingDown className="h-6 w-6 mb-2" />
                Add Expense
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col" asChild>
              <Link to="/accounts">
                <Wallet className="h-6 w-6 mb-2" />
                Manage Accounts
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col" asChild>
              <Link to="/analytics">
                <BarChart3 className="h-6 w-6 mb-2" />
                View Reports
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
