/**
 * Quick verification script for diffen@me.com test user
 * Run with: node verify-testdata.js
 */

const testUser = {
  email: 'diffen@me.com',
  password: 'Password8!',
  userId: '817df0a1-f7ee-4bb2-bffa-582d4c59115f'
};

async function verifyTestData() {
  console.log('🔍 Verifying test data for:', testUser.email);
  
  try {
    // Test dev login
    const loginResponse = await fetch('http://localhost:8000/api/v1/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    if (loginResponse.status === 200) {
      const result = await loginResponse.json();
      console.log('✅ Login successful!');
      console.log('  🔑 Token:', result.access_token);
      console.log('  👤 User ID:', result.user.id);
      console.log('  📧 Email:', result.user.email);
      
      // Verify user ID matches expected
      if (result.user.id === testUser.userId) {
        console.log('✅ User ID matches expected value');
      } else {
        console.log('⚠️  User ID does not match expected:', testUser.userId);
      }
      
      console.log('\n🎯 Test data is ready for use!');
      console.log('📋 Credentials for testing:');
      console.log(`  Email: ${testUser.email}`);
      console.log(`  Password: ${testUser.password}`);
      console.log(`  User ID: ${testUser.userId}`);
      
    } else {
      const error = await loginResponse.json();
      console.log('❌ Login failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

if (require.main === module) {
  verifyTestData();
}

module.exports = { verifyTestData, testUser };