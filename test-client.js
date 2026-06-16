const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const channel = supabase.channel('global_events')
  .on('broadcast', { event: 'round_state_change' }, (payload) => {
    console.log('[CLIENT RECEIVED] Broadcast Payload:', payload);
    process.exit(0);
  })
  .subscribe(async (status) => {
    console.log('[CLIENT STATUS]', status);
    if (status === 'SUBSCRIBED') {
      // Now send via REST
      console.log('Sending via REST...');
      const res = await fetch(supabaseUrl + '/realtime/v1/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey
        },
        body: JSON.stringify({
          messages: [{ topic: 'realtime:global_events', event: 'round_state_change', payload: { action: 'test' } }]
        })
      });
      console.log('[REST RESPONSE]', res.status, await res.text());
    }
  });

setTimeout(() => {
  console.log('Timeout. Did not receive broadcast.');
  process.exit(1);
}, 5000);
