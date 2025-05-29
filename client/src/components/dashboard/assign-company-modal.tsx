import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Company, User } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AssignCompanyModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignCompanyModal({ company, isOpen, onClose }: AssignCompanyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all employees
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
  });

  // Mutation for assigning company
  const assignCompanyMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      const response = await apiRequest("PUT", `/api/companies/${company.id}`, {
        assignedToUserId: userId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/my"] });
      toast({
        title: "Company assigned successfully",
        description: "The company has been assigned to the selected employee.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign company. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssign = (userId: string) => {
    assignCompanyMutation.mutate({ userId: parseInt(userId) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Company to Employee</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <p className="text-sm text-gray-600">{company.name}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee">Select Employee</Label>
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select onValueChange={handleAssign} disabled={assignCompanyMutation.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(employee => employee.role === "employee")
                    .map(employee => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.fullName} ({employee.employeeId})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
