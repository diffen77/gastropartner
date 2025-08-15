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

function ModuleCard({ 
  icon, 
  title, 
  description, 
  status,
  features,
  comingSoon = false
}: { 
  icon: string;
  title: string;
  description: string;
  status: 'active' | 'coming-soon' | 'beta';
  features: string[];
  comingSoon?: boolean;
}) {
  const statusColors = {
    'active': 'var(--color-success)',
    'beta': 'var(--color-warning)', 
    'coming-soon': 'var(--color-info)'
  };

  const statusLabels = {
    'active': 'Aktiverad',
    'beta': 'Beta',
    'coming-soon': 'Kommer snart'
  };

  return (
    <div className={`module-card ${comingSoon ? 'module-card--coming-soon' : ''}`}>
      <div className="module-card__header">
        <div className="module-card__icon">{icon}</div>
        <div className="module-card__info">
          <h3 className="module-card__title">{title}</h3>
          <span 
            className="module-card__status" 
            style={{ backgroundColor: statusColors[status] }}
          >
            {statusLabels[status]}
          </span>
        </div>
      </div>
      <p className="module-card__description">{description}</p>
      <ul className="module-card__features">
        {features.map((feature, index) => (
          <li key={index}>
            {comingSoon ? '✨' : '✅'} {feature}
          </li>
        ))}
      </ul>
      {comingSoon && (
        <div className="module-card__footer">
          <button className="btn btn--outline" disabled>
            Få tillgång först
          </button>
        </div>
      )}
    </div>
  );
}

export function Modules() {
  return (
    <div className="main-content">
      <PageHeader 
        title="🧩 Moduler" 
        subtitle="Hantera och aktivera olika funktionsmoduler i ditt system"
      />

      <div className="modules-container">
        <div className="modules-status">
          <div className="modules-status__item">
            <span className="modules-status__count">4</span>
            <span className="modules-status__label">Aktiva moduler</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">2</span>
            <span className="modules-status__label">Beta-moduler</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">6</span>
            <span className="modules-status__label">Kommer snart</span>
          </div>
        </div>

        <div className="modules-section">
          <h2>Aktiva Moduler</h2>
          <div className="modules-grid">
            <ModuleCard
              icon="🥕"
              title="Ingredienshantering"
              description="Hantera ingredienser, leverantörer och kostnader"
              status="active"
              features={[
                "Ingrediensregister med kategorier",
                "Kostnadsspårning per enhet",
                "Leverantörshantering",
                "Automatisk uppdatering"
              ]}
            />
            
            <ModuleCard
              icon="📝"
              title="Recepthantering"
              description="Skapa och hantera recept med kostnadsberäkningar"
              status="active"
              features={[
                "Detaljerade recept med instruktioner",
                "Automatisk kostnadsberäkning",
                "Portionsstorlekar och skalning",
                "Näringsinnehållsanalys"
              ]}
            />
            
            <ModuleCard
              icon="🍽️"
              title="Menyhantering"
              description="Skapa maträtter och beräkna lönsamhet"
              status="active"
              features={[
                "Matträtt från recept",
                "Prissättning och marginaler",
                "Lönsamhetsanalys",
                "Säsongsmeny och kampanjer"
              ]}
            />
            
            <ModuleCard
              icon="📈"
              title="Kostnadsanalys"
              description="Djupgående analys av kostnader och lönsamhet"
              status="active"
              features={[
                "Realtidskostnadsberäkning",
                "Marginalanalys per produkt",
                "Trendspårning över tid",
                "Jämförelser och benchmarks"
              ]}
            />
          </div>
        </div>

        <div className="modules-section">
          <h2>Beta-moduler</h2>
          <div className="modules-grid">
            <ModuleCard
              icon="🧪"
              title="User Testing"
              description="Samla användarfeedback och förbättra upplevelsen"
              status="beta"
              features={[
                "Feedbackformulär och enkäter",
                "Användaranalys och insights",
                "A/B-testning av funktioner",
                "Automatiserad rapportering"
              ]}
            />
            
            <ModuleCard
              icon="🛡️"
              title="SuperAdmin"
              description="Avancerade administratörsfunktioner"
              status="beta"
              features={[
                "Användarhantering",
                "Systemkonfiguration",
                "Säkerhetsövervakning",
                "Dataexport och backup"
              ]}
            />
          </div>
        </div>

        <div className="modules-section">
          <h2>Kommer Snart</h2>
          <div className="modules-grid">
            <ModuleCard
              icon="💰"
              title="Försäljningsmodul"
              description="Komplett försäljningshantering med CRM"
              status="coming-soon"
              features={[
                "Orderhantering och fakturering",
                "Kundregister och CRM",
                "Försäljningsrapporter",
                "Integrationer med kassasystem"
              ]}
              comingSoon={true}
            />
            
            <ModuleCard
              icon="📊"
              title="Advanced Analytics"
              description="Djupgående dataanalys och AI-insights"
              status="coming-soon"
              features={[
                "Prediktiv analys och prognoser",
                "Automatisk trend-detection",
                "Personaliserade rekommendationer",
                "Export till Business Intelligence"
              ]}
              comingSoon={true}
            />
            
            <ModuleCard
              icon="📱"
              title="Mobilapp"
              description="Hantera verksamheten från mobilen"
              status="coming-soon"
              features={[
                "Ingredienshantering on-the-go",
                "Snabb receptsökning",
                "Push-notifikationer",
                "Offline-läge för viktiga data"
              ]}
              comingSoon={true}
            />
            
            <ModuleCard
              icon="🔄"
              title="Integrationer"
              description="Anslut till externa system och tjänster"
              status="coming-soon"
              features={[
                "Ekonomisystem (Fortnox, Visma)",
                "E-handelslösningar",
                "Leverantörsportaler",
                "API för tredjepartsutvecklare"
              ]}
              comingSoon={true}
            />
            
            <ModuleCard
              icon="🏪"
              title="Multi-Location"
              description="Hantera flera restauranger och kök"
              status="coming-soon"
              features={[
                "Centraliserad ingredienshantering",
                "Lokala menyer och priser",
                "Jämförelser mellan platser",
                "Samlad rapportering"
              ]}
              comingSoon={true}
            />
            
            <ModuleCard
              icon="👥"
              title="Team Management"
              description="Användarroller och behörighetshantering"
              status="coming-soon"
              features={[
                "Flexibla användarroller",
                "Aktivitetslogg och audit trail",
                "Godkännandeflöden",
                "Team-dashboards"
              ]}
              comingSoon={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}