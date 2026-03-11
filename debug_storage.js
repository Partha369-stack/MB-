
const { createClient } = require('@insforge/sdk');

const insforge = createClient({
  baseUrl: 'https://i7gc3cqb.ap-southeast.insforge.app',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTM3Nzh9.hE_SwG_E8UoF8FnODFEaDv_HGHtkDOf1bUl1Q_PAbKs'
});

async function debug() {
  const { data: orders, error: oErr } = await insforge.database.from('orders').select('*');
  console.log('Orders:', orders?.length, oErr);
  const { data: profiles, error: pErr } = await insforge.database.from('profiles').select('*');
  console.log('Profiles:', profiles?.length, pErr);
}

debug();
