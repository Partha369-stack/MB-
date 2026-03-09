
import { createClient } from '@insforge/sdk';

const supabaseUrl = import.meta.env.VITE_INSFORGE_URL;
const supabaseKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing InsForge URL or Key');
}

export const insforge = createClient({
    baseUrl: supabaseUrl,
    anonKey: supabaseKey
});
