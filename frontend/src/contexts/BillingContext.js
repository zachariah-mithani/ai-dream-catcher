import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { onAuthChanged } from '../utils/events';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BillingCtx = createContext(null);

const FREE_LIMITS = {
  dream_create_month: 5,
  // Frontend mirrors backend's combined monthly pool for AI actions
  ai_actions_month: 10
};

// Unified cap for combined AI actions (chat + analysis) for both logic and display
const AI_ACTIONS_LIMIT = 10;

export function BillingProvider({ children }) {
  const [plan, setPlan] = useState('free');
  const [usage, setUsage] = useState({});
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastRefreshAtRef = useRef(0);
  const triedReconcileRef = useRef(false);

  const refresh = async (force = false) => {
    try {
      // Skip if we don't have a token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('BillingContext: Skip refresh (no token)');
        return;
      }

      // Throttle to once every 4s (unless forced)
      if (!force) {
        const now = Date.now();
        if (now - lastRefreshAtRef.current < 4000) {
          console.log('BillingContext: Throttled refresh, skipping');
          return;
        }
      }
      lastRefreshAtRef.current = Date.now();

      if (loading) return; // prevent concurrent calls
      setLoading(true);
      console.log('BillingContext: Refreshing billing status...');
      const res = await api.get('/billing/status');
      const data = res?.data || res; // support api helper or raw
      console.log('BillingContext: Got billing data:', data);
      setPlan(data.plan || 'free');
      setUsage(data.usage || {});
      setPeriod(data.period || null);

      // Reconcile step removed: backend does not expose /billing/reconcile on iOS flow
    } catch (e) {
      console.log('BillingContext: Billing endpoint failed, trying profile fallback:', e.message);
      // Fallback: try profile if billing endpoint unavailable
      try {
        const profRes = await api.get('/auth/profile');
        const profile = profRes?.data || profRes;
        console.log('BillingContext: Got profile data:', profile);
        if (profile?.plan) setPlan(profile.plan);
      } catch (profileError) {
        console.log('BillingContext: Profile fallback also failed:', profileError.message);
        // If both fail with 401, it might be an auth issue
        if (profileError.response?.status === 401) {
          console.log('BillingContext: Authentication issue detected, skipping billing refresh');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Auto-refresh billing whenever auth state changes (login/logout/token refresh)
  useEffect(() => {
    const unsubscribe = onAuthChanged(async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      // Debounce lightly in case multiple auth events fire back-to-back
      setTimeout(() => refresh().catch(() => {}), 50);
    });
    return unsubscribe;
  }, []);

  const isPremium = plan === 'premium';

  // Helper: current combined AI actions used (prefer backend-provided ai_pool)
  const getCombinedAiUsed = () => {
    const poolUsed = usage.ai_pool;
    if (typeof poolUsed === 'number') return poolUsed;
    return (usage.ai_analyze || 0) + (usage.chat_message || 0);
  };

  const canUse = (action) => {
    if (isPremium) return true;
    switch (action) {
      case 'ai_analyze':
      case 'chat_message': {
        const used = getCombinedAiUsed();
        return used < FREE_LIMITS.ai_actions_month;
      }
      case 'dream_create':
        return (usage.dream_create || 0) < FREE_LIMITS.dream_create_month;
      default:
        return true;
    }
  };

  const getUsageInfo = (action) => {
    if (isPremium) return { used: 0, limit: Infinity, remaining: Infinity, period: 'month' };
    
    let used, limit, period;
    switch (action) {
      case 'ai_analyze':
      case 'chat_message':
        used = getCombinedAiUsed();
        limit = FREE_LIMITS.ai_actions_month;
        period = 'month';
        break;
      case 'dream_create':
        used = usage.dream_create || 0;
        limit = FREE_LIMITS.dream_create_month;
        period = 'month';
        break;
      default:
        used = 0;
        limit = Infinity;
        period = 'month';
    }
    
    return { used, limit, remaining: Math.max(0, limit - used), period };
  };

  const isLimitReached = (action) => {
    if (isPremium) return false;
    const info = getUsageInfo(action);
    return info.remaining === 0;
  };

  const recordUsage = async (metric) => {
    try {
      await api.post('/billing/usage/increment', { metric });
      await refresh();
    } catch {}
  };

  const value = useMemo(() => ({ 
    plan, 
    isPremium, 
    usage, 
    period, 
    loading, 
    refresh, 
    canUse, 
    recordUsage, 
    getUsageInfo, 
    isLimitReached,
    // Combined AI actions helpers (for display/messaging only)
    getAiActionsUsed: () => getCombinedAiUsed(),
    getAiActionsRemaining: () => Math.max(0, AI_ACTIONS_LIMIT - getCombinedAiUsed()),
    AI_ACTIONS_LIMIT
  }), [plan, isPremium, usage, period, loading]);
  return <BillingCtx.Provider value={value}>{children}</BillingCtx.Provider>;
}

export function useBilling() {
  return useContext(BillingCtx);
}


