// Test script to verify dual profile saving
const { createClient } = require('@insforgeio/insforge-js');

const INSFORGE_URL = process.env.VITE_INSFORGE_URL;
const INSFORGE_ANON_KEY = process.env.VITE_INSFORGE_ANON_KEY;

if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const insforge = createClient(INSFORGE_URL, INSFORGE_ANON_KEY);

async function verifyDualSave() {
    console.log('\n🔍 Checking if profiles are saved in BOTH locations...\n');

    try {
        // Check auth.users.profile (JSONB)
        console.log('1️⃣ Checking auth.users.profile (InsForge auth system)...');
        const { rows: authUsers } = await insforge.database.raw(`
      SELECT id, email, profile->>'name' as name, profile->>'phone' as phone, profile->>'address' as address
      FROM auth.users 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

        console.log('\n📊 auth.users.profile:');
        console.log('─'.repeat(80));
        authUsers.forEach((user, i) => {
            console.log(`${i + 1}. ${user.name || 'NULL'}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Phone: ${user.phone || 'NULL'}`);
            console.log(`   Address: ${user.address || 'NULL'}`);
            console.log('');
        });

        // Check public.profiles table
        console.log('2️⃣ Checking public.profiles table (App database)...');
        const { rows: publicProfiles } = await insforge.database.raw(`
      SELECT id, name, email, phone, address, profile_pic
      FROM profiles 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

        console.log('\n📊 public.profiles:');
        console.log('─'.repeat(80));
        if (publicProfiles.length === 0) {
            console.log('❌ NO DATA FOUND - public.profiles table is empty!');
        } else {
            publicProfiles.forEach((profile, i) => {
                console.log(`${i + 1}. ${profile.name || 'NULL'}`);
                console.log(`   Email: ${profile.email || 'NULL'}`);
                console.log(`   Phone: ${profile.phone || 'NULL'}`);
                console.log(`   Address: ${profile.address || 'NULL'}`);
                console.log(`   Profile Pic: ${profile.profile_pic ? 'Yes' : 'No'}`);
                console.log('');
            });
        }

        // Compare the two
        console.log('\n🔄 Comparison:');
        console.log('─'.repeat(80));
        if (publicProfiles.length === 0) {
            console.log('⚠️  WARNING: public.profiles table is empty!');
            console.log('   Data is only in auth.users.profile');
            console.log('   This means the dual save is NOT working yet.');
        } else if (authUsers.length === publicProfiles.length) {
            console.log('✅ Both tables have the same number of records');
            console.log(`   ${authUsers.length} users found in each location`);
        } else {
            console.log('⚠️  Record count mismatch:');
            console.log(`   auth.users: ${authUsers.length} records`);
            console.log(`   public.profiles: ${publicProfiles.length} records`);
        }

        console.log('\n✅ Verification complete!\n');

    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

verifyDualSave();
