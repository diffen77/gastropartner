import React, { useEffect, useState } from 'react';
import { useFreemium } from '../hooks/useFreemium';
import { Crown, Check } from 'lucide-react';

const Upgrade: React.FC = () => {
  const { usage, planComparison, fetchPlanComparison, loading } = useFreemium();
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchPlanComparison();
  }, [fetchPlanComparison]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // Here you would integrate with your payment processor
      // For now, just show that the user clicked upgrade
      console.log('Upgrading to premium...');
      
      // Redirect to external payment URL if available
      if (planComparison?.upgrade_url) {
        window.open(planComparison.upgrade_url, '_blank');
      } else {
        alert('Kontakta support för att uppgradera till Premium');
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Ett fel uppstod vid uppgraderingen');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading && !planComparison) {
    return (
      <div className="main-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Laddar prenumerationsalternativ...</p>
        </div>
      </div>
    );
  }

  const currentPlan = usage?.plan || 'free';
  const isPremium = currentPlan === 'premium';

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-header__content">
          <div className="page-header__text">
            <h1 className="page-header__title">
              <Crown className="inline-block w-8 h-8 mr-2 text-yellow-500" />
              Uppgradera till Premium
            </h1>
            <p className="page-header__subtitle">
              {isPremium 
                ? 'Du har redan Premium! Tack för ditt stöd.' 
                : 'Få tillgång till obegränsade funktioner och prioriterat stöd'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="upgrade-content" style={{ padding: '24px', maxWidth: '1200px' }}>
        {isPremium ? (
          <div className="premium-status" style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <Crown className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
              Du har Premium!
            </h2>
            <p style={{ fontSize: '16px', color: '#b45309' }}>
              Tack för att du stödjer GastroPartner. Du har tillgång till alla funktioner.
            </p>
          </div>
        ) : (
          <>
            {/* Usage Overview */}
            {usage && (
              <div className="usage-overview" style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                  Din nuvarande användning
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {Object.entries(usage.usage).map(([type, data]) => {
                    const isAtLimit = data.at_limit;
                    const isNearLimit = data.percentage >= 80;
                    
                    return (
                      <div key={type} style={{
                        border: `2px solid ${isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#10b981'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: isAtLimit ? '#fef2f2' : isNearLimit ? '#fefbf2' : '#f0fdf4'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <h4 style={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold',
                            color: isAtLimit ? '#dc2626' : isNearLimit ? '#d97706' : '#059669',
                            textTransform: 'capitalize'
                          }}>
                            {type === 'menu_items' ? 'Maträtter' : 
                             type === 'recipes' ? 'Recept' : 'Ingredienser'}
                          </h4>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold',
                            color: isAtLimit ? '#dc2626' : isNearLimit ? '#d97706' : '#059669'
                          }}>
                            {data.current}/{data.limit}
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${data.percentage}%`,
                            height: '100%',
                            backgroundColor: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#10b981',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <p style={{ 
                          fontSize: '12px', 
                          color: '#6b7280', 
                          marginTop: '8px' 
                        }}>
                          {data.percentage.toFixed(1)}% använt
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plan Comparison */}
            {planComparison && (
              <div className="plan-comparison">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  {/* Free Plan */}
                  <div style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                        Kostnadsfri
                      </h3>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                        {planComparison.plans.free.price} {planComparison.plans.free.currency}
                      </div>
                      <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        per {planComparison.plans.free.billing_period}
                      </p>
                    </div>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Funktioner:</h4>
                      {Object.entries(planComparison.plans.free.features).map(([feature, limit]) => (
                        <div key={feature} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px' }}>
                            {feature === 'ingredients' ? 'Ingredienser' :
                             feature === 'recipes' ? 'Recept' :
                             feature === 'menu_items' ? 'Maträtter' :
                             feature}: {typeof limit === 'number' ? limit : limit.toString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      padding: '12px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      Din nuvarande plan
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div style={{
                    border: '3px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '24px',
                    backgroundColor: 'linear-gradient(135deg, #fefbf2 0%, #fef3c7 100%)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '4px 16px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      REKOMMENDERAS
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
                        <Crown className="inline-block w-6 h-6 mr-2" />
                        Premium Plan
                      </h3>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
                        {planComparison.plans.premium.price} {planComparison.plans.premium.currency}
                      </div>
                      <p style={{ fontSize: '14px', color: '#b45309' }}>
                        per {planComparison.plans.premium.billing_period}
                      </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#92400e' }}>
                        Fördelar:
                      </h4>
                      {planComparison.plans.premium.upgrade_benefits?.map((benefit, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                          <span style={{ fontSize: '14px' }}>{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      style={{
                        width: '100%',
                        backgroundColor: upgrading ? '#d97706' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: upgrading ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!upgrading) e.currentTarget.style.backgroundColor = '#d97706';
                      }}
                      onMouseOut={(e) => {
                        if (!upgrading) e.currentTarget.style.backgroundColor = '#f59e0b';
                      }}
                    >
                      {upgrading ? 'Uppgraderar...' : 'Uppgradera till Premium'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Trial Info */}
            {planComparison?.trial_available && (
              <div style={{
                backgroundColor: '#eff6ff',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '24px'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                  💡 Gratis provperiod tillgänglig
                </h4>
                <p style={{ fontSize: '14px', color: '#1e40af' }}>
                  Prova Premium-funktionerna gratis innan du bestämmer dig.
                </p>
              </div>
            )}
          </>
        )}

        {/* FAQ Section */}
        <div style={{ marginTop: '48px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            Vanliga frågor
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                Kan jag avbryta när som helst?
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Ja, du kan avbryta din Premium-prenumeration när som helst. Inga långtidskontrakt.
              </p>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                Vad händer med mina data om jag säger upp?
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                All din data förblir säker. Du får åtkomst till den kostnadsfria nivån igen men behåller all din information.
              </p>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                Får jag support?
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Premium-kunder får prioriterat stöd via e-post och chat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;