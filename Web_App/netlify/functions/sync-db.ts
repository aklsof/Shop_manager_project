import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const { next_run } = await req.json();
  console.log(`[SYNC CRON] Starting scheduled sync. Next run scheduled for: ${next_run}`);

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.URL || 'localhost:3000';
  const url = `${protocol}://${host}/api/admin/sync`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.SYNC_SECRET || ''}`
      }
    });

    if (!res.ok) {
        const error = await res.text();
        console.error(`[SYNC CRON ERROR] Failed: ${res.status} - ${error}`);
    } else {
        console.log(`[SYNC CRON OK] Sync completed successfully.`);
    }
  } catch (err) {
    console.error(`[SYNC CRON FAILED] Connection error:`, err);
  }
};

export const config: Config = {
  schedule: "*/2 * * * *", // Run every 2 minutes
};
