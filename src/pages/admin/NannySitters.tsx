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
import { NannySitterDialog } from '@/components/admin/NannySitterDialog';
import { Loader2, Plus, Search, Pencil, Trash2, Baby } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type NannySitter = Tables<'nannysitters'>;
type StatusFilter = 'all' | 'active' | 'inactive';

const NannySitters = () => {
  const [nannysitters, setNannySitters] = useState<NannySitter[]>([]);
  const [filteredNannySitters, setFilteredNannySitters] = useState<NannySitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNannySitter, setSelectedNannySitter] = useState<NannySitter | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nannysitterToDelete, setNannySitterToDelete] = useState<NannySitter | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNannySitters();
  }, []);

  useEffect(() => {
    filterNannySitters();
  }, [nannysitters, searchQuery, statusFilter]);

  const loadNannySitters = async () => {
    try {
      const { data, error } = await supabase
        .from('nannysitters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNannySitters(data || []);
    } catch (error) {
      console.error('Error loading nannysitters:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les babysitters',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNannySitters = () => {
    let filtered = [...nannysitters];

    if (statusFilter === 'active') {
      filtered = filtered.filter((ns) => ns.actif === true);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((ns) => ns.actif === false);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ns) =>
          ns.nom.toLowerCase().includes(query) ||
          ns.prenom.toLowerCase().includes(query) ||
          ns.email?.toLowerCase().includes(query) ||
          ns.telephone?.includes(query)
      );
    }

    setFilteredNannySitters(filtered);
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      const nannysitterData = {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email || null,
        telephone: data.telephone || null,
        tarif_horaire: data.tarif_horaire ? parseFloat(data.tarif_horaire) : null,
        competences: data.competences || null,
        actif: data.actif,
      };

      if (selectedNannySitter) {
        const { error } = await supabase
          .from('nannysitters')
          .update(nannysitterData)
          .eq('id', selectedNannySitter.id);

        if (error) throw error;

        toast({
          title: 'Succès',
          description: 'Babysitter modifiée avec succès',
        });
      } else {
        const { error } = await supabase.from('nannysitters').insert([nannysitterData]);

        if (error) throw error;

        toast({
          title: 'Succès',
          description: 'Babysitter créée avec succès',
        });
      }

      setDialogOpen(false);
      setSelectedNannySitter(undefined);
      loadNannySitters();
    } catch (error) {
      console.error('Error saving nannysitter:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder la babysitter',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (nannysitter: NannySitter) => {
    setSelectedNannySitter(nannysitter);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!nannysitterToDelete) return;

    try {
      const { error } = await supabase.from('nannysitters').delete().eq('id', nannysitterToDelete.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Babysitter supprimée avec succès',
      });

      loadNannySitters();
    } catch (error) {
      console.error('Error deleting nannysitter:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer la babysitter',
      });
    } finally {
      setDeleteDialogOpen(false);
      setNannySitterToDelete(null);
    }
  };

  const getStatusBadge = (actif: boolean | null) => {
    if (actif) {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Baby className="h-8 w-8" />
            Babysitters
          </h2>
          <p className="text-muted-foreground">Gérez votre équipe de babysitters</p>
        </div>
        <Button
          onClick={() => {
            setSelectedNannySitter(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle babysitter
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
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actives</SelectItem>
            <SelectItem value="inactive">Inactives</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredNannySitters.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery || statusFilter !== 'all'
            ? 'Aucune babysitter ne correspond à vos critères'
            : 'Aucune babysitter pour le moment'}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNannySitters.map((nannysitter) => (
                <TableRow key={nannysitter.id}>
                  <TableCell className="font-medium">
                    {nannysitter.prenom} {nannysitter.nom}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {nannysitter.email && <div>{nannysitter.email}</div>}
                      {nannysitter.telephone && (
                        <div className="text-muted-foreground">{nannysitter.telephone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {nannysitter.tarif_horaire && (
                      <div className="font-medium">{nannysitter.tarif_horaire} €/h</div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(nannysitter.actif)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(nannysitter)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setNannySitterToDelete(nannysitter);
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

      <NannySitterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nannysitter={selectedNannySitter}
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
                {nannysitterToDelete?.prenom} {nannysitterToDelete?.nom}
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

export default NannySitters;
