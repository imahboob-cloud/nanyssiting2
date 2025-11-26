import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/admin/StatsCard';
import { Users, UserCheck, Calendar, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Stats {
  prospects: number;
  clients: number;
  nannysitters: number;
  missionsThisMonth: number;
  revenueThisMonth: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    prospects: 0,
    clients: 0,
    nannysitters: 0,
    missionsThisMonth: 0,
    revenueThisMonth: 0,
  });
  const [recentProspects, setRecentProspects] = useState<any[]>([]);
  const [upcomingMissions, setUpcomingMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [
        { count: prospectsCount },
        { count: clientsCount },
        { count: nannysittersCount },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('statut', 'prospect'),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('statut', 'client'),
        supabase.from('nannysitters').select('*', { count: 'exact', head: true }).eq('actif', true),
      ]);

      // Fetch missions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: missionsData } = await supabase
        .from('missions')
        .select('*')
        .gte('date_debut', startOfMonth.toISOString());

      // Fetch invoices paid this month
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('montant_ttc')
        .eq('statut', 'payee')
        .gte('created_at', startOfMonth.toISOString());

      const revenue = invoicesData?.reduce((sum, inv) => sum + Number(inv.montant_ttc), 0) || 0;

      // Fetch recent prospects
      const { data: prospectsData } = await supabase
        .from('clients')
        .select('*')
        .eq('statut', 'prospect')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch upcoming missions
      const { data: upcomingData } = await supabase
        .from('missions')
        .select('*, clients(prenom, nom), nannysitters(prenom, nom)')
        .gte('date_debut', new Date().toISOString())
        .order('date_debut', { ascending: true })
        .limit(5);

      setStats({
        prospects: prospectsCount || 0,
        clients: clientsCount || 0,
        nannysitters: nannysittersCount || 0,
        missionsThisMonth: missionsData?.length || 0,
        revenueThisMonth: revenue,
      });

      setRecentProspects(prospectsData || []);
      setUpcomingMissions(upcomingData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Nouveaux prospects"
          value={stats.prospects}
          icon={Clock}
          description="À traiter"
        />
        <StatsCard
          title="Clients actifs"
          value={stats.clients}
          icon={Users}
        />
        <StatsCard
          title="NannySitters actives"
          value={stats.nannysitters}
          icon={UserCheck}
        />
        <StatsCard
          title="Missions ce mois"
          value={stats.missionsThisMonth}
          icon={Calendar}
        />
        <StatsCard
          title="Revenus ce mois"
          value={`${stats.revenueThisMonth.toFixed(2)}€`}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Derniers prospects</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProspects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun prospect récent</p>
            ) : (
              <div className="space-y-3">
                {recentProspects.map((prospect) => (
                  <div key={prospect.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{prospect.prenom} {prospect.nom}</p>
                      <p className="text-sm text-muted-foreground">{prospect.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prospect.service_souhaite}
                      </p>
                    </div>
                    <Badge variant="secondary">Nouveau</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prochaines missions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune mission prévue</p>
            ) : (
              <div className="space-y-3">
                {upcomingMissions.map((mission: any) => (
                  <div key={mission.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">
                        {mission.clients?.prenom} {mission.clients?.nom}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {mission.nannysitters ? 
                          `${mission.nannysitters.prenom} ${mission.nannysitters.nom}` : 
                          'À attribuer'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(mission.date_debut), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Badge variant={mission.nannysitter_id ? 'default' : 'secondary'}>
                      {mission.statut}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
