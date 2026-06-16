const fs = require('fs');
require('dotenv').config();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
fetch(url + '/realtime/v1/api/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': 'Bearer ' + key
  },
  body: JSON.stringify({
    messages: [{ topic: 'realtime:global_events', event: 'test', payload: {} }]
  })
}).then(r => r.text().then(t => console.log(r.status, r.statusText, t))).catch(console.error);
