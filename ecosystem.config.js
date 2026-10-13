// PM2 process definitions for both tiers on one instance (US-6.1).
//
// Committed rather than typed on each box, so both instances and the deploy
// job start the application exactly the same way. PM2 restarts either process
// if it exits, and `pm2 startup` makes that survive a reboot.
module.exports = {
  apps: [
    {
      name: 'eventhub-api',
      cwd: './backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '300M',
      time: true,
    },
    {
      name: 'eventhub-web',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        BROWSER: 'none',
      },
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '600M',
      time: true,
    },
  ],
};