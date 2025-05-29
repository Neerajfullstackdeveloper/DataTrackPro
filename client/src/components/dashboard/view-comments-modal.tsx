import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Company, Comment } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface ViewCommentsModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewCommentsModal({ company, isOpen, onClose }: ViewCommentsModalProps) {
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["/api/comments/company", company.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/comments/company/${company.id}`);
      return response.json();
    },
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comments for {company.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {comment.user?.fullName || 'Unknown User'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(new Date(comment.commentDate), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{comment.content}</p>
                <Badge variant="outline" className="capitalize">
                  {comment.category}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No comments yet
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 
