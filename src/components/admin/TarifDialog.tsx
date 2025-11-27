import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TarifDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarif?: {
    id: string;
    nom: string;
    tarif_horaire: number;
    type_jour: string;
    actif: boolean;
  } | null;
  onSuccess: () => void;
}

export function TarifDialog({ open, onOpenChange, tarif, onSuccess }: TarifDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: tarif?.nom || "",
    tarif_horaire: tarif?.tarif_horaire || 0,
    type_jour: tarif?.type_jour || "semaine",
    actif: tarif?.actif ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tarif?.id) {
        const { error } = await supabase
          .from("tarifs")
          .update(formData)
          .eq("id", tarif.id);

        if (error) throw error;
        toast.success("Tarif modifié avec succès");
      } else {
        const { error } = await supabase
          .from("tarifs")
          .insert([formData]);

        if (error) throw error;
        toast.success("Tarif créé avec succès");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving tarif:", error);
      toast.error("Erreur lors de l'enregistrement du tarif");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="tarif-dialog-description">
        <DialogHeader>
          <DialogTitle>{tarif ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          <p id="tarif-dialog-description" className="sr-only">
            Formulaire de configuration des tarifs horaires
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du service</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Babysitting en semaine"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tarif_horaire">Tarif horaire (€)</Label>
            <Input
              id="tarif_horaire"
              type="number"
              step="0.01"
              min="0"
              value={formData.tarif_horaire}
              onChange={(e) => setFormData({ ...formData, tarif_horaire: parseFloat(e.target.value) })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type_jour">Type de jour</Label>
            <Select
              value={formData.type_jour}
              onValueChange={(value) => setFormData({ ...formData, type_jour: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semaine">Semaine (Lundi-Vendredi)</SelectItem>
                <SelectItem value="weekend">Week-end (Samedi-Dimanche)</SelectItem>
                <SelectItem value="tous">Tous les jours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="actif"
              checked={formData.actif}
              onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="actif" className="cursor-pointer">Service actif</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tarif ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
