# Deployment Guide — LogicalJupiter

## 1. Supabase Setup

1. Create a project at https://supabase.com
2. Open **SQL Editor** and run `supabase/schema.sql` in full.
3. In **Project Settings → API** copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In **Authentication → Email** enable email/password sign-in.
5. Create the first admin user:
   - Add a user via **Authentication → Users → Add user**.
   - Then run in SQL Editor:
     ```sql
     UPDATE profiles SET role = 'admin', full_name = 'Your Name'
     WHERE id = '<user-uuid>';
     ```

## 2. Server — First-time Setup (Ubuntu 22.04)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx
```

## 3. Deploy the App

```bash
cd /home/rafa/LogicalJupiter

# Copy the example env file and fill in your values
cp .env.local.example .env.local
nano .env.local          # paste Supabase URL + anon key

# Install dependencies and build
npm install
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup              # follow the printed command to enable autostart
```

## 4. Nginx + HTTPS

```bash
# Copy the nginx config
sudo cp nginx.conf /etc/nginx/sites-available/logicaljupiter
# Edit to set your real domain
sudo nano /etc/nginx/sites-available/logicaljupiter

# Enable the site
sudo ln -s /etc/nginx/sites-available/logicaljupiter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue an SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com
```

Certbot will modify the nginx config to add HTTPS automatically.

## 5. Subsequent Deployments

```bash
cd /home/rafa/LogicalJupiter
git pull                 # or copy files manually
npm install
npm run build
pm2 restart logicaljupiter
```

## 6. Managing Users

Users can only be created through the Supabase dashboard (**Authentication → Users → Add user**).  
To promote a user to admin, run in SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
```

To demote back to employee:

```sql
UPDATE profiles SET role = 'employee' WHERE id = '<user-uuid>';
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
