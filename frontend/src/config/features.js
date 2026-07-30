/**
 * PricePilot AI - Feature Flags Configuration
 * 
 * Controls which features are visible/accessible in the UI.
 * Backend APIs remain intact regardless of flag state.
 * 
 * Milestone 1: Core features (Dashboard, Products, Pricing, Datasets, Users, Settings)
 * Future Milestones: AI, Forecasting, Reports, Analytics, etc.
 */
const FEATURES = {
  // Milestone 1 - Active
  DASHBOARD: true,
  PRODUCTS: true,
  PRICING: true,
  DATASETS: true,
  USERS: true,
  SETTINGS: true,

  // Future Modules - Hidden until enabled
  AI_PRICING: false,
  FORECASTING: false,
  REPORTS: false,
  ANALYTICS: false,
  REVENUE_INTELLIGENCE: false,
  RECOMMENDATIONS: false,
  ADVANCED_ANALYTICS: false,
  BUSINESS_INTELLIGENCE: false,
  PREDICTIVE_INSIGHTS: false,
};

/**
 * Check if a feature is enabled.
 * @param {string} feature - Feature key from FEATURES object
 * @returns {boolean}
 */
export function isFeatureEnabled(feature) {
  return FEATURES[feature] === true;
}

/**
 * Get all enabled features as a list of keys.
 * @returns {string[]}
 */
export function getEnabledFeatures() {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

/**
 * Get sidebar navigation items based on enabled features.
 * @returns {Array<{label: string, path: string, icon: string, feature: string}>}
 */
export function getSidebarItems() {
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', feature: 'DASHBOARD' },
    { label: 'Product Management', path: '/products', icon: 'Package', feature: 'PRODUCTS' },
    { label: 'Pricing Management', path: '/pricing', icon: 'DollarSign', feature: 'PRICING' },
    { label: 'Dataset Management', path: '/datasets', icon: 'Database', feature: 'DATASETS' },
    { label: 'User Management', path: '/users', icon: 'Users', feature: 'USERS' },
    { label: 'Settings', path: '/settings', icon: 'Settings', feature: 'SETTINGS' },
  ];

  // Future modules - hidden but preserved in code
  return items.filter(item => FEATURES[item.feature]);
}

export default FEATURES;
