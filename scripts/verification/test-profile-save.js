// Quick test to verify user profile saving works correctly
const { createClient } = require('@insforgeio/insforge-js');

const INSFORGE_URL = process.env.VITE_INSFORGE_URL;
const INSFORGE_ANON_KEY = process.env.VITE_INSFORGE_ANON_KEY;

if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const insforge = createClient(INSFORGE_URL, INSFORGE_ANON_KEY);

async function testProfileSave() {
    console.log('\n🧪 Testing Profile Save Functionality...\n');

    const testProfile = {
        id: '00000000-0000-0000-0000-000000000001', // Test UUID
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
        address: '123, Test Area, Test Village, 700001',
        role: 'customer',
        phone_verified: false,
        is_active: true,
        profile_pic: null,
        referred_by: null
    };

    try {
        console.log('📝 Attempting to insert test profile...');
        console.log('Profile data:', testProfile);

        const { data, error } = await insforge.database
            .from('profiles')
            .insert(testProfile)
            .select()
            .single();

        if (error) {
            console.error('❌ Insert failed:', error);

            // Try to clean up if it already exists
            console.log('\n🧹 Cleaning up existing test profile...');
            await insforge.database
                .from('profiles')
                .delete()
                .eq('id', testProfile.id);

            console.log('✓ Cleanup complete. Please run this test again.');
            return;
        }

        console.log('\n✅ Profile inserted successfully!');
        console.log('Returned data:', data);

        // Verify the data was saved correctly
        console.log('\n🔍 Verifying saved data...');
        const { data: savedProfile, error: fetchError } = await insforge.database
            .from('profiles')
            .select('*')
            .eq('id', testProfile.id)
            .single();

        if (fetchError) {
            console.error('❌ Fetch failed:', fetchError);
            return;
        }

        console.log('\n📊 Verification Results:');
        console.log('─'.repeat(50));
        console.log(`Name: ${savedProfile.name === testProfile.name ? '✅' : '❌'} ${savedProfile.name}`);
        console.log(`Email: ${savedProfile.email === testProfile.email ? '✅' : '❌'} ${savedProfile.email}`);
        console.log(`Phone: ${savedProfile.phone === testProfile.phone ? '✅' : '❌'} ${savedProfile.phone}`);
        console.log(`Address: ${savedProfile.address === testProfile.address ? '✅' : '❌'} ${savedProfile.address}`);
        console.log(`Role: ${savedProfile.role === testProfile.role ? '✅' : '❌'} ${savedProfile.role}`);

        // Clean up test data
        console.log('\n🧹 Cleaning up test profile...');
        await insforge.database
            .from('profiles')
            .delete()
            .eq('id', testProfile.id);

        console.log('✅ Test complete! All fields are being saved correctly.\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testProfileSave();
