import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { 
  User, 
  Mail, 
  Key, 
  Settings, 
  Bell,
  Shield,
  Download,
  Upload,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Camera,
  Save,
  RefreshCw
} from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { User as UserType } from '../lib/types';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    full_name: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    weekly_reports: true,
    monthly_summary: true,
    currency: 'USD',
    date_format: 'MM/DD/YYYY',
    theme: 'light'
  });

  const [stats, setStats] = useState({
    total_transactions: 0,
    account_created: '',
    last_login: '',
    data_usage: 0
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username,
        email: user.email,
        full_name: user.full_name
      });
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      // This would typically come from an API endpoint
      setStats({
        total_transactions: 156,
        account_created: user?.created_at || '',
        last_login: new Date().toISOString(),
        data_usage: 2.5
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.updateProfile(profileForm);
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        updateUser(updatedUser);
        toast.success('Profile updated successfully');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // This would be an API call to change password
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Password changed successfully');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    // Simulate data export
    const exportData = {
      user_profile: user,
      preferences: preferences,
      stats: stats,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Profile data exported successfully');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('This will permanently delete all your data. Type "DELETE" to confirm.')) {
        toast.error('Account deletion not implemented in demo');
      }
    }
  };

  const TabButton: React.FC<{ id: string; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id
          ? 'bg-blue-100 text-blue-700 border border-blue-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.full_name}</h2>
              <p className="text-gray-600">@{user?.username}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Change Photo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Age</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.account_created ? 
                Math.floor((new Date().getTime() - new Date(stats.account_created).getTime()) / (1000 * 60 * 60 * 24)) 
                : 0} days
            </div>
            <p className="text-xs text-muted-foreground">Since creation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_transactions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Usage</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data_usage} MB</div>
            <p className="text-xs text-muted-foreground">Storage used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Login</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">
              {new Date(stats.last_login).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <TabButton id="profile" label="Profile" icon={<User className="w-4 h-4" />} />
              <TabButton id="password" label="Password" icon={<Key className="w-4 h-4" />} />
              <TabButton id="preferences" label="Preferences" icon={<Settings className="w-4 h-4" />} />
              <TabButton id="notifications" label="Notifications" icon={<Bell className="w-4 h-4" />} />
              <TabButton id="data" label="Data & Privacy" icon={<Shield className="w-4 h-4" />} />
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                        placeholder="Your username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Password Requirements</h3>
                        <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                          <li>At least 6 characters long</li>
                          <li>Include both letters and numbers</li>
                          <li>Use a unique password not used elsewhere</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>Customize your app experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Display Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        id="currency"
                        value={preferences.currency}
                        onChange={(e) => setPreferences({...preferences, currency: e.target.value})}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_format">Date Format</Label>
                      <select
                        id="date_format"
                        value={preferences.date_format}
                        onChange={(e) => setPreferences({...preferences, date_format: e.target.value})}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Theme</h3>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={preferences.theme === 'light'}
                        onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
                      />
                      <span>Light</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={preferences.theme === 'dark'}
                        onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
                      />
                      <span>Dark</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="theme"
                        value="auto"
                        checked={preferences.theme === 'auto'}
                        onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
                      />
                      <span>Auto</span>
                    </label>
                  </div>
                </div>

                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.email_notifications}
                        onChange={(e) => setPreferences({...preferences, email_notifications: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Weekly Reports</h4>
                      <p className="text-sm text-gray-500">Get weekly financial summaries</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.weekly_reports}
                        onChange={(e) => setPreferences({...preferences, weekly_reports: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Monthly Summary</h4>
                      <p className="text-sm text-gray-500">Monthly financial overview</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.monthly_summary}
                        onChange={(e) => setPreferences({...preferences, monthly_summary: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === 'data' && (
            <Card>
              <CardHeader>
                <CardTitle>Data & Privacy</CardTitle>
                <CardDescription>Manage your data and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Data Export</h3>
                  <p className="text-sm text-gray-600">
                    Download a copy of your data including profile information, preferences, and transaction history.
                  </p>
                  <Button onClick={handleExportData} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export My Data
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                  <div className="border border-red-200 rounded-md p-4 bg-red-50">
                    <h4 className="font-medium text-red-900">Delete Account</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Once you delete your account, there is no going back. This will permanently delete your account and all associated data.
                    </p>
                    <Button 
                      onClick={handleDeleteAccount}
                      variant="outline" 
                      className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
