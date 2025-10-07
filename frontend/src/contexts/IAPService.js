import * as React from 'react';
import Constants from 'expo-constants';
import * as RNIap from 'react-native-iap';
import { api } from '../api';

const IAPCtx = React.createContext(null);

export function IAPProvider({ children }) {
  const [products, setProducts] = React.useState([]);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        await RNIap.initConnection();
        setInitialized(true);
        const ids = Object.values(Constants.expoConfig?.extra?.iosProductIds || {});
        if (ids.length) {
          const list = await RNIap.getSubscriptions({ skus: ids });
          setProducts(list);
        }
        unsub = RNIap.purchaseUpdatedListener(async (purchase) => {
          try {
            const receipt = purchase.transactionReceipt;
            if (receipt) {
              await api.post('/billing/apple/verify', { receiptData: receipt });
              await RNIap.finishTransaction({ purchase, isConsumable: false });
            }
          } catch (e) {
            // ignore
          }
        });
      } catch {}
    })();
    return () => { unsub && unsub.remove?.(); RNIap.endConnection?.(); };
  }, []);

  const requestPurchase = React.useCallback(async (sku) => {
    await RNIap.requestSubscription({ sku });
  }, []);

  const restorePurchases = React.useCallback(async () => {
    const purchases = await RNIap.getAvailablePurchases();
    const latest = purchases?.[0];
    if (latest?.transactionReceipt) {
      await api.post('/billing/apple/verify', { receiptData: latest.transactionReceipt });
    }
  }, []);

  const value = React.useMemo(() => ({ initialized, products, requestPurchase, restorePurchases }), [initialized, products, requestPurchase, restorePurchases]);
  return <IAPCtx.Provider value={value}>{children}</IAPCtx.Provider>;
}

export function useIAP() { return React.useContext(IAPCtx); }


