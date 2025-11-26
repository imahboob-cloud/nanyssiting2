import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  Receipt,
  DollarSign
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, end: true },
  { title: 'Entreprise', url: '/admin/company', icon: Building2 },
  { title: 'Clients', url: '/admin/clients', icon: Users },
  { title: 'NannySitters', url: '/admin/nannysitters', icon: UserCheck },
  { title: 'Calendrier', url: '/admin/calendar', icon: Calendar },
  { title: 'Devis', url: '/admin/quotes', icon: FileText },
  { title: 'Factures', url: '/admin/invoices', icon: Receipt },
  { title: 'Tarifs', url: '/admin/tarifs', icon: DollarSign },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (url: string, end?: boolean) => {
    if (end) {
      return currentPath === url;
    }
    return currentPath.startsWith(url);
  };

  const isExpanded = menuItems.some((item) => isActive(item.url, item.end));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.end}
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
