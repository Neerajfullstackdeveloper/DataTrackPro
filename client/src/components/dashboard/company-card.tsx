import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Company } from "@shared/schema";
import { Mail, Phone, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import "./comapanyCard.css"

interface CompanyCardProps {
  company: Company;
  onAddComment: () => void;
  statusColor?: string;
}

export function CompanyCard({ company, onAddComment, statusColor }: CompanyCardProps) {
  const getStatusBadge = () => {
    if (statusColor) {
      return <Badge className={statusColor}>Category Status</Badge>;
    }
    return <Badge variant="secondary">Active</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow" id="mncrd">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 text-red-500">{company.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{company.industry}</p>
          </div>
          {getStatusBadge()}
        </div>
        
        <div className="space-y-2 mb-4">
          {company.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{company.email}</span>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.address && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{company.address}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Updated {formatDistanceToNow(new Date(company.updatedAt), { addSuffix: true })}
          </span>
          <Button onClick={onAddComment} size="sm">
            Add Comment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
