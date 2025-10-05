import Stripe from 'stripe';
import 'dotenv/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createTestCoupon() {
  try {
    console.log('Creating test coupon for free premium access...');
    
    // Create a 100% discount coupon
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: 'forever', // or 'once' for single use
      name: 'Developer Test Coupon',
      metadata: {
        purpose: 'testing',
        created_by: 'developer'
      }
    });
    
    console.log('✅ Coupon created successfully!');
    console.log(`Coupon ID: ${coupon.id}`);
    console.log(`Discount: ${coupon.percent_off}% off`);
    console.log(`Duration: ${coupon.duration}`);
    
    // Create a promotion code for easier use
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: 'DEV100FREE', // Easy to remember code
      max_redemptions: 10, // Limit to 10 uses
      metadata: {
        purpose: 'developer_testing'
      }
    });
    
    console.log('\n🎉 Promotion code created!');
    console.log(`Code: ${promotionCode.code}`);
    console.log(`Max redemptions: ${promotionCode.max_redemptions}`);
    console.log(`Active: ${promotionCode.active}`);
    
    console.log('\n📱 How to use:');
    console.log('1. Go to upgrade in your app');
    console.log('2. During checkout, enter the code: DEV100FREE');
    console.log('3. You\'ll get 100% discount on your subscription!');
    
    return { coupon, promotionCode };
    
  } catch (error) {
    console.error('❌ Error creating coupon:', error.message);
    throw error;
  }
}

// Also create a shorter-term test coupon
async function createTrialCoupon() {
  try {
    console.log('\nCreating trial extension coupon...');
    
    // Create a coupon that gives 30 days free trial
    const trialCoupon = await stripe.coupons.create({
      amount_off: null,
      percent_off: 100,
      duration: 'once',
      duration_in_months: 1, // 1 month free
      name: 'Extended Trial - Developer',
      metadata: {
        purpose: 'extended_trial_testing'
      }
    });
    
    const trialPromoCode = await stripe.promotionCodes.create({
      coupon: trialCoupon.id,
      code: 'TRIAL30DEV',
      max_redemptions: 5,
      metadata: {
        purpose: 'extended_trial'
      }
    });
    
    console.log('✅ Trial coupon created!');
    console.log(`Code: ${trialPromoCode.code}`);
    console.log(`Duration: ${trialCoupon.duration_in_months} month free`);
    
    return { trialCoupon, trialPromoCode };
    
  } catch (error) {
    console.error('❌ Error creating trial coupon:', error.message);
  }
}

async function main() {
  try {
    await createTestCoupon();
    await createTrialCoupon();
    
    console.log('\n🚀 Test coupons ready! Use these codes in your app:');
    console.log('- DEV100FREE: 100% off forever');
    console.log('- TRIAL30DEV: 30 days free trial');
    
  } catch (error) {
    console.error('Failed to create coupons:', error);
    process.exit(1);
  }
}

main();
