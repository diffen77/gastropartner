import React from 'react';

function PageHeader({ title, subtitle, children }: { 
  title: string; 
  subtitle?: string; 
  children?: React.ReactNode; 
}) {
  return (
    <div className="page-header">
      <div className="page-header__content">
        <div className="page-header__text">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {children && (
          <div className="page-header__actions">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function ComingSoonCard({ 
  icon, 
  title, 
  description, 
  features 
}: { 
  icon: string;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="coming-soon-card">
      <div className="coming-soon-card__icon">{icon}</div>
      <h3 className="coming-soon-card__title">{title}</h3>
      <p className="coming-soon-card__description">{description}</p>
      <ul className="coming-soon-card__features">
        {features.map((feature, index) => (
          <li key={index}>✨ {feature}</li>
        ))}
      </ul>
    </div>
  );
}

export function Sales() {
  return (
    <div className="main-content">
      <PageHeader 
        title="💰 Försäljning" 
        subtitle="Hantera försäljning, orderhantering och kundinformation"
      />

      <div className="coming-soon-container">
        <div className="coming-soon-hero">
          <div className="coming-soon-hero__icon">💰</div>
          <h2 className="coming-soon-hero__title">Försäljningsmodulen kommer snart!</h2>
          <p className="coming-soon-hero__subtitle">
            Vi utvecklar kraftfulla verktyg för att hantera din försäljning och kundrelationer.
          </p>
        </div>

        <div className="coming-soon-grid">
          <ComingSoonCard
            icon="📊"
            title="Försäljningsrapporter"
            description="Detaljerad analys av din försäljning med realtidsdata"
            features={[
              "Daglig, veckovis och månadsvis rapportering",
              "Trendanalys och prognoser",
              "Försäljning per produkt och kategori",
              "Jämförelser mot tidigare perioder"
            ]}
          />
          
          <ComingSoonCard
            icon="🛒"
            title="Orderhantering"
            description="Effektivt system för att hantera beställningar och leveranser"
            features={[
              "Automatiserad orderbehandling",
              "Lagerstatus och påfyllning",
              "Leveransplanering",
              "Kundommunikation"
            ]}
          />
          
          <ComingSoonCard
            icon="👥"
            title="CRM & Kundregister"
            description="Håll koll på dina kunder och bygg starkare relationer"
            features={[
              "Komplett kundregister",
              "Köphistorik och preferenser",
              "Segmentering och målgruppsanalys",
              "Automatiserade kampanjer"
            ]}
          />
          
          <ComingSoonCard
            icon="💳"
            title="Fakturering & Betalning"
            description="Smidig hantering av fakturor och betalningar"
            features={[
              "Automatisk fakturagenerering",
              "Integrerade betalningslösningar",
              "Påminnelser och inkasso",
              "Ekonomisystemsintegration"
            ]}
          />
        </div>

        <div className="coming-soon-cta">
          <h3>Vill du få tillgång först?</h3>
          <p>Kontakta oss för att bli en av de första att testa försäljningsmodulen.</p>
          <button className="btn btn--primary" disabled>
            Intresseanmälan (Kommer snart)
          </button>
        </div>
      </div>
    </div>
  );
}