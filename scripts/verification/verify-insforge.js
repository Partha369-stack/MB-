// Quick InsForge Connection Test
// Run this in your browser console or as a standalone script

import { insforge } from './src/lib/insforge';

async function quickTest() {
    console.log('🔍 Testing InsForge Connection...\n');

    try {
        // Test 1: Database Connection
        console.log('1️⃣ Testing Database Connection...');
        const { data: profiles, error: profileError } = await insforge.database
            .from('profiles')
            .select('*')
            .limit(1);

        if (profileError) {
            console.error('❌ Database Error:', profileError);
            return false;
        }
        console.log('✅ Database Connected! Found', profiles?.length || 0, 'profiles\n');

        // Test 2: Storage Access
        console.log('2️⃣ Testing Storage Access...');
        const { data: buckets, error: storageError } = await insforge.storage.listBuckets();

        if (storageError) {
            console.error('❌ Storage Error:', storageError);
            return false;
        }
        console.log('✅ Storage Accessible! Found', buckets?.length || 0, 'buckets\n');

        // Test 3: Auth Check
        console.log('3️⃣ Testing Auth Service...');
        const { data: sessionData } = await insforge.auth.getCurrentSession();
        console.log('✅ Auth Service Working!');
        console.log('   Session:', sessionData.session ? 'Active' : 'No active session\n');

        console.log('🎉 All tests passed! InsForge is working correctly!\n');
        return true;

    } catch (error) {
        console.error('❌ Test Failed:', error);
        return false;
    }
}

// Run the test
quickTest().then(success => {
    if (success) {
        console.log('✅ InsForge Setup: VERIFIED');
    } else {
        console.log('❌ InsForge Setup: FAILED - Check configuration');
    }
});
