import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, error } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    // If there's an error or user is not found, redirect to login
    if (error || (!isLoading && !user)) {
      window.location.href = "/auth";
    }
  }, [user, isLoading, error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return null; // Return null while redirecting
  }

  return <Route path={path} component={Component} />;
}
