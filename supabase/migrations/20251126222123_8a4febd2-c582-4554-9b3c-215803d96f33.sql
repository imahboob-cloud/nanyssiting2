-- Create table for service rates
CREATE TABLE public.tarifs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  tarif_horaire NUMERIC NOT NULL,
  type_jour TEXT NOT NULL CHECK (type_jour IN ('semaine', 'weekend', 'tous')),
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tarifs ENABLE ROW LEVEL SECURITY;

-- Create policies for tarifs
CREATE POLICY "Owners can view all tarifs" 
ON public.tarifs 
FOR SELECT 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can insert tarifs" 
ON public.tarifs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update tarifs" 
ON public.tarifs 
FOR UPDATE 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete tarifs" 
ON public.tarifs 
FOR DELETE 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_tarifs_updated_at
BEFORE UPDATE ON public.tarifs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default rates
INSERT INTO public.tarifs (nom, tarif_horaire, type_jour) VALUES
('Babysitting en semaine', 16.00, 'semaine'),
('Babysitting en week-end', 19.00, 'weekend');