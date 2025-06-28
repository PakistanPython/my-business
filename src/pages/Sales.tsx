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
import { 
  Plus, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  Search,
  Filter,
  Edit,
  Trash2,
  User,
  Phone,
  Package,
  Target
} from 'lucide-react';
import { saleApi, categoryApi, purchaseApi } from '../lib/api';
import { Sale, SaleForm, Category, Purchase } from '../lib/types';
import toast from 'react-hot-toast';

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState<SaleForm>({
    purchase_id: undefined,
    amount: 0,
    selling_price: 0,
    description: '',
    customer_name: '',
    customer_contact: '',
    payment_method: '',
    date: new Date().toISOString().split('T')[0],
    status: 'completed',
    notes: '',
    category: '', // Added category
    receipt_path: '' // Added receipt_path
  });

  const paymentMethods = [
    'Cash',
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'Check',
    'PayPal',
    'Mobile Payment',
    'Other'
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [salesResponse, categoriesResponse, purchasesResponse] = await Promise.all([
        saleApi.getAll(),
        categoryApi.getAll({ type: 'sale' }),
        saleApi.getAvailablePurchases()
      ]);
      
      console.log('Categories fetched for sale type:', categoriesResponse.data.data.categories); // Add this line
      const fetchedSales = salesResponse.data.data.sales || [];
      const sanitizedSales = fetchedSales.map((sale: Sale) => ({
        ...sale,
        amount: Number(sale.amount) || 0,
        selling_price: Number(sale.selling_price) || 0,
        profit: Number(sale.profit) || 0,
        profit_percentage: Number(sale.profit_percentage) || 0,
      }));
      setSales(sanitizedSales);
      setCategories(categoriesResponse.data.data.categories || []);
      setAvailablePurchases(purchasesResponse.data.data.purchases || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load sale data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.selling_price || !formData.payment_method || !formData.date || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.selling_price <= 0) {
      toast.error('Selling price must be greater than 0');
      return;
    }

    try {
      if (editingSale) {
        await saleApi.update(editingSale.id, formData);
        toast.success('Sale updated successfully');
      } else {
        await saleApi.create(formData);
        toast.success('Sale added successfully');
      }
      
      setIsDialogOpen(false);
      setEditingSale(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving sale:', error);
      toast.error(error.response?.data?.message || 'Failed to save sale');
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      purchase_id: sale.purchase_id,
      amount: sale.amount,
      selling_price: sale.selling_price,
      description: sale.description || '',
      customer_name: sale.customer_name || '',
      customer_contact: sale.customer_contact || '',
      payment_method: sale.payment_method,
      date: sale.date,
      status: sale.status,
      notes: sale.notes || '',
      category: sale.category, // Added category
      receipt_path: sale.receipt_path || '' // Added receipt_path
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) {
      return;
    }

    try {
      await saleApi.delete(id);
      toast.success('Sale deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      toast.error(error.response?.data?.message || 'Failed to delete sale');
    }
  };

  const resetForm = () => {
    setFormData({
      purchase_id: undefined,
      amount: 0,
      selling_price: 0,
      description: '',
      customer_name: '',
      customer_contact: '',
      payment_method: '',
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      notes: '',
      category: '', // Added category
      receipt_path: '' // Added receipt_path
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'selling_price' ? Number(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'purchase_id') {
      const selectedPurchase = availablePurchases.find(p => p.id === Number(value));
      if (selectedPurchase) {
        setFormData(prev => ({
          ...prev,
          purchase_id: Number(value),
          amount: selectedPurchase.amount,
          description: selectedPurchase.description || ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          purchase_id: undefined,
          amount: 0,
          description: ''
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value === 'null' ? undefined : value }));
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sale.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getSummaryStats = () => {
    const completedSales = sales.filter(sale => sale.status === 'completed');
    const totalRevenue = completedSales.reduce((sum, sale) => sum + sale.selling_price, 0);
    const totalProfit = completedSales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalCost = completedSales.reduce((sum, sale) => sum + sale.amount, 0);
    const avgProfitMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      totalSales: completedSales.length,
      totalRevenue,
      totalProfit,
      avgProfitMargin
    };
  };

  const stats = getSummaryStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600">Track and manage your product sales</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingSale(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSale ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
              <DialogDescription>
                {editingSale ? 'Update sale details below.' : 'Enter the details for the new sale.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select 
                    value={formData.payment_method} 
                    onValueChange={(value) => handleSelectChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div>
                  <Label htmlFor="date">Sale Date *</Label>
                  <Input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <Label htmlFor="selling_price">Selling Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    id="selling_price"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Receipt Path */}
              <div>
                <Label htmlFor="receipt_path">Receipt Path</Label>
                <Input
                  type="text"
                  id="receipt_path"
                  name="receipt_path"
                  value={formData.receipt_path || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., /uploads/receipt.jpg"
                />
              </div>

              {/* Purchase ID (Optional) */}
              <div>
                <Label htmlFor="purchase_id">Linked Purchase (Optional)</Label>
                <Select
                  value={formData.purchase_id?.toString() || ''}
                  onValueChange={(value) => handleSelectChange('purchase_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purchase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">No linked purchase</SelectItem>
                    {availablePurchases.map((purchase) => (
                      <SelectItem key={purchase.id} value={purchase.id.toString()}>
                        {purchase.description} (Amount: {formatCurrency(purchase.amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Name */}
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  type="text"
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name || ''}
                  onChange={handleInputChange}
                  placeholder="Customer's Name"
                />
              </div>

              {/* Customer Contact */}
              <div>
                <Label htmlFor="customer_contact">Customer Contact</Label>
                <Input
                  type="text"
                  id="customer_contact"
                  name="customer_contact"
                  value={formData.customer_contact || ''}
                  onChange={handleInputChange}
                  placeholder="Customer's Contact Info"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Sale description"
                  rows={3}
                />
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'completed'}
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  placeholder="Any additional notes"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSale ? 'Update' : 'Create'} Sale
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Completed sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From completed sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">Net profit earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(stats.avgProfitMargin)}</div>
            <p className="text-xs text-muted-foreground">Average margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sales Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                        <span className="text-gray-500">No sales found</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.description || 'No description'}</div>
                          {sale.purchase_description && (
                            <div className="text-sm text-gray-500">From: {sale.purchase_description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {sale.customer_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="text-sm">{sale.customer_name}</span>
                            </div>
                          )}
                          {sale.customer_contact && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="text-sm text-gray-500">{sale.customer_contact}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(sale.amount)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(sale.selling_price)}</TableCell>
                      <TableCell>
                        <div>
                          <div className={`font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(sale.profit)}
                          </div>
                          <div className="text-sm text-gray-500">{formatPercentage(sale.profit_percentage)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusOptions.find(s => s.value === sale.status)?.color}>
                          {statusOptions.find(s => s.value === sale.status)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sale)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
};

export default SalesPage;
