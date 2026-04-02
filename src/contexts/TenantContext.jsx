import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { user } = useAuth();

  const tenant = user?.tenant || null;

  // Apply tenant colors as CSS variables
  const primaryHsl = tenant ? hexToHsl(tenant.primaryColor) : null;
  const secondaryHsl = tenant ? hexToHsl(tenant.secondaryColor) : null;
  const tenantStyle = tenant ? {
    '--sidebar': primaryHsl,
    '--sidebar-foreground': isLightHex(tenant.primaryColor) ? '224 71% 4%' : '210 40% 98%',
    '--sidebar-border': adjustHslLightness(primaryHsl, isLightHex(tenant.primaryColor) ? -12 : 12),
    '--primary': secondaryHsl,
    '--primary-foreground': isLightHex(tenant.secondaryColor) ? '224 71% 4%' : '210 40% 98%',
    '--ring': secondaryHsl,
  } : {};

  return (
    <TenantContext.Provider value={{ tenant, modules: tenant?.modules || [] }}>
      <div style={tenantStyle}>
        {children}
      </div>
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}

export function useHasModule(moduleName) {
  const { modules } = useTenant();
  return modules.includes(moduleName);
}

// Utility: convert hex to HSL string for CSS variables
function hexToHsl(hex) {
  if (!hex) return '221.2 83.2% 53.3%';
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isLightHex(hex) {
  if (!hex) return false;
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function adjustHslLightness(hsl, delta) {
  if (!hsl) return hsl;
  const parts = hsl.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!parts) return hsl;
  const newL = Math.min(100, Math.max(0, parseFloat(parts[3]) + delta));
  return `${parts[1]} ${parts[2]}% ${newL}%`;
}
