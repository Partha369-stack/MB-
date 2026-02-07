// Helper script to find user password
// Run this in the browser console on your application page

const users = JSON.parse(localStorage.getItem('mb_all_users') || '[]');
const targetUser = users.find(u => u.phone === '7894561235' || u.name === 'Sale-1');

if (targetUser) {
    console.log('=== USER FOUND ===');
    console.log('Name:', targetUser.name);
    console.log('Phone:', targetUser.phone);
    console.log('Password:', targetUser.password);
    console.log('Role:', targetUser.role);
    console.log('ID:', targetUser.id);
    console.log('==================');
} else {
    console.log('User not found. Here are all users:');
    users.forEach(u => {
        console.log(`- ${u.name} (${u.phone}) - Role: ${u.role}`);
    });
}
