import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { User as UserType, Section } from "@shared/schema";
import { 
  Database, 
  Calendar, 
  Clock, 
  Plus, 
  Download, 
  Settings,
  X,
  CalendarDays,
  Flame,
  Ban,
  Facebook,
  Send,
  Loader2,
  LogOut,
  User
} from "lucide-react";

interface SidebarProps {
  currentSection: Section;
  onSectionChange: (section: Section) => void;
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  followUpCount: number;
  hotDataCount: number;
  blockDataCount: number;
  logoutMutation: any;
}

export function Sidebar({ 
  currentSection, 
  onSectionChange, 
  isOpen, 
  onClose, 
  user,
  followUpCount,
  hotDataCount,
  blockDataCount,
  logoutMutation
}: SidebarProps) {
  const sidebarClasses = `
    fixed lg:relative w-80 bg-white border-r border-gray-200 h-screen
    transform transition-transform duration-300 ease-in-out z-30
    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `;

  const navItems = [
    {
      id: "allData" as Section,
      label: "All Data",
      icon: Database,
      color: "text-primary",
    },
    {
      id: "assignedData" as Section,
      label: "Assigned Data",
      icon: Database,
      color: "text-blue-600",
    },
    // {
    //   id: "todayData" as Section,
    //   label: "Today's Data",
    //   icon: Calendar,
    //   color: "text-gray-600",
    // },
    {
      id: "facebookData" as Section,
      label: "Facebook Data",
      icon: Facebook,
      color: "text-gray-600",
    },
    {
      id: "facebookRequest" as Section,
      label: "Facebook Data Request",
      icon: Send,
      color: "text-gray-600",
    },
    {
      id: "followUp" as Section,
      label: "Follow-Up",
      icon: Clock,
      color: "text-warning",
      count: followUpCount,
    },
    {
      id: "hotData" as Section,
      label: "Hot Data",
      icon: Flame,
      color: "text-success",
      count: hotDataCount,
    },
    {
      id: "blockData" as Section,
      label: "Block Data",
      icon: Ban,
      color: "text-destructive",
      count: blockDataCount,
    },
    {
      id: "newList" as Section,
      label: "New List Data",
      icon: Plus,
      color: "text-gray-600",
    },
    {
      id: "requestData" as Section,
      label: "Request Data",
      icon: Download,
      color: "text-gray-600",
    },
    {
      id: "holidays" as Section,
      label: "Holidays",
      icon: CalendarDays,
      color: "text-gray-600",
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Database className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-lg font-semibold text-gray-900">DataFlow</h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full justify-start h-auto py-2.5 px-3 rounded-lg transition-colors duration-200 ${
                      isActive 
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      onSectionChange(item.id);
                      onClose();
                    }}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-primary' : item.color}`} />
                    <span className="font-medium flex-1 text-left">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 text-white ${
                          item.color === 'text-warning' ? 'bg-yellow-500' :
                          item.color === 'text-success' ? 'bg-green-500' :
                          item.color === 'text-destructive' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                      >
                        {item.count}
                      </Badge>
                    )}
                  </Button>
                );
              })}

              {/* Admin Panel */}
              {user && ["tl", "manager", "admin"].includes(user.role) && (
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start h-auto py-2.5 px-3 rounded-lg transition-colors duration-200 ${
                      currentSection === "adminPanel" 
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      onSectionChange("adminPanel");
                      onClose();
                    }}
                  >
                    <Settings className={`h-5 w-5 mr-3 ${
                      currentSection === "adminPanel" ? 'text-primary' : 'text-gray-600'
                    }`} />
                    <span className="font-medium">Admin Panel</span>
                  </Button>
                </div>
              )}
            </nav>
          </div>

          {/* Footer */}
          <div className="mt-auto p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <ThemeToggle />
              <Button
                variant="outline"
                className="flex-1 ml-2 justify-start"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
