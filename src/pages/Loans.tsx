import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import {
  Plus,
  CreditCard,
  TrendingDown,
  DollarSign,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Home,
  Car,
  Briefcase,
  User,
} from 'lucide-react';
import { loanApi } from '../lib/api';
import { Loan, LoanForm } from '../lib/types';
import toast from 'react-hot-toast';

export const LoansPage: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState<LoanForm>({
    loan_type: 'personal',
    lender_name: '',
    principal_amount: 0,
    current_balance: 0,
    interest_rate: 0,
    monthly_payment: 0,
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      const response = await loanApi.getAll();
      setLoans(response.data.data.loans || []);
    } catch (error) {
      console.error('Error loading loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.lender_name || !formData.principal_amount || !formData.start_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const submitData = {
        ...formData,
        current_balance: formData.current_balance || formData.principal_amount,
      };

      if (editingLoan) {
        await loanApi.update(editingLoan.id, submitData);
        toast.success('Loan updated successfully');
      } else {
        await loanApi.create(submitData);
        toast.success('Loan added successfully');
      }

      setIsDialogOpen(false);
      setEditingLoan(null);
      resetForm();
      loadLoans();
    } catch (error: any) {
      console.error('Error saving loan:', error);
      toast.error(error.response?.data?.message || 'Failed to save loan');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentForm.amount || !paymentForm.payment_date || !selectedLoan) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (paymentForm.amount > Number(selectedLoan.current_balance)) {
      toast.error('Payment amount cannot exceed current balance');
      return;
    }

    try {
      await loanApi.recordPayment(selectedLoan.id, paymentForm);
      toast.success('Payment recorded successfully');
      setIsPaymentDialogOpen(false);
      setSelectedLoan(null);
      resetPaymentForm();
      loadLoans();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      loan_type: loan.loan_type,
      lender_name: loan.lender_name,
      principal_amount: Number(loan.principal_amount),
      current_balance: Number(loan.current_balance),
      interest_rate: Number(loan.interest_rate) || 0,
      monthly_payment: Number(loan.monthly_payment) || 0,
      start_date: loan.start_date.split('T')[0],
      due_date: loan.due_date ? loan.due_date.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (loan: Loan) => {
    if (window.confirm('Are you sure you want to delete this loan? This will also delete related payments.')) {
      try {
        await loanApi.delete(loan.id);
        toast.success('Loan deleted successfully');
        loadLoans();
      } catch (error: any) {
        console.error('Error deleting loan:', error);
        toast.error(error.response?.data?.message || 'Failed to delete loan');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      loan_type: 'personal',
      lender_name: '',
      principal_amount: 0,
      current_balance: 0,
      interest_rate: 0,
      monthly_payment: 0,
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  const openAddDialog = () => {
    setEditingLoan(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openPaymentDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    resetPaymentForm();
    setIsPaymentDialogOpen(true);
  };

  const getLoanIcon = (type: string) => {
    switch (type) {
      case 'mortgage': return <Home className="h-4 w-4" />;
      case 'auto': return <Car className="h-4 w-4" />;
      case 'business': return <Briefcase className="h-4 w-4" />;
      case 'personal': return <User className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paid': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'defaulted': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><AlertCircle className="w-3 h-3 mr-1" />Defaulted</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLoanTypeBadge = (type: string) => {
    const colors: { [key: string]: string } = {
      personal: 'bg-purple-100 text-purple-800',
      business: 'bg-blue-100 text-blue-800',
      mortgage: 'bg-green-100 text-green-800',
      auto: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={`${colors[type]} hover:${colors[type]}`}>
        {getLoanIcon(type)}
        <span className="ml-1 capitalize">{type}</span>
      </Badge>
    );
  };

  const getPaymentProgress = (loan: Loan) => {
    const principal = Number(loan.principal_amount);
    if (principal === 0) return 0;
    const paidAmount = principal - Number(loan.current_balance);
    return (paidAmount / principal) * 100;
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.lender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.loan_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
    const matchesType = filterType === 'all' || loan.loan_type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // --- THE FIX: Convert to Number before adding ---
  const activeLoans = loans.filter(loan => loan.status === 'active');
  const totalPrincipal = loans.reduce((sum, loan) => sum + Number(loan.principal_amount), 0);
  const totalBalance = activeLoans.reduce((sum, loan) => sum + Number(loan.current_balance), 0);
  const totalPaid = totalPrincipal - totalBalance;

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
          <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
          <p className="text-gray-600 mt-2">Track your loans and manage payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Loan
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Summary Cards - .toFixed() is now safe */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Total Debt</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-red-600 mt-1">Current balance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Principal</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">${totalPrincipal.toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">Original loan amounts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">Amount repaid</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Active Loans</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{activeLoans.length}</div>
            <p className="text-xs text-purple-600 mt-1">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
          <CardDescription>Manage your loans and track payment progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search loans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
              <option value="defaulted">Defaulted</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="mortgage">Mortgage</option>
              <option value="auto">Auto</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lender</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Interest Rate</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-gray-500">No loans found</TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.lender_name}</TableCell>
                      <TableCell>{getLoanTypeBadge(loan.loan_type)}</TableCell>
                      {/* FIX: Convert to Number before .toFixed() */}
                      <TableCell>${Number(loan.principal_amount).toFixed(2)}</TableCell>
                      <TableCell className="font-medium text-red-600">${Number(loan.current_balance).toFixed(2)}</TableCell>
                      <TableCell>{loan.interest_rate ? `${Number(loan.interest_rate).toFixed(2)}%` : 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={getPaymentProgress(loan)} className="w-16" />
                          <span className="text-xs text-gray-500">{getPaymentProgress(loan).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell>{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {loan.status === 'active' && (
                            <Button size="sm" onClick={() => openPaymentDialog(loan)} className="bg-green-600 hover:bg-green-700">
                              <CreditCard className="w-4 h-4 mr-1" /> Pay
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEdit(loan)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(loan)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
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

      {/* Loan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* ... Dialog content for adding/editing loans ... */}
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Loan Payment</DialogTitle>
            <DialogDescription>Record a payment for {selectedLoan?.lender_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayment}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(selectedLoan?.current_balance) || 0}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  required
                />
                {selectedLoan && (
                  <p className="text-sm text-gray-500">
                    Current balance: ${Number(selectedLoan.current_balance).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment_description">Description (Optional)</Label>
                <Textarea
                  id="payment_description"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                  placeholder="e.g., Monthly payment"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};