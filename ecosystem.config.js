module.exports = {
  apps: [
    {
      name: 'logicaljupiter',
      script: './node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/rafa/LogicalJupiter',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
}
