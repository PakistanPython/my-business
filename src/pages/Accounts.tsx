import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  Wallet, 
  CreditCard, 
  DollarSign, 
  Search,
  Edit,
  Trash2,
  ArrowUpDown,
  Building,
  PiggyBank,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { accountApi } from '../lib/api';
import { Account, AccountForm } from '../lib/types';
import toast from 'react-hot-toast';

export const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAccountNumbers, setShowAccountNumbers] = useState(false);
  const [formData, setFormData] = useState<AccountForm>({
    account_type: 'cash',
    account_name: '',
    balance: 0,
    bank_name: '',
    account_number: ''
  });
  const [transferForm, setTransferForm] = useState({
    from_account_id: 0,
    to_account_id: 0,
    amount: 0,
    description: ''
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await accountApi.getAll();
      setAccounts(response.data.data.accounts || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_name || !formData.account_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingAccount) {
        await accountApi.update(editingAccount.id, formData);
        toast.success('Account updated successfully');
      } else {
        await accountApi.create(formData);
        toast.success('Account created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      loadAccounts();
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast.error(error.response?.data?.message || 'Failed to save account');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferForm.from_account_id || !transferForm.to_account_id || !transferForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (transferForm.from_account_id === transferForm.to_account_id) {
      toast.error('Cannot transfer to the same account');
      return;
    }

    try {
      await accountApi.transfer(transferForm);
      toast.success('Transfer completed successfully');
      setIsTransferDialogOpen(false);
      resetTransferForm();
      loadAccounts();
    } catch (error: any) {
      console.error('Error processing transfer:', error);
      toast.error(error.response?.data?.message || 'Failed to process transfer');
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      account_type: account.account_type,
      account_name: account.account_name,
      balance: account.balance,
      bank_name: account.bank_name || '',
      account_number: account.account_number || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (account: Account) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountApi.delete(account.id);
        toast.success('Account deleted successfully');
        loadAccounts();
      } catch (error: any) {
        console.error('Error deleting account:', error);
        toast.error(error.response?.data?.message || 'Failed to delete account');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      account_type: 'cash',
      account_name: '',
      balance: 0,
      bank_name: '',
      account_number: ''
    });
  };

  const resetTransferForm = () => {
    setTransferForm({
      from_account_id: 0,
      to_account_id: 0,
      amount: 0,
      description: ''
    });
  };

  const openAddDialog = () => {
    setEditingAccount(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Wallet className="h-4 w-4" />;
      case 'bank':
        return <Building className="h-4 w-4" />;
      case 'savings':
        return <PiggyBank className="h-4 w-4" />;
      case 'investment':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      bank: 'bg-blue-100 text-blue-800',
      savings: 'bg-purple-100 text-purple-800',
      investment: 'bg-orange-100 text-orange-800'
    };
    
    return (
      <Badge className={`${colors[type as keyof typeof colors]} hover:${colors[type as keyof typeof colors]}`}>
        {getAccountIcon(type)}
        <span className="ml-1 capitalize">{type}</span>
      </Badge>
    );
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return 'N/A';
    if (showAccountNumbers) return accountNumber;
    return accountNumber.replace(/\d(?=\d{4})/g, '*');
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || account.account_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
          <p className="text-gray-600 mt-2">Manage your bank accounts, cash, and savings</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Transfer
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">Across all accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Cash Accounts</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {accounts.filter(a => a.account_type === 'cash').length}
            </div>
            <p className="text-xs text-green-600 mt-1">
              ${accounts.filter(a => a.account_type === 'cash').reduce((sum, a) => sum + a.balance, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Bank Accounts</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {accounts.filter(a => a.account_type === 'bank').length}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              ${accounts.filter(a => a.account_type === 'bank').reduce((sum, a) => sum + a.balance, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {accounts.filter(a => a.account_type === 'savings').length}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              ${accounts.filter(a => a.account_type === 'savings').reduce((sum, a) => sum + a.balance, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Manage your financial accounts and balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccountNumbers(!showAccountNumbers)}
              className="flex items-center gap-2"
            >
              {showAccountNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAccountNumbers ? 'Hide' : 'Show'} Numbers
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.account_name}</TableCell>
                      <TableCell>{getAccountTypeBadge(account.account_type)}</TableCell>
                      <TableCell>{account.bank_name || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {maskAccountNumber(account.account_number || '')}
                      </TableCell>
                      <TableCell className="font-medium text-lg">
                        <span className={account.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${account.balance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(account.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(account)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDelete(account)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Update account information' : 'Create a new financial account'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="account_name">Account Name *</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  placeholder="My Checking Account"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account_type">Account Type *</Label>
                <Select 
                  value={formData.account_type} 
                  onValueChange={(value: any) => setFormData({...formData, account_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="balance">Current Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>

              {(formData.account_type === 'bank' || formData.account_type === 'savings') && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      placeholder="Bank of America"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                      placeholder="****1234"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingAccount ? 'Update' : 'Create'} Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transfer Between Accounts</DialogTitle>
            <DialogDescription>
              Move money from one account to another
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="from_account">From Account *</Label>
                <Select 
                  value={transferForm.from_account_id.toString()} 
                  onValueChange={(value) => setTransferForm({...transferForm, from_account_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.account_name} (${account.balance.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="to_account">To Account *</Label>
                <Select 
                  value={transferForm.to_account_id.toString()} 
                  onValueChange={(value) => setTransferForm({...transferForm, to_account_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.account_name} (${account.balance.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transfer_amount">Amount *</Label>
                <Input
                  id="transfer_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({...transferForm, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transfer_description">Description</Label>
                <Input
                  id="transfer_description"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({...transferForm, description: e.target.value})}
                  placeholder="Transfer reason..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Transfer Funds
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
