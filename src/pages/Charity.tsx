import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { 
  Heart, 
  TrendingUp, 
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Search
} from 'lucide-react';
import { charityApi } from '../lib/api';
import { Charity, CharityPaymentForm } from '../lib/types';
import toast from 'react-hot-toast';

export const CharityPage: React.FC = () => {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [paymentForm, setPaymentForm] = useState<CharityPaymentForm>({
    charity_id: 0,
    payment_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    recipient: '',
    description: ''
  });

  useEffect(() => {
    loadCharities();
  }, []);

  const loadCharities = async () => {
    try {
      setIsLoading(true);
      const response = await charityApi.getAll();
      setCharities(response.data.data.charity || []);
    } catch (error) {
      console.error('Error loading charities:', error);
      toast.error('Failed to load charity data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentForm.payment_amount || !paymentForm.payment_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedCharity && paymentForm.payment_amount > Number(selectedCharity.amount_remaining)) {
      toast.error('Payment amount cannot exceed remaining amount');
      return;
    }

    try {
      await charityApi.recordPayment(paymentForm);
      toast.success('Payment recorded successfully');
      setIsPaymentDialogOpen(false);
      setSelectedCharity(null);
      resetPaymentForm();
      loadCharities();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      charity_id: 0,
      payment_amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      recipient: '',
      description: ''
    });
  };

  const openPaymentDialog = (charity: Charity) => {
    setSelectedCharity(charity);
    setPaymentForm({
      charity_id: charity.id,
      payment_amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      recipient: charity.recipient || '',
      description: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'pending':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProgressPercentage = (charity: Charity) => {
    const required = Number(charity.amount_required);
    const paid = Number(charity.amount_paid);
    return required > 0 ? (paid / required) * 100 : 0;
  };

  const filteredCharities = charities.filter(charity => {
    const matchesSearch = 
      charity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charity.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charity.income_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || charity.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // --- FIX 1: Convert to number during calculation ---
  const totalRequired = charities.reduce((sum, charity) => sum + Number(charity.amount_required), 0);
  const totalPaid = charities.reduce((sum, charity) => sum + Number(charity.amount_paid), 0);
  const totalRemaining = charities.reduce((sum, charity) => sum + Number(charity.amount_remaining), 0);

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
          <h1 className="text-3xl font-bold text-gray-900">Charity Management</h1>
          <p className="text-gray-600 mt-2">Track your charity obligations and payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Required</CardTitle>
            <Heart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {/* The variables are now numbers, so .toFixed() is safe */}
            <div className="text-2xl font-bold text-green-900">${totalRequired.toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">Total charity obligations</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">Payments made</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Remaining</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">${totalRemaining.toFixed(2)}</div>
            <p className="text-xs text-yellow-600 mt-1">Amount still due</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {totalRequired > 0 ? ((totalPaid / totalRequired) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-purple-600 mt-1">Payment progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Charity Records</CardTitle>
          <CardDescription>Manage your charity obligations and track payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by description, recipient, or income..."
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
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Charity Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Income Source / Description</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCharities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                      No charity records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCharities.map((charity) => (
                    <TableRow key={charity.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{charity.income_description || charity.description}</div>
                          <div className="text-sm text-gray-500">{charity.recipient || 'N/A'}</div>
                        </div>
                      </TableCell>
                      {/* --- FIX 2: Convert to number before .toFixed() --- */}
                      <TableCell className="font-medium">${Number(charity.amount_required).toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">${Number(charity.amount_paid).toFixed(2)}</TableCell>
                      <TableCell className="text-red-600">${Number(charity.amount_remaining).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={getProgressPercentage(charity)} className="w-16" />
                          <span className="text-xs text-gray-500">
                            {getProgressPercentage(charity).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(charity.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(charity.income_date || charity.created_at).toLocaleDateString()}</div>
                          {charity.payment_date && (
                            <div className="text-gray-500">Paid: {new Date(charity.payment_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {charity.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(charity)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              Pay
                            </Button>
                          )}
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Charity Payment</DialogTitle>
            <DialogDescription>
              Record a payment for charity obligation
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayment}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  // --- FIX 3: Convert to number for max property ---
                  max={Number(selectedCharity?.amount_remaining) || 0}
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm,
                    payment_amount: parseFloat(e.target.value) || 0
                  })}
                  placeholder="0.00"
                  required
                />
                {selectedCharity && (
                  <p className="text-sm text-gray-500">
                    {/* --- FIX 4: Convert to number before .toFixed() --- */}
                    Remaining: ${Number(selectedCharity.amount_remaining).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm,
                    payment_date: e.target.value
                  })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="recipient">Recipient</Label>
                <Input
                  id="recipient"
                  value={paymentForm.recipient}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm,
                    recipient: e.target.value
                  })}
                  placeholder="Organization or person"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm,
                    description: e.target.value
                  })}
                  placeholder="Payment details..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};