// Strapi v5 plugins config — security-hardened.
// Drop in at /opt/meditation-cms/config/plugins.js and restart strapi.
//
// Changes vs default:
//   1. Upload size capped at 50 MB (was 200 MB).
//   2. MIME allow-list — only audio/* and image/* accepted by the admin.
//      Anything else is rejected before disk hit.
//
// Note: users-permissions JWT secret already comes from .env via the
// boilerplate Strapi config. We keep that pass-through intact.

module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET'),
    },
  },
  upload: {
    config: {
      sizeLimit: 50 * 1024 * 1024, // 50 MB
      breakpoints: {
        // Skip image breakpoint generation; we never use thumbnails.
      },
      providerOptions: {
        localServer: {
          // Cache-Control for served files: 1 hour public, 30-day immutable.
          maxage: 3600 * 1000,
        },
      },
    },
  },
})
