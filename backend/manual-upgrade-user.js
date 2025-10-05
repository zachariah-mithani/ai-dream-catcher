import 'dotenv/config';
import { db } from './src/database.js';

async function upgradeUserToPremium(email, months = 12) {
  try {
    console.log(`Upgrading user ${email} to premium for ${months} months...`);
    
    // Find user by email
    const user = await db.prepare('SELECT id, email, plan FROM users WHERE email = ?').get(email);
    
    if (!user) {
      console.error('❌ User not found with email:', email);
      return;
    }
    
    console.log(`Found user: ${user.email} (ID: ${user.id})`);
    console.log(`Current plan: ${user.plan}`);
    
    // Set trial end to specified months from now
    const trialEnd = new Date();
    trialEnd.setMonth(trialEnd.getMonth() + months);
    
    // Update user to premium with extended trial
    await db.prepare('UPDATE users SET plan = ?, trial_end = ? WHERE id = ?')
      .run('premium', trialEnd.toISOString(), user.id);
    
    const updated = await db.prepare('SELECT plan, trial_end FROM users WHERE id = ?').get(user.id);
    
    console.log('✅ Successfully upgraded to premium!');
    console.log(`New plan: ${updated.plan}`);
    console.log(`Premium until: ${updated.trial_end}`);
    console.log('\n🎉 You now have premium access!');
    console.log('\n📱 Your app should now show:');
    console.log('- ✅ Premium status in settings');
    console.log('- ✅ Unlimited AI analysis');
    console.log('- ✅ Unlimited chat messages');
    console.log('- ✅ Advanced features unlocked');
    
  } catch (error) {
    console.error('❌ Error upgrading user:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];
const months = parseInt(process.argv[3]) || 12;

if (!email) {
  console.log('Usage: node manual-upgrade-user.js <email> [months]');
  console.log('Example: node manual-upgrade-user.js your-email@example.com 12');
  process.exit(1);
}

upgradeUserToPremium(email, months);
