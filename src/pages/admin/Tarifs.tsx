import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { TarifDialog } from "@/components/admin/TarifDialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Tarifs() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTarif, setSelectedTarif] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tarifToDelete, setTarifToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tarifs, isLoading } = useQuery({
    queryKey: ["tarifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarifs")
        .select("*")
        .order("type_jour", { ascending: true })
        .order("nom", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (tarif: any) => {
    setSelectedTarif(tarif);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedTarif(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!tarifToDelete) return;

    try {
      const { error } = await supabase
        .from("tarifs")
        .delete()
        .eq("id", tarifToDelete);

      if (error) throw error;

      toast.success("Tarif supprimé avec succès");
      queryClient.invalidateQueries({ queryKey: ["tarifs"] });
    } catch (error: any) {
      console.error("Error deleting tarif:", error);
      toast.error("Erreur lors de la suppression du tarif");
    } finally {
      setDeleteDialogOpen(false);
      setTarifToDelete(null);
    }
  };

  const confirmDelete = (id: string) => {
    setTarifToDelete(id);
    setDeleteDialogOpen(true);
  };

  const getTypeJourLabel = (type: string) => {
    switch (type) {
      case "semaine":
        return "Semaine";
      case "weekend":
        return "Week-end";
      case "tous":
        return "Tous les jours";
      default:
        return type;
    }
  };

  const getTypeJourBadge = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "semaine":
        return "default";
      case "weekend":
        return "secondary";
      case "tous":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tarifs</h1>
            <p className="text-muted-foreground">
              Gérez les tarifs de vos services pour le calcul des devis et factures
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau tarif
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des tarifs</CardTitle>
            <CardDescription>
              Les tarifs sont utilisés automatiquement dans les devis et factures selon le type de jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tarifs && tarifs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du service</TableHead>
                    <TableHead>Type de jour</TableHead>
                    <TableHead className="text-right">Tarif horaire</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarifs.map((tarif) => (
                    <TableRow key={tarif.id}>
                      <TableCell className="font-medium">{tarif.nom}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeJourBadge(tarif.type_jour)}>
                          {getTypeJourLabel(tarif.type_jour)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {tarif.tarif_horaire.toFixed(2)} €/h
                      </TableCell>
                      <TableCell>
                        <Badge variant={tarif.actif ? "default" : "secondary"}>
                          {tarif.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(tarif)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(tarif.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucun tarif configuré</p>
                <Button onClick={handleNew} variant="link" className="mt-2">
                  Créer votre premier tarif
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <TarifDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tarif={selectedTarif}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["tarifs"] });
            setSelectedTarif(null);
          }}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce tarif ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
