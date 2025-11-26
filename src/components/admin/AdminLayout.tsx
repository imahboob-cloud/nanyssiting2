import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { Loader2 } from 'lucide-react';

export const AdminLayout = () => {
  const { user, loading, isOwner } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isOwner)) {
      navigate('/admin/login');
    }
  }, [user, loading, isOwner, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isOwner) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6 bg-muted/30">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
