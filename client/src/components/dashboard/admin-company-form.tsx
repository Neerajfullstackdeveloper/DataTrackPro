import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function AdminCompanyForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState("");
  const [newService, setNewService] = useState("");

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('[AdminCompanyForm] Sending company data to server:', data);
      try {
        const response = await apiRequest("POST", "/api/admin/companies", data);
        console.log('[AdminCompanyForm] Server response status:', response.status);
        
        // If response is not ok, try to get error details
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('[AdminCompanyForm] Server error response:', errorData);
          throw new Error(errorData?.message || 'Failed to add company');
        }
        
        const responseData = await response.json();
        console.log('[AdminCompanyForm] Server response data:', responseData);
        return responseData;
      } catch (error) {
        console.error('[AdminCompanyForm] Error in API request:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[AdminCompanyForm] Company created successfully');
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Company added successfully" });
      // Reset form
      setProducts([]);
      setServices([]);
      setNewProduct("");
      setNewService("");
    },
    onError: (error: any) => {
      console.error('[AdminCompanyForm] Mutation error:', {
        error,
        message: error.message,
        stack: error.stack
      });
      toast({ 
        title: "Failed to add company", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[AdminCompanyForm] Form submission started');
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      products: products,
      services: services,
    };
    console.log('[AdminCompanyForm] Prepared form data:', data);
    
    // Validate required fields
    if (!data.name || !data.address || !data.email || !data.phone) {
      console.error('[AdminCompanyForm] Validation error: Missing required fields');
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }
    
    createCompanyMutation.mutate(data);
    e.currentTarget.reset();
  };

  const addProduct = () => {
    if (newProduct.trim()) {
      console.log('[AdminCompanyForm] Adding product:', newProduct.trim());
      setProducts([...products, newProduct.trim()]);
      setNewProduct("");
    }
  };

  const addService = () => {
    if (newService.trim()) {
      console.log('[AdminCompanyForm] Adding service:', newService.trim());
      setServices([...services, newService.trim()]);
      setNewService("");
    }
  };

  const removeProduct = (index: number) => {
    console.log('[AdminCompanyForm] Removing product at index:', index);
    setProducts(products.filter((_, i) => i !== index));
  };

  const removeService = (index: number) => {
    console.log('[AdminCompanyForm] Removing service at index:', index);
    setServices(services.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Company</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" name="name" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Contact Number</Label>
            <Input id="phone" name="phone" required />
          </div>

          <div className="space-y-2">
            <Label>Products</Label>
            <div className="flex gap-2">
              <Input
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                placeholder="Add a product"
              />
              <Button type="button" onClick={addProduct}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {products.map((product, index) => (
                <div
                  key={index}
                  className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2"
                >
                  <span>{product}</span>
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Services</Label>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Add a service"
              />
              <Button type="button" onClick={addService}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2"
                >
                  <span>{service}</span>
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createCompanyMutation.isPending}>
            {createCompanyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Company...
              </>
            ) : (
              "Add Company"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 