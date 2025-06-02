import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Company } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface CommentModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  content: string;
  category: string;
  date: string;
  time: string;
}

interface CommentData {
  companyId: number;
  content: string;
  category: string;
  commentDate: string;
}

export function CommentModal({ company, isOpen, onClose }: CommentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    content: "",
    category: "followup",
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: CommentData) => {
      // First create the comment
      const commentResponse = await apiRequest("POST", "/api/comments", data);
      if (!commentResponse.ok) {
        const errorData = await commentResponse.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }
      const commentResult = await commentResponse.json();

      // Then update the company's category
      const updateCompanyResponse = await apiRequest("POST", `/api/companies/${company.id}/category`, {
        category: data.category
      });
      if (!updateCompanyResponse.ok) {
        throw new Error('Failed to update company category');
      }

      return commentResult;
    },
    onSuccess: () => {
      // Invalidate both comments and companies queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/comments/company", company.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] }); // Invalidate all companies
      queryClient.invalidateQueries({ queryKey: ["/api/companies/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/general"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/followup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/hot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/category/block"] });
      
      toast({ title: "Comment added successfully" });
      onClose();
      setFormData({
        content: "",
        category: "followup",
        date: format(new Date(), "yyyy-MM-dd"),
        time: format(new Date(), "HH:mm"),
      });
    },
    onError: (error: Error) => {
      console.error('Comment submission error:', error);
      toast({ 
        title: "Failed to add comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create date object and ensure it's in UTC
    const commentDate = new Date(`${formData.date}T${formData.time}:00Z`);
    
    // Validate the date before sending
    if (isNaN(commentDate.getTime())) {
      toast({
        title: "Invalid date",
        description: "Please select a valid date and time",
        variant: "destructive"
      });
      return;
    }
    
    const commentData = {
      companyId: Number(company.id),
      content: formData.content,
      category: formData.category,
      commentDate: commentDate.toISOString(),
    };
    
    // Log the data being sent for debugging
    console.log('Submitting comment with data:', commentData);
    
    createCommentMutation.mutate(commentData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: FormData) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Comment</DialogTitle>
          <DialogDescription>
            Add a new comment for {company.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="company-name">Company</Label>
            <Input
              id="company-name"
              value={company.name}
              readOnly
              className="bg-gray-50 text-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange("time", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleChange("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Message</SelectItem>
                <SelectItem value="followup">Follow-Up Data</SelectItem>
                <SelectItem value="hot">Hot Data</SelectItem>
                <SelectItem value="block">Block Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content">Comment</Label>
            <Textarea
              id="content"
              rows={4}
              placeholder="Enter your comment here..."
              value={formData.content}
              onChange={(e) => handleChange("content", e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCommentMutation.isPending}>
              {createCommentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Comment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
