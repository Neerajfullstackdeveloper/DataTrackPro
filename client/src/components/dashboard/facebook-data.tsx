import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, Phone, Mail, MapPin, Package, Wrench } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface FacebookDataItem {
  id: number;
  companyName: string;
  quantity: number;
  email?: string;
  contact?: string;
  address?: string;
  products?: string[];
  services?: string[];
  createdAt: string;
}

export function FacebookData() {
  const { toast } = useToast();
  const { data: facebookData = [], isLoading, error } = useQuery<FacebookDataItem[]>({
    queryKey: ["/api/facebook-data"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/facebook-data");
        const data = await response.json();
        console.log('Received Facebook data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching Facebook data:', error);
        throw error;
      }
    },
  });

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load Facebook data. Please try again.",
      variant: "destructive",
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!Array.isArray(facebookData) || facebookData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facebook Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Facebook Data Available</h3>
            <p className="text-gray-600">
              You don't have any Facebook data assigned to you yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Facebook Data ({facebookData.length})</CardTitle>
          <Badge variant="outline" className="text-sm">
            Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facebookData.map((data) => (
            <Card key={data.id} className="relative hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{data.companyName}</h4>
                      <p className="text-sm text-gray-500">Quantity: {data.quantity}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {data.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {data.email}
                      </div>
                    )}
                    {data.contact && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {data.contact}
                      </div>
                    )}
                  </div>

                  {data.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                      <span>{data.address}</span>
                    </div>
                  )}

                  {data.products && data.products.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
                        <Package className="h-4 w-4 mr-2" />
                        Products
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {data.products.map((product, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.services && data.services.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
                        <Wrench className="h-4 w-4 mr-2" />
                        Services
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {data.services.map((service, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 