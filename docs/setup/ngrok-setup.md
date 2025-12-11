# Ngrok Setup for Local Development

## Step 1: Create Ngrok Account (if you don't have one)

1. Go to https://dashboard.ngrok.com/signup
2. Sign up for a free account
3. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken

## Step 2: Configure Ngrok

Run this command (replace `YOUR_AUTHTOKEN` with your actual token):

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

## Step 3: Start Ngrok Tunnel

In a separate terminal, run:

```bash
ngrok http 3002
```

This will start ngrok and give you an HTTPS URL like:
```
https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

## Step 4: Update Environment Variables

Add/update in your `.env.local`:

```env
NEXT_PUBLIC_ZID_REDIRECT_URI=https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback
```

**Important:** Replace `xxxx-xx-xx-xx-xx` with your actual ngrok URL.

## Step 5: Update Zid App Settings

In Zid Partner Dashboard:
- **Redirection URL**: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback`
- **Callback URL**: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback`

## Step 6: Start Your Dev Server

Make sure your Next.js dev server is running on port 3002:

```bash
npm run dev
```

## Notes

- The ngrok URL changes every time you restart ngrok (unless you have a paid plan with a static domain)
- Keep ngrok running in a separate terminal while developing
- You'll need to update the Zid redirect URI in their dashboard if the ngrok URL changes

