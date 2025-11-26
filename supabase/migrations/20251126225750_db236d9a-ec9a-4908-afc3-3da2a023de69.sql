-- Add IBAN field to company_info table
ALTER TABLE public.company_info 
ADD COLUMN iban text;