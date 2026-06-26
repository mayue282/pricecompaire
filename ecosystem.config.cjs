{
  "apps": [
    {
      "name": "productprice",
      "script": "server.mjs",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "NODE_ENV": "production",
        "HOST": "0.0.0.0",
        "PORT": "3000",
        "TRUST_PROXY": "1",
        "CACHE_TTL_MS": "300000",
        "RATE_LIMIT_MAX": "30"
      }
    }
  ]
}
