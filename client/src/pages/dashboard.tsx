import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommentModal } from "@/components/dashboard/comment-modal";
import { ViewCommentsModal } from "@/components/dashboard/view-comments-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Company, Holiday, DataRequest, Comment, Section } from "@shared/schema";
import { Menu, Bell, User, Database, Calendar, Clock, Plus, Download, Loader2, LogOut, Users, Mail, Phone, Globe, MapPin, Flame, Building, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { AssignedCompanies } from "@/components/dashboard/assigned-companies";
import { Label } from "@/components/ui/label";
import { AdminPanel } from "@/components/dashboard/admin-panel";
import { Badge } from "@/components/ui/badge";
import { AdminCompanyForm } from "@/components/dashboard/admin-company-form";
import { FacebookData } from "@/components/dashboard/facebook-data";
import { FacebookRequestForm } from "@/components/dashboard/facebook-request-form";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [viewCommentsCompany, setViewCommentsCompany] = useState<Company | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("allData");
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const [requestData, setRequestData] = useState({
    requestType: "",
    industry: "",
    justification: ""
  });
  const queryClient = useQueryClient();

  // Queries
  const { data: myCompanies = [], isLoading: isLoadingMyCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies/my"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: allCompanies = [], isLoading: isLoadingAllCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: holidays = [], isLoading: isLoadingHolidays } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: todayCompanies = [], isLoading: isLoadingTodayCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies/today"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: generalCompanies = [], isLoading: isLoadingGeneral } = useQuery<Company[]>({
    queryKey: ["/api/companies/category/general"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: followUpCompanies = [], isLoading: isLoadingFollowUp } = useQuery<Company[]>({
    queryKey: ["/api/companies/category/followup"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: hotCompanies = [], isLoading: isLoadingHot } = useQuery<Company[]>({
    queryKey: ["/api/companies/category/hot"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: blockCompanies = [], isLoading: isLoadingBlock } = useQuery<Company[]>({
    queryKey: ["/api/companies/category/block"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Query for data requests
  const { data: dataRequests = [], isLoading: isLoadingRequests } = useQuery<DataRequest[]>({
    queryKey: ["/api/data-requests"],
    enabled: activeSection === "requestData",
  });

  // Add query for comments
  const { data: comments = [], isLoading: isLoadingComments } = useQuery<Comment[]>({
    queryKey: ["/api/comments/company", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const response = await apiRequest("GET", `/api/comments/company/${selectedCompany.id}`);
      return response.json();
    },
    enabled: !!selectedCompany,
  });

  // Mutations
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await apiRequest("POST", "/api/data-requests", requestData);
      return response.json();
    },
    onMutate: async (newRequest) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/data-requests"] });
      
      // Snapshot the previous value
      const previousRequests = queryClient.getQueryData<DataRequest[]>(["/api/data-requests"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<DataRequest[]>(["/api/data-requests"], (old = []) => [...old, { ...newRequest, id: Date.now() }]);
      
      return { previousRequests };
    },
    onError: (err: Error, newRequest, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRequests) {
        queryClient.setQueryData(["/api/data-requests"], context.previousRequests);
      }
      toast({ 
        title: "Failed to create request", 
        variant: "destructive",
        description: err.message || "Please check your input and try again."
      });
    },
    onSuccess: (newRequest) => {
      queryClient.setQueryData<DataRequest[]>(["/api/data-requests"], (oldRequests = []) => [...oldRequests, newRequest]);
      queryClient.invalidateQueries({ queryKey: ["/api/data-requests"] });
      toast({ 
        title: "Request created successfully",
        description: "Your request has been submitted for review."
      });
      setIsRequestModalOpen(false);
      setRequestData({ requestType: "", industry: "", justification: "" });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/companies/${id}`, data);
      return response.json();
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/companies"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies/my"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies/today"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies/category/general"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies/category/followup"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies/category/hot"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies/category/block"] });
      
      // Snapshot the previous values
      const previousCompanies = queryClient.getQueryData<Company[]>(["/api/companies"]);
      const previousMyCompanies = queryClient.getQueryData<Company[]>(["/api/companies/my"]);
      const previousTodayCompanies = queryClient.getQueryData<Company[]>(["/api/companies/today"]);
      const previousGeneralCompanies = queryClient.getQueryData<Company[]>(["/api/companies/category/general"]);
      const previousFollowupCompanies = queryClient.getQueryData<Company[]>(["/api/companies/category/followup"]);
      const previousHotCompanies = queryClient.getQueryData<Company[]>(["/api/companies/category/hot"]);
      const previousBlockCompanies = queryClient.getQueryData<Company[]>(["/api/companies/category/block"]);
      
      // Optimistically update all company lists
      const updateCompanyInList = (list: Company[] = []) => 
        list.map(company => company.id === id ? { ...company, ...data } : company);
      
      queryClient.setQueryData(["/api/companies"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/my"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/today"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/general"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/followup"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/hot"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/block"], updateCompanyInList);
      
      return { 
        previousCompanies,
        previousMyCompanies,
        previousTodayCompanies,
        previousGeneralCompanies,
        previousFollowupCompanies,
        previousHotCompanies,
        previousBlockCompanies
      };
    },
    onError: (err, variables, context) => {
      // Roll back all company lists if the mutation fails
      if (context) {
        queryClient.setQueryData(["/api/companies"], context.previousCompanies);
        queryClient.setQueryData(["/api/companies/my"], context.previousMyCompanies);
        queryClient.setQueryData(["/api/companies/today"], context.previousTodayCompanies);
        queryClient.setQueryData(["/api/companies/category/general"], context.previousGeneralCompanies);
        queryClient.setQueryData(["/api/companies/category/followup"], context.previousFollowupCompanies);
        queryClient.setQueryData(["/api/companies/category/hot"], context.previousHotCompanies);
        queryClient.setQueryData(["/api/companies/category/block"], context.previousBlockCompanies);
      }
      toast({ 
        title: "Failed to update company", 
        variant: "destructive",
        description: "Please try again later."
      });
    },
    onSuccess: (updatedCompany) => {
      // Update all company lists with the new data
      const updateCompanyInList = (list: Company[] = []) => 
        list.map(company => company.id === updatedCompany.id ? updatedCompany : company);
      
      queryClient.setQueryData(["/api/companies"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/my"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/today"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/general"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/followup"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/hot"], updateCompanyInList);
      queryClient.setQueryData(["/api/companies/category/block"], updateCompanyInList);
      
      // Invalidate all company-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/followup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/hot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/block"] });
      
      toast({ 
        title: "Company updated successfully",
        description: "The company information has been updated."
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ companyId, comment }: { companyId: number; comment: string }) => {
      const response = await apiRequest("POST", `/api/companies/${companyId}/comments`, { comment });
      return response.json();
    },
    onMutate: async ({ companyId, comment }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/companies/${companyId}/comments`] });
      
      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<Comment[]>([`/api/companies/${companyId}/comments`]);
      
      // Optimistically update to the new value
      const newComment = {
        id: Date.now(),
        companyId,
        userId: user?.id,
        comment,
        createdAt: new Date().toISOString(),
        user: {
          id: user?.id,
          fullName: user?.fullName,
          role: user?.role
        }
      };
      
      queryClient.setQueryData<Comment[]>([`/api/companies/${companyId}/comments`], (old = []) => [...old, newComment as any]);
      
      return { previousComments };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousComments) {
        queryClient.setQueryData([`/api/companies/${variables.companyId}/comments`], context.previousComments);
      }
      toast({ 
        title: "Failed to add comment", 
        variant: "destructive",
        description: "Please try again later."
      });
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<Comment[]>([`/api/companies/${newComment.companyId}/comments`], (oldComments = []) => [...oldComments, newComment]);
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${newComment.companyId}/comments`] });
      toast({ 
        title: "Comment added successfully",
        description: "Your comment has been added to the company."
      });
      setIsCommentModalOpen(false);
      setSelectedCompany(null);
    },
  });

  // Update the initial data loading effect
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Prefetch all necessary data
        await Promise.all([
          queryClient.prefetchQuery({ queryKey: ["/api/data-requests"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/companies/my"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/companies/category/followup"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/companies/category/hot"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/companies/category/block"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/companies"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/companies/today"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/holidays"] }),
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast({ 
          title: "Error loading data", 
          description: "Please refresh the page to try again.",
          variant: "destructive" 
        });
      }
    };

    loadInitialData();
  }, [queryClient, toast]);

  useEffect(() => {
    const updateLoginTime = async () => {
      try {
        await apiRequest("POST", "/api/user/login-time");
      } catch (error) {
        console.error("Failed to update login time:", error);
      }
    };
    updateLoginTime();
  }, []);

  const handleDataRequestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = { ...Object.fromEntries(formData.entries()) };
    createRequestMutation.mutate(data);
    e.currentTarget.reset();
  };

  const handleSectionChange = (section: Section) => {
    setIsLoading(true);
    setActiveSection(section);
    // Prefetch data for the new section
    const prefetchPromises = [];
    
    switch (section) {
      case "requestData":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/data-requests"] }));
        break;
      case "allData":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/companies"] }));
        break;
      case "todayData":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/companies/today"] }));
        break;
      case "general":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/companies/category/general"] }));
        break;
      case "followUp":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/companies/category/followup"] }));
        break;
      case "hotData":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/companies/category/hot"] }));
        break;
      case "blockData":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/companies/category/block"] }));
        break;
      case "holidays":
        prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/holidays"] }));
        break;
      case "assignedData":
        if (user?.role === "employee") {
          prefetchPromises.push(queryClient.prefetchQuery({ queryKey: ["/api/companies/my"] }));
        }
        break;
    }

    Promise.all(prefetchPromises)
      .then(() => {
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to prefetch data:", error);
        toast({ 
          title: "Error loading section data", 
          description: "Please try again.",
          variant: "destructive" 
        });
        setIsLoading(false);
      });
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 12);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      );
    }

    switch (activeSection) {
      case "allData":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All Companies</h2>
              <p className="text-gray-600">View and manage all company data</p>
            </div>
            {isLoadingAllCompanies ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
                  {allCompanies.slice(0, displayCount).map((company) => (
                    <Card key={company.id} className="group hover:shadow-lg transition-all duration-200 ease-in-out border border-gray-200">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate group-hover:text-primary transition-colors">{company.name}</h4>
                              <p className="text-sm text-gray-500">ID: {company.id}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {company.companySize && (
                              <div className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                                <Users className="h-4 w-4 mr-2" />
                                <span className="text-sm">{company.companySize}</span>
                              </div>
                            )}
                            {company.email && (
                              <div className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                                <Mail className="h-4 w-4 mr-2" />
                                <span className="text-sm truncate">{company.email}</span>
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                                <Phone className="h-4 w-4 mr-2" />
                                <span className="text-sm">{company.phone}</span>
                              </div>
                            )}
                            {company.website && (
                              <div className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                                <Globe className="h-4 w-4 mr-2" />
                                <span className="text-sm truncate">{company.website}</span>
                              </div>
                            )}
                          </div>

                          {company.address && (
                            <div className="flex items-start text-sm text-gray-600 hover:text-gray-900 transition-colors">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{company.address}</span>
                            </div>
                          )}

                          {company.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="font-medium mb-1">Notes:</p>
                              <p className="whitespace-pre-line bg-gray-50 p-2 rounded line-clamp-3">{company.notes}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : 'N/A'}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {company.updatedAt ? format(new Date(company.updatedAt), 'MMM d, yyyy') : 'N/A'}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900 flex items-center">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Comments
                              </h5>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewCommentsCompany(company)}
                                >
                                  Show Comments
                                </Button>
                                
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedCompany(company)}
                                  
                                >
                                  Add Comment
                                </Button>
                              </div>
                            </div>
                            
                            {selectedCompany?.id === company.id && isLoadingComments ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : selectedCompany?.id === company.id && comments.length > 0 ? (
                              <div className="space-y-3 max-h-48 overflow-y-auto">
                                {comments.slice(0, 2).map((comment) => (
                                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900">
                                        {comment.user?.fullName || 'Unknown User'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {format(new Date(comment.commentDate), 'MMM d, yyyy h:mm a')}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{comment.content}</p>
                                    <Badge variant="outline" className="mt-2 capitalize">
                                      {comment.category}
                                    </Badge>
                                  </div>
                                ))}
                                {comments.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-primary"
                                    onClick={() => setViewCommentsCompany(company)}
                                  >
                                    Show {comments.length - 2} more comments
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-2">
                                No comments yet. Be the first to comment!
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {allCompanies.length > displayCount && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      className="px-6 hover:bg-primary hover:text-white transition-colors"
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      case "todayData":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Today's Data</h2>
              <p className="text-gray-600">View companies added today and all your companies</p>
            </div>

            {/* Today's Companies Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Companies Added Today</h3>
              {isLoadingTodayCompanies ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : todayCompanies.length > 0 ? (
                <div className="space-y-4">
                  {todayCompanies.map((company) => (
                    <Card key={company.id} className="relative hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{company.industry}</p>
                            {company.email && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                {company.email}
                              </p>
                            )}
                            {company.phone && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {company.phone}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="capitalize">
                              {company.industry}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Added: {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Companies Added Today</h3>
                    <p className="text-gray-600">No new companies have been added today.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* All My Companies Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All My Companies</h3>
              {isLoadingMyCompanies ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : myCompanies.length > 0 ? (
                <div className="space-y-4">
                  {myCompanies.map((company) => (
                    <Card key={company.id} className="relative hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{company.industry}</p>
                            {company.email && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                {company.email}
                              </p>
                            )}
                            {company.phone && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {company.phone}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="capitalize">
                              {company.industry}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Added: {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Building className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Companies Found</h3>
                    <p className="text-gray-600">You haven't added any companies yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );
      case "facebookData":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Facebook Data</h2>
              <p className="text-gray-600">View Facebook company data</p>
            </div>
            <FacebookData />
          </div>
        );
      case "facebookRequest":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Facebook Data Request</h2>
              <p className="text-gray-600">Request Facebook company data</p>
            </div>
            <FacebookRequestForm />
          </div>
        );
      case "general":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Follow-Up Companies</h2>
              <p className="text-gray-600">View companies that need follow-up</p>
            </div>
            {isLoadingFollowUp ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : followUpCompanies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followUpCompanies.map((company) => (
                  <Card key={company.id} className="relative hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-500">ID: {company.id}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="capitalize">
                              {company.industry}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Needs Follow-up
                            </Badge>
                            {company.assignedToUserId && (
                              <Badge variant="secondary" className="text-xs">
                                Assigned
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {company.companySize && (
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              {company.companySize}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center text-gray-600">
                              <Mail className="h-4 w-4 mr-2" />
                              {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {company.phone}
                            </div>
                          )}
                          {company.website && (
                            <div className="flex items-center text-gray-600">
                              <Globe className="h-4 w-4 mr-2" />
                              {company.website}
                            </div>
                          )}
                        </div>

                        {company.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                            <span>{company.address}</span>
                          </div>
                        )}

                        {company.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="font-medium mb-1">Notes:</p>
                            <p className="whitespace-pre-line bg-gray-50 p-2 rounded">{company.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {company.updatedAt ? format(new Date(company.updatedAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setSelectedCompany(company)}
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Follow-up Required</h3>
                  <p className="text-gray-600">There are no companies that need follow-up at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case "followUp":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Follow-Up Companies</h2>
              <p className="text-gray-600">View companies that need follow-up</p>
            </div>
            {isLoadingFollowUp ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : followUpCompanies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followUpCompanies.map((company) => (
                  <Card key={company.id} className="relative hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-500">ID: {company.id}</p>
                          </div>
                          
                        </div>

                        <div className="space-y-2">
                          {company.companySize && (
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              {company.companySize}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center text-gray-600">
                              <Mail className="h-4 w-4 mr-2" />
                              {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {company.phone}
                            </div>
                          )}
                          {company.website && (
                            <div className="flex items-center text-gray-600">
                              <Globe className="h-4 w-4 mr-2" />
                              {company.website}
                            </div>
                          )}
                        </div>

                        {company.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                            <span>{company.address}</span>
                          </div>
                        )}

                        {company.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="font-medium mb-1">Notes:</p>
                            <p className="whitespace-pre-line bg-gray-50 p-2 rounded">{company.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {company.updatedAt ? format(new Date(company.updatedAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setSelectedCompany(company)}
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Follow-up Required</h3>
                  <p className="text-gray-600">There are no companies that need follow-up at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case "hotData":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Hot Data</h2>
              <p className="text-gray-600">View high-priority companies</p>
            </div>
            {isLoadingHot ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hotCompanies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotCompanies.map((company) => (
                  <Card key={company.id} className="relative hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-500">ID: {company.id}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="capitalize">
                              {company.industry}
                            </Badge>
                            <Badge variant="destructive" className="text-xs">
                              Hot Data
                            </Badge>
                            {company.assignedToUserId && (
                              <Badge variant="secondary" className="text-xs">
                                Assigned
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {company.companySize && (
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              {company.companySize}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center text-gray-600">
                              <Mail className="h-4 w-4 mr-2" />
                              {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {company.phone}
                            </div>
                          )}
                          {company.website && (
                            <div className="flex items-center text-gray-600">
                              <Globe className="h-4 w-4 mr-2" />
                              {company.website}
                            </div>
                          )}
                        </div>

                        {company.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                            <span>{company.address}</span>
                          </div>
                        )}

                        {company.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="font-medium mb-1">Notes:</p>
                            <p className="whitespace-pre-line bg-gray-50 p-2 rounded">{company.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {company.updatedAt ? format(new Date(company.updatedAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setSelectedCompany(company)}
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Flame className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Hot Data Available</h3>
                  <p className="text-gray-600">There are no high-priority companies at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case "blockData":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Block Data</h2>
              <p className="text-gray-600">View blocked companies</p>
            </div>
            {isLoadingBlock ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : blockCompanies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blockCompanies.map((company) => (
                  <Card key={company.id} className="relative hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-500">ID: {company.id}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="capitalize">
                              {company.industry}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Blocked Data
                            </Badge>
                            {company.assignedToUserId && (
                              <Badge variant="secondary" className="text-xs">
                                Assigned
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {company.companySize && (
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              {company.companySize}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center text-gray-600">
                              <Mail className="h-4 w-4 mr-2" />
                              {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {company.phone}
                            </div>
                          )}
                          {company.website && (
                            <div className="flex items-center text-gray-600">
                              <Globe className="h-4 w-4 mr-2" />
                              {company.website}
                            </div>
                          )}
                        </div>

                        {company.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                            <span>{company.address}</span>
                          </div>
                        )}

                        {company.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="font-medium mb-1">Notes:</p>
                            <p className="whitespace-pre-line bg-gray-50 p-2 rounded">{company.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {company.updatedAt ? format(new Date(company.updatedAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setSelectedCompany(company)}
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Blocked Data Available</h3>
                  <p className="text-gray-600">There are no blocked companies at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case "newList":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">New List Data</h2>
              <p className="text-gray-600">Add new company data</p>
            </div>
            <AdminCompanyForm />
          </div>
        );
      case "requestData":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Requests</h2>
              <p className="text-gray-600">View and manage your data requests</p>
            </div>
            {isLoadingRequests ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Data Request</CardTitle>
                    <CardDescription>Request new company data to work on.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleDataRequestSubmit} className="space-y-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="requestType">Request Type</Label>
                        <select
                          name="requestType"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        >
                          <option value="">Select request type</option>
                          <option value="company_data">Company Data</option>
                          <option value="facebook_data">Facebook Data</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="industry">Industry (Optional)</Label>
                        <input
                          type="text"
                          name="industry"
                          placeholder="e.g., Technology, Healthcare, etc."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="justification">Justification</Label>
                        <textarea
                          name="justification"
                          rows={4}
                          placeholder="Explain why you need this data..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                      <Button type="submit" disabled={createRequestMutation.isPending} className="md:col-span-2">
                        {createRequestMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Request"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Request History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dataRequests.length > 0 ? (
                        dataRequests.map((request) => (
                          <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="font-medium text-gray-900">{request.requestType} Request</span>
                                {request.industry && (
                                  <p className="text-sm text-gray-500">Industry: {request.industry}</p>
                                )}
                              </div>
                              <span className={`px-3 py-1 text-xs rounded-full ${
                                request.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                request.status === "approved" ? "bg-green-100 text-green-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{request.justification}</p>
                            <p className="text-xs text-gray-500">
                              Submitted {request.createdAt ? format(new Date(request.createdAt), "MMM dd, yyyy") : 'N/A'}
                            </p>
                            {request.status === "approved" && request.companiesAssigned !== null && (
                              <p className="text-sm text-gray-600 mt-2">Companies Assigned: {request.companiesAssigned}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Download className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-gray-600">No requests yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );
      case "holidays":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Holidays</h2>
              <p className="text-gray-600">View company holidays</p>
            </div>
            {isLoadingHolidays ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : holidays.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {holidays.map((holiday) => (
                  <Card key={holiday.id}>
                    <CardHeader>
                      <CardTitle>{holiday.name}</CardTitle>
                      <CardDescription>{holiday.date ? format(new Date(holiday.date), 'MMM d, yyyy') : 'N/A'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {holiday.description && <p className="text-sm text-gray-600 mb-2">{holiday.description}</p>}
                      <Badge variant="secondary" className="text-xs capitalize">{holiday.duration.replace('_', ' ')}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Holidays Found</h3>
                  <p className="text-gray-600">There are no company holidays added yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case "adminPanel":
        return user && ["tl", "manager", "admin"].includes(user.role) ? (
          <AdminPanel />
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access the admin panel.</p>
          </div>
        );
      case "assignedData":
        return user?.role === "employee" ? (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Assigned Companies</h2>
              <p className="text-gray-600">View companies assigned to you</p>
            </div>
            {isLoadingMyCompanies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myCompanies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCompanies.map((company) => (
                  <Card key={company.id} className="relative hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{company.name}</h4>
                            <p className="text-sm text-gray-500">ID: {company.id}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="capitalize">
                              {company.industry}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {company.companySize && (
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              {company.companySize}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center text-gray-600">
                              <Mail className="h-4 w-4 mr-2" />
                              {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {company.phone}
                            </div>
                          )}
                          {company.website && (
                            <div className="flex items-center text-gray-600">
                              <Globe className="h-4 w-4 mr-2" />
                              {company.website}
                            </div>
                          )}
                        </div>

                        {company.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                            <span>{company.address}</span>
                          </div>
                        )}

                        {company.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="font-medium mb-1">Notes:</p>
                            <p className="whitespace-pre-line bg-gray-50 p-2 rounded">{company.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {company.updatedAt ? format(new Date(company.updatedAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setSelectedCompany(company)}
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Companies Assigned</h3>
                  <p className="text-gray-600">You have not been assigned any companies yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to view assigned data.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row min-h-screen">
        <Sidebar
          currentSection={activeSection}
          onSectionChange={handleSectionChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          followUpCount={followUpCompanies.length}
          hotDataCount={hotCompanies.length}
          blockDataCount={blockCompanies.length}
          logoutMutation={logoutMutation}
          general={String(generalCompanies.length)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {selectedCompany && (
        <CommentModal
          company={selectedCompany}
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {viewCommentsCompany && (
        <ViewCommentsModal
          company={viewCommentsCompany}
          isOpen={!!viewCommentsCompany}
          onClose={() => setViewCommentsCompany(null)}
        />
      )}
    </div>
  );
}
