module.exports = {
  "/api": {
    target: process.env.CRM_API_PROXY_TARGET || "http://127.0.0.1:3000",
    secure: false,
    changeOrigin: true
  }
};
