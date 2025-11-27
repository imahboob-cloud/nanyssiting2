import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientDialog } from '@/components/admin/ClientDialog';
import { ClientMissionsView } from '@/components/admin/ClientMissionsView';
import { Loader2, Plus, Search, Pencil, Trash2, Users, FileText } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;
type ClientStatus = 'prospect' | 'client' | 'all';

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [selectedClientForMissions, setSelectedClientForMissions] = useState<Client | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery, statusFilter]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les clients',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.statut === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.nom.toLowerCase().includes(query) ||
          c.prenom.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.telephone?.includes(query) ||
          c.ville?.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      const clientData = {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email || null,
        telephone: data.telephone || null,
        adresse: data.adresse || null,
        code_postal: data.code_postal || null,
        ville: data.ville || null,
        service_souhaite: data.service_souhaite || null,
        message: data.message || null,
        notes: data.notes || null,
        statut: data.statut,
      };

      if (selectedClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', selectedClient.id);

        if (error) throw error;

        toast({
          title: 'Succès',
          description: 'Client modifié avec succès',
        });
      } else {
        const { error } = await supabase.from('clients').insert([clientData]);

        if (error) throw error;

        toast({
          title: 'Succès',
          description: 'Client créé avec succès',
        });
      }

      setDialogOpen(false);
      setSelectedClient(undefined);
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder le client',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientToDelete.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Client supprimé avec succès',
      });

      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer le client',
      });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'client') {
      return <Badge className="bg-green-500">Client</Badge>;
    }
    return <Badge variant="secondary">Prospect</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show missions view if a client is selected
  if (selectedClientForMissions) {
    return (
      <ClientMissionsView
        client={selectedClientForMissions}
        onBack={() => setSelectedClientForMissions(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Clients
          </h2>
          <p className="text-muted-foreground">Gérez vos prospects et clients</p>
        </div>
        <Button onClick={() => { setSelectedClient(undefined); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ClientStatus)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredClients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery || statusFilter !== 'all'
            ? 'Aucun client ne correspond à vos critères'
            : 'Aucun client pour le moment'}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.prenom} {client.nom}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {client.email && <div>{client.email}</div>}
                      {client.telephone && <div className="text-muted-foreground">{client.telephone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.ville && (
                      <div className="text-sm">
                        {client.code_postal} {client.ville}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(client.statut)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedClientForMissions(client);
                        }}
                        title="Voir les missions"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setClientToDelete(client);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={selectedClient}
        onSave={handleSave}
        loading={saving}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong>
                {clientToDelete?.prenom} {clientToDelete?.nom}
              </strong>{' '}
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
