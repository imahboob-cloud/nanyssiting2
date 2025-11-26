interface SectionTitleProps {
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

export const SectionTitle = ({ title, subtitle, align = 'center' }: SectionTitleProps) => (
  <div className={`mb-12 text-${align} max-w-3xl mx-auto px-4`}>
    <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 font-heading">{title}</h2>
    <div className="h-1.5 w-24 bg-salmon rounded-full mb-6 mx-auto"></div>
    {subtitle && <p className="text-muted-foreground text-lg">{subtitle}</p>}
  </div>
);
