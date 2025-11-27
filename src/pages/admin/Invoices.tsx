import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Pencil, Trash2, Send, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { InvoiceDialog } from "@/components/admin/InvoiceDialog";
import { SendInvoiceDialog } from "@/components/admin/SendInvoiceDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Tables } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceWithClient = Invoice & {
  clients: {
    nom: string;
    prenom: string;
    email: string | null;
  } | null;
};

const Invoices = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<InvoiceWithClient | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(nom, prenom, email)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InvoiceWithClient[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture supprimée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la facture");
    },
  });

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesSearch =
      invoice.numero.toLowerCase().includes(search.toLowerCase()) ||
      `${invoice.clients?.prenom} ${invoice.clients?.nom}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || invoice.statut === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleSend = (invoice: InvoiceWithClient) => {
    setInvoiceToSend(invoice);
    setSendDialogOpen(true);
  };

  const handleDownload = async (invoice: InvoiceWithClient) => {
    setDownloadingPdf(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id },
      });

      if (error) throw error;

      if (data?.pdf) {
        const link = document.createElement('a');
        link.href = data.pdf;
        link.download = `Facture-${invoice.numero}.pdf`;
        link.click();
        
        toast.success('PDF téléchargé avec succès');
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDelete = (id: string) => {
    setInvoiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteMutation.mutate(invoiceToDelete);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      brouillon: { variant: "secondary", label: "Brouillon" },
      envoyee: { variant: "default", label: "Envoyée" },
      payee: { variant: "default", label: "Payée" },
      en_retard: { variant: "destructive", label: "En retard" },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Factures</h2>
          <p className="text-muted-foreground">
            Gérez vos factures et suivez les paiements
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedInvoice(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="envoyee">Envoyée</SelectItem>
            <SelectItem value="payee">Payée</SelectItem>
            <SelectItem value="en_retard">En retard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead>Date d'échéance</TableHead>
              <TableHead>Montant TTC</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredInvoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Aucune facture trouvée
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.numero}</TableCell>
                  <TableCell>
                    {invoice.clients
                      ? `${invoice.clients.prenom} ${invoice.clients.nom}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.created_at!).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {invoice.date_echeance
                      ? new Date(invoice.date_echeance).toLocaleDateString(
                          "fr-FR"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>{invoice.montant_ttc?.toFixed(2)} €</TableCell>
                  <TableCell>{getStatusBadge(invoice.statut || "brouillon")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(invoice)}
                        disabled={downloadingPdf === invoice.id}
                        title="Télécharger le PDF"
                      >
                        {downloadingPdf === invoice.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSend(invoice)}
                        title="Envoyer la facture"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(invoice.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={selectedInvoice}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          setDialogOpen(false);
        }}
      />

      <SendInvoiceDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        invoice={invoiceToSend}
        client={invoiceToSend?.clients || null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer la facture"
        description="Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible."
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Invoices;
