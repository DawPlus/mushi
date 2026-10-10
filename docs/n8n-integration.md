# Optional n8n integration

Mushi's Automation menu is a disabled placeholder until a private n8n instance is configured and verified. n8n is **not** installed or running as part of Mushi.

## Local setup (future)

1. Operate an n8n instance in a trusted environment, and confirm its actual API and webhook support against the installed n8n version.
2. In the server-only Mushi API environment, configure `N8N_BASE_URL` and `N8N_API_KEY`. Use an HTTPS API endpoint. Never add the API key, webhook signing secrets, or internal management URL to `VITE_*` variables or React bundles.
3. Add a server-side adapter **only after** an authenticated owner API route and explicit allowed workflow actions are defined. The browser calls Mushi, not n8n directly.
4. Test with n8n unavailable: authentication, dashboard, Monitor and other Shell menus must remain operational. Keep the Automation menu disabled until the integration is tested.
5. For webhooks, authenticate requests independently, verify an agreed signature/replay policy, and ensure idempotent processing before enabling externally accessible endpoints.

## Scope and safety

No n8n API calls, workflow execution, webhook registration or credentials are included in this scaffold. Deployment credentials are not shared with other services. The adapter should redact execution data and errors before returning anything to the UI. Avoid high-frequency polling and unlimited background execution.
