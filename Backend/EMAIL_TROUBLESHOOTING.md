# Nodemailer Connection Timeout on Render - Diagnosis & Fixes

## 🔍 Diagnosis

### Root Cause
Nodemailer works locally but fails on Render with connection timeouts due to:

1. **Network/Port Restrictions**: Render may block or throttle outbound SMTP connections, especially to Gmail
2. **Gmail Security**: Gmail often blocks connections from cloud providers without proper app passwords
3. **Missing Timeout Configuration**: No connection timeouts set, causing requests to hang indefinitely
4. **Insufficient Error Logging**: Hard to diagnose issues without detailed error information
5. **Blocking Email Sending**: Email sending blocks HTTP responses, causing user-facing timeouts

### Current Configuration Issues

**File: `Backend/utils/email.utils.js`**

- ✅ Port 587 with `secure: false` (correct for STARTTLS)
- ❌ No connection timeout settings
- ❌ No detailed error logging
- ❌ No connection verification logging
- ❌ Defaults to Gmail which is problematic on cloud platforms

---

## ✅ Fixes Implemented

### 1. Enhanced Email Configuration (`Backend/utils/email.utils.js`)

**Changes Made:**
- ✅ Added connection timeout settings (10s connection, 5s greeting, 10s socket)
- ✅ Added comprehensive logging (without exposing passwords)
- ✅ Added SMTP connection verification with detailed error reporting
- ✅ Improved error messages with specific error codes
- ✅ Added environment variable validation
- ✅ Automatic `secure` flag based on port (465 = true, 587 = false)

**Key Improvements:**
```javascript
connectionTimeout: 10000,  // 10 seconds
greetingTimeout: 5000,     // 5 seconds  
socketTimeout: 10000,      // 10 seconds
```

### 2. Enhanced Error Logging

Now logs:
- SMTP host, port, secure flag (without password)
- Connection duration
- Specific error codes (ETIMEDOUT, EAUTH, ECONNREFUSED)
- Full error stack in development mode
- Message IDs and SMTP responses on success

---

## 🚀 Recommended Actions for Render Deployment

### Option 1: Switch to a Transactional Email Provider (RECOMMENDED)

**Why:** Gmail is not designed for transactional emails and often blocks cloud providers.

**Recommended Providers:**
- **Brevo (formerly Sendinblue)** - Free tier: 300 emails/day
- **SendGrid** - Free tier: 100 emails/day
- **Mailgun** - Free tier: 5,000 emails/month
- **Amazon SES** - Very cheap, pay-as-you-go

#### Example: Brevo Configuration

1. **Sign up at**: https://www.brevo.com
2. **Get SMTP credentials** from Settings → SMTP & API
3. **Set environment variables on Render:**

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM_NAME=WorkZen HRMS
FRONTEND_URL=https://your-frontend.onrender.com
```

#### Example: SendGrid Configuration

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_NAME=WorkZen HRMS
FRONTEND_URL=https://your-frontend.onrender.com
```

### Option 2: Fix Gmail Configuration (If you must use Gmail)

**Requirements:**
1. **Use App Password** (not regular password):
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password for "Mail"
   - Use this 16-character password as `SMTP_PASS`

2. **Set environment variables on Render:**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM_NAME=WorkZen HRMS
FRONTEND_URL=https://your-frontend.onrender.com
```

**Note:** Gmail may still block connections from Render. Consider using a transactional email provider instead.

### Option 3: Use Port 465 with SSL (Alternative)

If port 587 is blocked, try port 465:

```bash
SMTP_HOST=smtp.gmail.com  # or your provider's host
SMTP_PORT=465
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

The code automatically sets `secure: true` when port is 465.

---

## 📋 Environment Variables Checklist for Render

Ensure these are set in your Render dashboard:

### Required Variables:
- ✅ `SMTP_HOST` - SMTP server hostname
- ✅ `SMTP_PORT` - SMTP port (587 or 465)
- ✅ `SMTP_USER` - SMTP username/email
- ✅ `SMTP_PASS` - SMTP password/app password
- ✅ `SMTP_FROM_NAME` - Display name for emails (optional)
- ✅ `FRONTEND_URL` - Your frontend URL for email links

### Other Required Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `CORS_ORIGIN` - Frontend URL for CORS
- `NODE_ENV` - Set to `production` on Render

---

## 🔧 Testing the Fix

### 1. Check Logs on Render

After deployment, check Render logs for:
```
[Email Config] SMTP Configuration: { host, port, secure, ... }
[Email Config] SMTP connection verified successfully
```

If you see connection errors, the logs will now show:
- Exact error code
- Error message
- Connection duration
- SMTP response details

### 2. Test Email Sending

Try registering a new user or creating an employee. Check logs for:
```
[Email] Attempting to send account creation email to: user@example.com
[Email] Account creation email sent successfully to user@example.com in 1234ms
```

### 3. Common Error Codes

- **ETIMEDOUT / ECONNECTIONTIMEOUT**: Port blocked or SMTP server unreachable
- **EAUTH**: Invalid credentials (check SMTP_USER and SMTP_PASS)
- **ECONNREFUSED**: Wrong host/port or firewall blocking
- **EENOTFOUND**: DNS resolution failed (check SMTP_HOST)

---

## 🛡️ Additional Recommendations

### 1. Make Email Sending Non-Blocking (Already Implemented)

The code already catches email errors without blocking the HTTP response. Users will still be created even if email fails.

### 2. Add Email Queue (Future Enhancement)

For production at scale, consider:
- **Bull** or **BullMQ** for job queues
- **Redis** for queue storage
- Retry logic for failed emails
- Email delivery status tracking

### 3. Monitor Email Delivery

- Set up error alerts for email failures
- Track email delivery rates
- Monitor bounce rates

---

## 📝 Summary of Code Changes

### Files Modified:
1. ✅ `Backend/utils/email.utils.js`
   - Added timeout configuration
   - Enhanced error logging
   - Added connection verification
   - Improved error messages

### Next Steps:
1. ✅ Code changes are complete
2. ⏳ Set environment variables on Render
3. ⏳ Test email sending after deployment
4. ⏳ Monitor logs for any issues

---

## 🆘 Still Having Issues?

If emails still fail after these fixes:

1. **Check Render Logs**: Look for `[Email Config]` and `[Email]` log entries
2. **Verify Environment Variables**: Ensure all SMTP_* variables are set correctly
3. **Test SMTP Connection**: Use a tool like `telnet` or `openssl` to test SMTP connectivity
4. **Try Different Provider**: Switch to Brevo/SendGrid if Gmail continues to fail
5. **Check Render Firewall**: Ensure Render allows outbound connections on ports 587/465

---

## 📚 Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Brevo SMTP Setup](https://help.brevo.com/hc/en-us/articles/209467485)
- [SendGrid SMTP Setup](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

