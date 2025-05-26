import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Building, Phone, Mail, Globe, MapPin, Users, Calendar, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CommentModal } from "./comment-modal";
import { useState } from "react";
import "./companyCard.css"
export function AssignedCompanies() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies/my"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/companies/my");
      return response.json();
    },
  });

  // Add query for comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/comments/company", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      console.log('Fetching comments for company:', selectedCompany.id);
      const response = await apiRequest("GET", `/api/comments/company/${selectedCompany.id}`);
      const data = await response.json();
      console.log('Received comments:', data);
      return data;
    },
    enabled: !!selectedCompany,
  });

  // Add debug logs for selected company
  console.log('Selected company:', selectedCompany);
  console.log('Comments:', comments);
  console.log('Comments loading:', commentsLoading);

  const requestDataMutation = useMutation({
    mutationFn: async (data: { requestType: string; industry: string; justification: string }) => {
      const response = await apiRequest("POST", "/api/data-requests", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data request submitted",
        description: "Your request will be reviewed by an admin.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit data request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRequestData = () => {
    requestDataMutation.mutate({
      requestType: "company_data",
      industry: "any",
      justification: "Requesting access to company data",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" id="mncrd">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assigned Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies assigned yet</h3>
            <p className="text-gray-600 mb-4">
              You need to request access to company data. Once approved, your assigned companies will appear here.
            </p>
            <Button onClick={handleRequestData} disabled={requestDataMutation.isPending}>
              {requestDataMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Request Company Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Assigned Companies ({companies.length})</CardTitle>
          <Badge variant="outline" className="text-sm">
            Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company: any) => (
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
                      <Badge 
                        variant={company.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {company.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
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

                  {/* Comments Section */}
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comments
                      </h5>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Setting selected company:', company);
                          setSelectedCompany(company);
                        }}
                      >
                        Add Comment
                      </Button>
                    </div>
                    
                    {selectedCompany?.id === company.id && commentsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : selectedCompany?.id === company.id && comments.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {comments.map((comment: any) => {
                          console.log('Rendering comment:', comment);
                          return (
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
                          );
                        })}
                      </div>
                    ) : selectedCompany?.id === company.id ? (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">
                        Click "Add Comment" to view or add comments
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(company.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(company.updatedAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      {/* Comment Modal */}
      {selectedCompany && (
        <CommentModal
          company={selectedCompany}
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </Card>
  );
} 
