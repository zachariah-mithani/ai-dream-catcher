import 'dotenv/config';
import { db } from './src/database.js';

async function upgradeToPremium(email) {
  try {
    console.log(`Upgrading user ${email} to premium...`);
    
    // Find user by email
    const user = await db.prepare('SELECT id, email, plan FROM users WHERE email = ?').get(email);
    
    if (!user) {
      console.error('❌ User not found with email:', email);
      return;
    }
    
    console.log(`Found user: ${user.email} (ID: ${user.id})`);
    console.log(`Current plan: ${user.plan}`);
    
    // Set trial end to 1 year from now
    const trialEnd = new Date();
    trialEnd.setFullYear(trialEnd.getFullYear() + 1);
    
    // Update user to premium with 1 year trial
    await db.prepare('UPDATE users SET plan = ?, trial_end = ? WHERE id = ?')
      .run('premium', trialEnd.toISOString(), user.id);
    
    const updated = await db.prepare('SELECT plan, trial_end FROM users WHERE id = ?').get(user.id);
    
    console.log('✅ Successfully upgraded to premium!');
    console.log(`New plan: ${updated.plan}`);
    console.log(`Trial ends: ${updated.trial_end}`);
    console.log('\n🎉 You now have premium access for 1 year!');
    
  } catch (error) {
    console.error('❌ Error upgrading user:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node upgrade-to-premium.js <email>');
  console.log('Example: node upgrade-to-premium.js your-email@example.com');
  process.exit(1);
}

upgradeToPremium(email);
