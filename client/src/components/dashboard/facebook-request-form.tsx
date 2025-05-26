import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function FacebookRequestForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [justification, setJustification] = useState("");

  // Query for user's Facebook data requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["/api/facebook-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/facebook-requests");
      return response.json();
    },
  });

  // Mutation for creating a new request
  const createRequestMutation = useMutation({
    mutationFn: async (data: { justification: string }) => {
      const response = await apiRequest("POST", "/api/facebook-requests", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facebook-requests"] });
      setJustification("");
      toast({
        title: "Request submitted",
        description: "Your request has been submitted for review.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequestMutation.mutate({ justification });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Facebook Data</CardTitle>
          <CardDescription>Request Facebook company data to work on.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="justification">Justification</Label>
              <textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={4}
                placeholder="Explain why you need this data..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <Button type="submit" disabled={createRequestMutation.isPending}>
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : requests.length > 0 ? (
              requests.map((request: any) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900">Facebook Data Request</span>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        request.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : request.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{request.justification}</p>
                  <p className="text-xs text-gray-500">
                    Submitted {format(new Date(request.createdAt), "MMM dd, yyyy")}
                  </p>
                  {request.status === "approved" && (
                    <p className="text-sm text-gray-600 mt-2">
                      Facebook data assigned: 10 records
                    </p>
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
  );
} 