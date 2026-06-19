// Server-side broadcast via Supabase REST API
// Uses non-blocking fire-and-forget to avoid stalling Server Actions.

export async function broadcast(event: string, payload: object = {}) {
  const channels = ["big_shift_timer", "global_events", "leaderboard_page_refresh"];
  console.log(`[BROADCAST SENT] Event: ${event}, PayloadAction: ${(payload as any)?.action}`);
  
  const broadcastTask = Promise.allSettled(
    channels.map(channel =>
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            "x-api-key": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            messages: [{ topic: channel, event, payload }],
          }),
        }
      ).then(res => res.text().then(text => console.log(`[BROADCAST RESPONSE] ${channel}: ${res.status} - ${text}`)))
    )
  );

  await broadcastTask;

  // Since we're in Next.js, we just let the Promise run in the background.
  // In Next.js 15+ we could use `unstable_after` or `waitUntil`.
  // For standard environments without these, we just don't await the task.
}
