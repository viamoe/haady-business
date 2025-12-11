# Zid Redirect URI Configuration

## Current Ngrok URL
```
https://afton-uncarnivorous-lorinda.ngrok-free.dev
```

## Required Configuration

### 1. Update `.env.local`

Add or update this line:
```env
NEXT_PUBLIC_ZID_REDIRECT_URI=https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
```

### 2. Update Zid Partner Dashboard

Go to your Zid app settings and set:

**Redirection URL:**
```
https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
```

**Callback URL:**
```
https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
```

## Important Notes

⚠️ **The ngrok URL will change** when you restart ngrok (unless you have a paid plan with a static domain).

If the URL changes:
1. Update `.env.local` with the new URL
2. Update Zid Partner Dashboard with the new URL
3. Restart your Next.js dev server

## Testing

After updating both places:
1. Make sure ngrok is running
2. Make sure your Next.js dev server is running on port 3002
3. Try the Zid OAuth flow again
4. Check the browser console and server logs for any errors

