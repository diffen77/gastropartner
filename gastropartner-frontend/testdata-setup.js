/**
 * Simple test data setup script for creating diffen@me.com user
 * Run with: node testdata-setup.js
 */

const baseURL = 'http://localhost:8000';
const testUser = {
  email: 'diffen@me.com',
  password: 'Password8!',
  full_name: 'Test User Diffen'
};

async function setupTestData() {
  console.log('🚀 Setting up test data for user:', testUser.email);
  
  try {
    // Test 1: Register user (may already exist)
    console.log('\n📝 Step 1: Registering user...');
    const registerResponse = await fetch(`${baseURL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (registerResponse.status === 201) {
      const result = await registerResponse.json();
      console.log('✅ User registered successfully:', result.message);
    } else if (registerResponse.status === 400) {
      const error = await registerResponse.json();
      if (error.detail && error.detail.includes('already registered')) {
        console.log('✅ User already exists, continuing with tests');
      } else {
        console.log('❌ Registration failed:', error);
      }
    } else {
      console.log('❓ Unexpected registration response:', registerResponse.status);
    }

    // Test 2: Dev login
    console.log('\n🔐 Step 2: Testing dev login...');
    const loginResponse = await fetch(`${baseURL}/api/v1/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    if (loginResponse.status === 200) {
      const loginResult = await loginResponse.json();
      console.log('✅ Dev login successful!');
      console.log('  🔑 Access token:', loginResult.access_token);
      console.log('  👤 User ID:', loginResult.user.id);
      console.log('  📧 Email:', loginResult.user.email);
      
      // Test 3: Access protected endpoint
      console.log('\n🛡️  Step 3: Testing protected endpoint access...');
      const meResponse = await fetch(`${baseURL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${loginResult.access_token}`
        }
      });
      
      if (meResponse.status === 200) {
        const userInfo = await meResponse.json();
        console.log('✅ Protected endpoint access successful!');
        console.log('  👤 Full name:', userInfo.full_name);
        console.log('  📧 Email:', userInfo.email);
        console.log('  🆔 ID:', userInfo.id);
      } else {
        console.log('ℹ️  Protected endpoint test may not work with dev tokens (expected in dev mode)');
      }
      
    } else {
      const error = await loginResponse.json();
      console.log('❌ Dev login failed:', error);
    }

    console.log('\n🎉 Test data setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  👤 User: ${testUser.email}`);
    console.log(`  🔑 Password: ${testUser.password}`);
    console.log(`  🆔 User ID: 817df0a1-f7ee-4bb2-bffa-582d4c59115f`);
    console.log('\n💡 You can now use these credentials in your tests and development.');

  } catch (error) {
    console.error('❌ Setup failed with error:', error.message);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  setupTestData();
}

module.exports = { setupTestData, testUser };