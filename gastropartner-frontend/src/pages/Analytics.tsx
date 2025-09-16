import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { AnalyticsDashboard } from '../components/Analytics/AnalyticsDashboard';

export function Analytics() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Analys & Rapporter"
        subtitle="Djupgående affärsinsikter och prestationsanalys"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}