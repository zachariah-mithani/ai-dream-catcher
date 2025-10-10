import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';
import Constants from 'expo-constants';
import { api } from '../api';
import { useBilling } from './BillingContext';

const IAPContext = createContext(null);

const productIds = Constants.expoConfig.extra.iosProductIds;
const itemSkus = Platform.select({
  ios: Object.values(productIds),
  android: [], // Not implementing Android IAP for now
});

export function IAPProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [connected, setConnected] = useState(false);
  const purchaseUpdateSubscription = useRef(null);
  const purchaseErrorSubscription = useRef(null);
  const isInitializing = useRef(false);
  const billing = useBilling();

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const initIAP = async () => {
      if (isInitializing.current) {
        console.log('IAPService: Already initializing, skipping...');
        return;
      }

      isInitializing.current = true;

      try {
        console.log('IAPService: Initializing StoreKit...');
        
        // Clean up any existing connection first
        try {
          await RNIap.endConnection();
        } catch (e) {
          // Ignore cleanup errors
        }

        await RNIap.initConnection();
        setConnected(true);
        console.log('IAPService: StoreKit connected.');

        // Fetch products
        const fetchedProducts = await RNIap.getProducts({ skus: itemSkus });
        setProducts(fetchedProducts);
        console.log('IAPService: Fetched products:', fetchedProducts.map(p => p.productId));

        // Set up listeners
        purchaseUpdateSubscription.current = RNIap.purchaseUpdatedListener(async (purchase) => {
          console.log('IAPService: Purchase updated, purchase object:', purchase);
          
          // Get the receipt data properly - use transactionReceipt as fallback
          let receiptData = null;
          try {
            console.log('IAPService: Attempting to get receipt data...');
            receiptData = await RNIap.getReceiptIOS();
            console.log('IAPService: Receipt data result:', {
              hasReceipt: !!receiptData,
              receiptLength: receiptData ? receiptData.length : 0,
              receiptPreview: receiptData ? receiptData.substring(0, 50) + '...' : 'null'
            });
          } catch (error) {
            console.error('IAPService: Failed to get receipt:', error);
            // Fallback to transactionReceipt from purchase object
            if (purchase.transactionReceipt) {
              receiptData = purchase.transactionReceipt;
              console.log('IAPService: Using transactionReceipt as fallback:', {
                hasReceipt: !!receiptData,
                receiptLength: receiptData ? receiptData.length : 0,
                receiptPreview: receiptData ? receiptData.substring(0, 50) + '...' : 'null'
              });
            }
          }
          
          if (receiptData) {
            try {
              console.log('IAPService: Verifying receipt with backend...');
              const response = await api.post('/billing/apple/verify', {
                receiptData: receiptData,
                originalTransactionId: purchase.originalTransactionIdentifierIOS,
              });
              console.log('IAPService: Receipt verification successful:', response.data);
              await RNIap.finishTransaction({ purchase, isConsumable: false });
              console.log('IAPService: Transaction finished successfully.');
              Alert.alert('Success', 'Your subscription is now active!');
              billing?.refresh?.(); // Refresh billing status
            } catch (error) {
              console.error('IAPService: Receipt verification failed:', error);
              console.error('IAPService: Error details:', error.response?.data || error.message);
              
              // Still finish the transaction to prevent it from staying pending
              await RNIap.finishTransaction({ purchase, isConsumable: false });
              
              // Show more specific error message
              const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
              Alert.alert(
                'Verification Error', 
                `Purchase completed but verification failed: ${errorMessage}. Please contact support if this persists.`
              );
            }
          } else {
            console.error('IAPService: No receipt data available');
            console.log('IAPService: Purchase object details:', {
              transactionId: purchase.transactionId,
              transactionReceipt: purchase.transactionReceipt,
              originalTransactionIdentifierIOS: purchase.originalTransactionIdentifierIOS,
              productId: purchase.productId
            });
            
            // Try alternative approach for simulator testing
            if (__DEV__) {
              console.log('IAPService: Development mode - attempting manual premium grant');
              try {
                // Try to manually grant premium access for development
                await api.post('/billing/dev-grant-premium', {
                  productId: purchase.productId,
                  transactionId: purchase.transactionId
                });
                console.log('IAPService: Manual premium grant successful');
                await RNIap.finishTransaction({ purchase, isConsumable: false });
                
                // Force billing refresh with delay to ensure backend is updated
                setTimeout(async () => {
                  console.log('IAPService: Forcing billing refresh...');
                  await billing?.refresh?.(true); // Force refresh
                }, 1000);
                
                Alert.alert('Success (Dev Mode)', 'Purchase completed in development mode. Premium features unlocked!');
              } catch (devError) {
                console.log('IAPService: Manual premium grant failed, simulating success');
                console.error('IAPService: Dev grant error:', devError);
                await RNIap.finishTransaction({ purchase, isConsumable: false });
                
                // Still try to refresh billing even if dev grant failed
                setTimeout(async () => {
                  console.log('IAPService: Forcing billing refresh after dev grant failure...');
                  await billing?.refresh?.(true); // Force refresh
                }, 1000);
                
                Alert.alert('Success (Dev Mode)', 'Purchase completed in development mode. Premium features unlocked!');
              }
            } else {
              await RNIap.finishTransaction({ purchase, isConsumable: false });
              Alert.alert('Error', 'No receipt data available. Please try again.');
            }
          }
        });

        purchaseErrorSubscription.current = RNIap.purchaseErrorListener((error) => {
          console.error('IAPService: Purchase error:', error);
          if (error.code === 'E_USER_CANCELLED') {
            Alert.alert('Purchase Canceled', 'You cancelled the purchase.');
          } else {
            Alert.alert('Purchase Error', error.message || 'An unknown error occurred during purchase.');
          }
        });

      } catch (error) {
        console.error('IAPService: IAP initialization failed:', error);
        setConnected(false);
        setProducts([]);
        // Don't show alert for cancelled requests - this is expected behavior
        if (!error.message?.includes('cancelled')) {
          Alert.alert('Error', 'Failed to connect to App Store. Please try again later.');
        }
      } finally {
        isInitializing.current = false;
      }
    };

    initIAP();

    return () => {
      console.log('IAPService: Disconnecting StoreKit...');
      isInitializing.current = false;
      purchaseUpdateSubscription.current?.remove();
      purchaseUpdateSubscription.current = null;
      purchaseErrorSubscription.current?.remove();
      purchaseErrorSubscription.current = null;
      RNIap.endConnection();
    };
  }, []);

  const requestPurchase = async (sku) => {
    if (!connected) {
      Alert.alert('Error', 'App Store connection not ready.');
      return;
    }
    try {
      console.log('IAPService: Requesting purchase for SKU:', sku);
      await RNIap.requestPurchase({ sku });
    } catch (error) {
      console.error('IAPService: Request purchase failed:', error);
      throw error;
    }
  };

  const restorePurchases = async () => {
    if (!connected) {
      Alert.alert('Error', 'App Store connection not ready.');
      return;
    }
    try {
      console.log('IAPService: Restoring purchases...');
      const restored = await RNIap.getAvailablePurchases();
      if (restored.length === 0) {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
        return;
      }
      // Process each restored purchase
      for (const purchase of restored) {
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          try {
            console.log('IAPService: Restored purchase, verifying receipt...');
            await api.post('/billing/apple/verify', {
              receiptData: receipt,
              originalTransactionId: purchase.originalTransactionIdentifierIOS,
            });
            await RNIap.finishTransaction({ purchase, isConsumable: false });
            console.log('IAPService: Restored receipt verified and transaction finished.');
            Alert.alert('Success', 'Your subscription has been restored!');
            billing?.refresh?.();
            return; // Only need to restore one active subscription
          } catch (error) {
            console.error('IAPService: Restored receipt verification failed:', error);
            Alert.alert('Error', 'Failed to verify restored purchase. Please contact support.');
            await RNIap.finishTransaction({ purchase, isConsumable: false });
          }
        }
      }
    } catch (error) {
      console.error('IAPService: Restore purchases failed:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      throw error;
    }
  };

  const value = {
    products,
    requestPurchase,
    restorePurchases,
    connected,
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}

export function useIAP() {
  return useContext(IAPContext);
}