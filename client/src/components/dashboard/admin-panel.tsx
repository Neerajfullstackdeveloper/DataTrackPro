import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, DataRequest, Company, Holiday, FacebookDataRequest } from "@shared/schema";
import { Users, ClipboardList, BarChart, Loader2, Plus, Edit, Trash2, Building, CalendarDays, Facebook } from "lucide-react";
import { format } from "date-fns";
import { AdminCompanyForm } from "./admin-company-form";

export function AdminPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "requests" | "companies" | "holidays">("overview");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isCreateHolidayOpen, setIsCreateHolidayOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    employeeId: "",
    role: "employee"
  });
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    industry: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    companySize: "",
    notes: "",
    assignedToUserId: ""
  });
  const [newHolidayData, setNewHolidayData] = useState({
    name: "",
    date: "",
    description: "",
    duration: "full_day"
  });

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery<DataRequest[]>({
    queryKey: ["/api/data-requests/pending"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: pendingFacebookRequests = [], isLoading: facebookRequestsLoading } = useQuery<FacebookDataRequest[]>({
    queryKey: ["/api/facebook-requests/pending"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: allCompanies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    refetchInterval: 5000, // Refetch every 5 seconds
    enabled: activeTab === "companies",
  });

  const { data: holidays = [], isLoading: holidaysLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
    refetchInterval: 5000, // Refetch every 5 seconds
    enabled: activeTab === "holidays",
  });

  // Mutations
  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ id, status, type }: { id: number; status: string; type: 'data' | 'facebook' }) => {
      const endpoint = type === 'data' ? `/api/data-requests/${id}/status` : `/api/facebook-requests/${id}/status`;
      const response = await apiRequest("PUT", endpoint, { status });
      return response.json();
    },
    onMutate: async ({ id, status, type }) => {
      const queryKey = type === 'data' ? ["/api/data-requests/pending"] : ["/api/facebook-requests/pending"];
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousRequests = queryClient.getQueryData(queryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: any[] = []) => 
        old.filter(request => request.id !== id)
      );
      
      return { previousRequests, type };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRequests) {
        const queryKey = context.type === 'data' ? ["/api/data-requests/pending"] : ["/api/facebook-requests/pending"];
        queryClient.setQueryData(queryKey, context.previousRequests);
      }
      toast({ 
        title: "Failed to update request status", 
        variant: "destructive",
        description: "Please try again later."
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/data-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/followup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/hot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/block"] });
      toast({ 
        title: "Request status updated successfully",
        description: variables.type === 'data' ? "Companies have been assigned to the user." : "Facebook data access has been updated."
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      console.log('Sending user creation request:', {
        ...userData,
        password: '[REDACTED]'
      });
      
      const response = await apiRequest("POST", "/api/admin/users", userData);
      return response.json();
    },
    onMutate: async (newUser) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/users"] });
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData<User[]>(["/api/admin/users"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<User[]>(["/api/admin/users"], (old = []) => [...old, { ...newUser, id: Date.now() }]);
      
      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUsers) {
        queryClient.setQueryData(["/api/admin/users"], context.previousUsers);
      }
      toast({ 
        title: "Error", 
        description: "Failed to create user",
        variant: "destructive" 
      });
    },
    onSuccess: (newUser) => {
      queryClient.setQueryData<User[]>(["/api/admin/users"], (oldUsers = []) => [...oldUsers, newUser]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ 
        title: "Success", 
        description: "User created successfully",
        variant: "default"
      });
      setIsCreateUserOpen(false);
      setNewUserData({ username: "", email: "", password: "", fullName: "", employeeId: "", role: "employee" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response;
    },
    onMutate: async (userId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/users"] });
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData<User[]>(["/api/admin/users"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<User[]>(["/api/admin/users"], (old = []) => 
        old.filter(user => user.id !== userId)
      );
      
      return { previousUsers };
    },
    onError: (err, userId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUsers) {
        queryClient.setQueryData(["/api/admin/users"], context.previousUsers);
      }
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
    onSuccess: (_, userId) => {
      queryClient.setQueryData<User[]>(["/api/admin/users"], (oldUsers = []) => 
        oldUsers.filter(user => user.id !== userId)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted successfully" });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: any) => {
      const response = await apiRequest("POST", "/api/admin/companies", companyData);
      return response.json();
    },
    onMutate: async (newCompany) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/companies"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies/today"] });
      
      // Snapshot the previous value
      const previousCompanies = queryClient.getQueryData<Company[]>(["/api/companies"]);
      const previousTodayCompanies = queryClient.getQueryData<Company[]>(["/api/companies/today"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Company[]>(["/api/companies"], (old = []) => [...old, { ...newCompany, id: Date.now() }]);
      queryClient.setQueryData<Company[]>(["/api/companies/today"], (old = []) => [...old, { ...newCompany, id: Date.now() }]);
      
      return { previousCompanies, previousTodayCompanies };
    },
    onError: (err, newCompany, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCompanies) {
        queryClient.setQueryData(["/api/companies"], context.previousCompanies);
      }
      if (context?.previousTodayCompanies) {
        queryClient.setQueryData(["/api/companies/today"], context.previousTodayCompanies);
      }
      toast({ title: "Failed to create company", variant: "destructive" });
    },
    onSuccess: (newCompany) => {
      queryClient.setQueryData<Company[]>(["/api/companies"], (oldCompanies = []) => [...oldCompanies, newCompany]);
      queryClient.setQueryData<Company[]>(["/api/companies/today"], (oldCompanies = []) => [...oldCompanies, newCompany]);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/followup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/hot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/block"] });
      toast({ title: "Company created successfully" });
      setIsCreateCompanyOpen(false);
      setNewCompanyData({ name: "", industry: "", email: "", phone: "", address: "", website: "", companySize: "", notes: "", assignedToUserId: "" });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/companies/${companyId}`);
      return response;
    },
    onMutate: async (companyId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/companies"] });
      
      // Snapshot the previous value
      const previousCompanies = queryClient.getQueryData<Company[]>(["/api/companies"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Company[]>(["/api/companies"], (old = []) => 
        old.filter(company => company.id !== companyId)
      );
      
      return { previousCompanies };
    },
    onError: (err, companyId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCompanies) {
        queryClient.setQueryData(["/api/companies"], context.previousCompanies);
      }
      toast({ title: "Failed to delete company", variant: "destructive" });
    },
    onSuccess: (_, companyId) => {
      queryClient.setQueryData<Company[]>(["/api/companies"], (oldCompanies = []) => 
        oldCompanies.filter(company => company.id !== companyId)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/followup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/hot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/block"] });
      toast({ title: "Company deleted successfully" });
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (holidayData: any) => {
      const response = await apiRequest("POST", "/api/holidays", holidayData);
      return response.json();
    },
    onMutate: async (newHoliday) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/holidays"] });
      
      // Snapshot the previous value
      const previousHolidays = queryClient.getQueryData<Holiday[]>(["/api/holidays"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Holiday[]>(["/api/holidays"], (old = []) => [...old, { ...newHoliday, id: Date.now() }]);
      
      return { previousHolidays };
    },
    onError: (err, newHoliday, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousHolidays) {
        queryClient.setQueryData(["/api/holidays"], context.previousHolidays);
      }
      toast({ title: "Failed to create holiday", variant: "destructive" });
    },
    onSuccess: (newHoliday) => {
      queryClient.setQueryData<Holiday[]>(["/api/holidays"], (oldHolidays = []) => [...oldHolidays, newHoliday]);
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({ title: "Holiday created successfully" });
      setIsCreateHolidayOpen(false);
      setNewHolidayData({ name: "", date: "", description: "", duration: "full_day" });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: number) => {
      const response = await apiRequest("DELETE", `/api/holidays/${holidayId}`);
      return response;
    },
    onMutate: async (holidayId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/holidays"] });
      
      // Snapshot the previous value
      const previousHolidays = queryClient.getQueryData<Holiday[]>(["/api/holidays"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Holiday[]>(["/api/holidays"], (old = []) => 
        old.filter(holiday => holiday.id !== holidayId)
      );
      
      return { previousHolidays };
    },
    onError: (err, holidayId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousHolidays) {
        queryClient.setQueryData(["/api/holidays"], context.previousHolidays);
      }
      toast({ title: "Failed to delete holiday", variant: "destructive" });
    },
    onSuccess: (_, holidayId) => {
      queryClient.setQueryData<Holiday[]>(["/api/holidays"], (oldHolidays = []) => 
        oldHolidays.filter(holiday => holiday.id !== holidayId)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({ title: "Holiday deleted successfully" });
    },
  });

  const handleRequestAction = (id: number, status: string, type: 'data' | 'facebook') => {
    updateRequestStatusMutation.mutate({ id, status, type });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUserData);
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const companyData = {
      ...newCompanyData,
      assignedToUserId: newCompanyData.assignedToUserId ? parseInt(newCompanyData.assignedToUserId) : null
    };
    createCompanyMutation.mutate(companyData);
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure the date is properly formatted
    const date = new Date(newHolidayData.date);
    if (isNaN(date.getTime())) {
      toast({
        title: "Invalid date",
        description: "Please select a valid date",
        variant: "destructive"
      });
      return;
    }

    // Set the time to midnight UTC
    date.setUTCHours(0, 0, 0, 0);

    const holidayData = {
      name: newHolidayData.name.trim(),
      date: date.toISOString(),
      description: newHolidayData.description.trim(),
      duration: newHolidayData.duration
    };
    
    console.log('Submitting holiday data:', holidayData);
    createHolidayMutation.mutate(holidayData);
  };

  const renderOverview = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
        <p className="text-gray-600">Manage users, companies, and data requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminCompanyForm />
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setActiveTab("requests")} 
              className="w-full"
            >
              View Pending Requests
            </Button>
            <Button 
              onClick={() => setIsCreateUserOpen(true)} 
              className="w-full"
            >
              Add New User
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Admin Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* User Management */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage employee accounts and permissions</p>
            <div className="flex space-x-2">
              <Button 
                className="flex-1" 
                onClick={() => setActiveTab("users")}
              >
                Manage Users
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Company Management */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Company Data</h3>
            </div>
            <p className="text-gray-600 mb-4">Add and manage company records for all employees</p>
            <Button 
              className="w-full" 
              onClick={() => setActiveTab("companies")}
            >
              Manage Companies
            </Button>
          </CardContent>
        </Card>

        {/* Data Requests */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-warning rounded-lg flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Data Requests</h3>
            </div>
            <p className="text-gray-600 mb-4">Review and approve employee data requests</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Pending: <strong>{pendingRequests.length + pendingFacebookRequests.length}</strong>
              </span>
              <Button 
                variant="outline"
                onClick={() => setActiveTab("requests")}
              >
                Review
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Holiday Management */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Holiday Management</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage company holidays and schedules</p>
            <Button 
              className="w-full" 
              onClick={() => setActiveTab("holidays")}
            >
              Manage Holidays
            </Button>
          </CardContent>
        </Card>

        {/* System Analytics */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                <BarChart className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">System Stats</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Users: {users.length} | Companies: {allCompanies.length} | Holidays: {holidays.length}
            </p>
            <Button className="w-full" variant="outline">
              View Details
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
        <p className="text-gray-600">Manage employee accounts and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="flex space-x-3">
              <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={newUserData.fullName}
                        onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newUserData.username}
                        onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input
                        id="employeeId"
                        value={newUserData.employeeId}
                        onChange={(e) => setNewUserData({...newUserData, employeeId: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={newUserData.role} onValueChange={(value) => setNewUserData({...newUserData, role: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="tl">Team Lead (TL)</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Main Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button onClick={() => setActiveTab("overview")}>
                Back to Overview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userItem) => (
                    <tr key={userItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{userItem.fullName}</div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="capitalize">
                          {userItem.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={userItem.isActive ? "default" : "secondary"}>
                          {userItem.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.loginTime ? format(new Date(userItem.loginTime), "MMM dd, yyyy HH:mm") : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user?.role === "admin" && userItem.id !== user.id && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUserMutation.mutate(userItem.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderRequests = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pending Data Requests</h2>
        <p className="text-gray-600">Review and approve employee data requests</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Requests</CardTitle>
            <Button onClick={() => setActiveTab("overview")}>
              Back to Overview
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(requestsLoading || facebookRequestsLoading) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (pendingRequests.length > 0 || pendingFacebookRequests.length > 0) ? (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">User ID: {request.userId}</h4>
                      <p className="text-sm text-gray-600 capitalize">{request.requestType} Request</p>
                      {request.industry && (
                        <p className="text-sm text-gray-500">Industry: {request.industry}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(request.createdAt), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{request.justification}</p>
                  <div className="flex space-x-3">
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(request.id, "approved", 'data')}
                      disabled={updateRequestStatusMutation.isPending}
                    >
                      {updateRequestStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRequestAction(request.id, "rejected", 'data')}
                      disabled={updateRequestStatusMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}

              {pendingFacebookRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">User ID: {request.userId}</h4>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Facebook className="h-4 w-4 mr-2" />
                        Facebook Data Request
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(request.createdAt), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{request.justification}</p>
                  <div className="flex space-x-3">
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(request.id, "approved", 'facebook')}
                      disabled={updateRequestStatusMutation.isPending}
                    >
                      {updateRequestStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRequestAction(request.id, "rejected", 'facebook')}
                      disabled={updateRequestStatusMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
              <p className="text-gray-600">All data requests have been processed.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCompanies = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
        <Button onClick={() => setIsCreateCompanyOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <Card>
        <CardContent>
          {companiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCompanies.map((company) => (
                <Card key={company.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{company.name}</h4>
                      <div className="flex space-x-2">
                        {(!company.assignedToUserId || user?.role === "admin") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCompanyMutation.mutate(company.id)}
                            disabled={deleteCompanyMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 capitalize mb-2">{company.industry}</p>
                    {company.email && <p className="text-xs text-gray-500">{company.email}</p>}
                    {company.assignedToUserId && (
                      <Badge variant="outline" className="mt-2">
                        Assigned to User {company.assignedToUserId}
                      </Badge>
                    )}
                    {company.assignedToUserId && user?.role !== "admin" && (
                      <p className="text-xs text-gray-500 mt-2">
                        Only main admin can modify assigned companies
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderHolidays = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Holiday Management</h2>
        <p className="text-gray-600">Manage company holidays and schedules</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Holidays</CardTitle>
            <div className="flex space-x-3">
              <Dialog open={isCreateHolidayOpen} onOpenChange={setIsCreateHolidayOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Holiday</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateHoliday} className="space-y-4">
                    <div>
                      <Label htmlFor="holidayName">Holiday Name</Label>
                      <Input
                        id="holidayName"
                        value={newHolidayData.name}
                        onChange={(e) => setNewHolidayData({...newHolidayData, name: e.target.value})}
                        required
                        minLength={1}
                      />
                    </div>
                    <div>
                      <Label htmlFor="holidayDate">Date</Label>
                      <Input
                        id="holidayDate"
                        type="date"
                        value={newHolidayData.date}
                        onChange={(e) => setNewHolidayData({...newHolidayData, date: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Select value={newHolidayData.duration} onValueChange={(value) => setNewHolidayData({...newHolidayData, duration: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_day">Full Day</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                          <SelectItem value="extended">Extended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newHolidayData.description}
                        onChange={(e) => setNewHolidayData({...newHolidayData, description: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsCreateHolidayOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createHolidayMutation.isPending}>
                        {createHolidayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Holiday"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button onClick={() => setActiveTab("overview")}>
                Back to Overview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {holidaysLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {holidays.map((holiday) => (
                <Card key={holiday.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{holiday.name}</h4>
                        <p className="text-sm text-gray-600">{format(new Date(holiday.date), "MMM dd, yyyy")}</p>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {holiday.duration.replace('_', ' ')}
                        </Badge>
                        {holiday.description && (
                          <p className="text-xs text-gray-500 mt-2">{holiday.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                        disabled={deleteHolidayMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  switch (activeTab) {
    case "users":
      return renderUsers();
    case "requests":
      return renderRequests();
    case "companies":
      return renderCompanies();
    case "holidays":
      return renderHolidays();
    default:
      return renderOverview();
  }
}
