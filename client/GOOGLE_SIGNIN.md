# Google Sign-In setup (Nexlogs)

`Error 400: origin_mismatch` means the **exact URL in the browser** is not listed under **Authorized JavaScript origins** in Google Cloud.

## Authorized JavaScript origins (add all)

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your **Web client** → add:

```
http://localhost:5173
https://nexlogs.store
https://www.nexlogs.store
https://nex-logs-client.vercel.app
```

Rules:
- No trailing slash (`https://nexlogs.store/` is wrong)
- Must match the browser address bar exactly (`www` vs non-`www` are different)
- Wait **5–10 minutes** after saving before testing again

## Authorized redirect URIs (optional for new flow)

The app uses Google Identity Services + `signInWithIdToken` (no Supabase redirect). These are still useful for email links:

```
http://localhost:5173/auth/callback
https://nexlogs.store/auth/callback
https://www.nexlogs.store/auth/callback
```

You can remove `https://opmjctjzwkvwsxenddfi.supabase.co/auth/v1/callback` if you no longer use Supabase OAuth redirect.

## Supabase

Keep **Google provider ON** with the **same Client ID and Client Secret** as Google Cloud.

## Vercel

```env
VITE_GOOGLE_CLIENT_ID=590259061829-ffs6dg5ae1fuqtpu6pfqjq9h674hrmgo.apps.googleusercontent.com
```

Redeploy after adding.

## OAuth consent screen

If the app is in **Testing** mode, add your Gmail under **Test users** or publish the app.
