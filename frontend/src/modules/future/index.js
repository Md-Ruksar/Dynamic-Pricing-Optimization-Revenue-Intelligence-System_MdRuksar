/**
 * Future Modules Registry
 * 
 * When a milestone feature flag is enabled, the corresponding module
 * can be imported and its routes added to the application.
 * 
 * Usage:
 *   import { getFutureModule } from '../modules/future';
 *   const AIPricingEngine = await getFutureModule('AI_PRICING');
 */

export const futureModules = {
  AI_PRICING: {
    component: () => import('./ai/AIPricingEngine'),
    path: '/ai-pricing',
    label: 'AI Pricing Engine',
    icon: 'BrainCircuit',
  },
  FORECASTING: {
    component: () => import('./forecasting/Forecasting'),
    path: '/forecasting',
    label: 'Forecasting',
    icon: 'TrendingUp',
  },
  REPORTS: {
    component: () => import('./reports/Reports'),
    path: '/reports',
    label: 'Reports',
    icon: 'BarChart3',
  },
  ANALYTICS: {
    component: () => import('./analytics/Analytics'),
    path: '/analytics',
    label: 'Advanced Analytics',
    icon: 'PieChart',
  },
  REVENUE_INTELLIGENCE: {
    component: () => import('./revenue/RevenueIntelligence'),
    path: '/revenue-intelligence',
    label: 'Revenue Intelligence',
    icon: 'TrendingUp',
  },
};

/**
 * Dynamically load a future module's component.
 * @param {string} featureKey - Feature flag key
 * @returns {Promise<{default: React.Component}>}
 */
export async function getFutureModule(featureKey) {
  const module = futureModules[featureKey];
  if (!module) {
    throw new Error(`Future module "${featureKey}" not found`);
  }
  return module.component();
}
