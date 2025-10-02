import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const BillingCtx = createContext(null);

const FREE_LIMITS = {
  dream_create_month: 10,
  ai_analyze_month: 5,
  chat_message_day: 3
};

export function BillingProvider({ children }) {
  const [plan, setPlan] = useState('free');
  const [usage, setUsage] = useState({});
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      console.log('BillingContext: Refreshing billing status...');
      const res = await api.get('/billing/status');
      const data = res?.data || res; // support api helper or raw
      console.log('BillingContext: Got billing data:', data);
      setPlan(data.plan || 'free');
      setUsage(data.usage || {});
      setPeriod(data.period || null);
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
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const isPremium = plan === 'premium';

  const canUse = (action) => {
    if (isPremium) return true;
    switch (action) {
      case 'ai_analyze':
        return (usage.ai_analyze || 0) < FREE_LIMITS.ai_analyze_month;
      case 'chat_message':
        return (usage.chat_message || 0) < 90; // approximate month bucket
      case 'dream_create':
        return (usage.dream_create || 0) < FREE_LIMITS.dream_create_month;
      default:
        return true;
    }
  };

  const recordUsage = async (metric) => {
    try {
      await api.post('/billing/usage/increment', { metric });
      await refresh();
    } catch {}
  };

  const value = useMemo(() => ({ plan, isPremium, usage, period, loading, refresh, canUse, recordUsage }), [plan, isPremium, usage, period, loading]);
  return <BillingCtx.Provider value={value}>{children}</BillingCtx.Provider>;
}

export function useBilling() {
  return useContext(BillingCtx);
}


