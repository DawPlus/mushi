# Remote access (Tailscale Serve)

Use Onion Bridge from outside the home on **your** devices, without opening router ports or binding Onion to `0.0.0.0`.

```text
[phone / laptop on Tailscale]
        │
        ▼
 Tailscale Serve  (https://<home-pc>.<tailnet>.ts.net/)
        │
        ▼
 127.0.0.1:3847  onion web   (dashboard + control API)
 127.0.0.1:<mcp> onion       (MCP /mcp)
```

**Primary path:** Tailscale Serve → localhost.  
**Not required:** Cloudflare.  
**Separate path:** ChatGPT + OpenAI Secure MCP Tunnel (unchanged; Tailscale does not replace it).

---

Daily control-secret rotation: see `docs/SECRET_ROTATION.md` (`pnpm rotate`).

## Safety checklist (do this first)

1. On the home PC, run `onion web` and open `http://127.0.0.1:3847/settings`.
2. Set **Control auth mode** = `token`.
3. Set a strong **Control token** and save.
4. Confirm lock works: reload → unlock screen → enter the same Control token.
5. For MCP used over Tailscale, keep MCP auth at `token` (`ONION_BRIDGE_AUTH_MODE`). Do not use `none` for remote.

Env alternatives:

```bash
export ONION_CONTROL_AUTH_MODE=token
export ONION_CONTROL_TOKEN='…'          # web control API

export ONION_BRIDGE_AUTH_MODE=token     # MCP
# ONION_BRIDGE_TOKEN comes from the profile unless overridden
```

---

## One-time Tailscale setup

1. Install Tailscale on the **home PC** and the **client** (phone/laptop).
2. Log both into the same tailnet.
3. **Enable Serve** for the tailnet (admin). First `pnpm serve` may print a
   `https://login.tailscale.com/f/serve?...` link — open it, enable Serve, then retry.
4. On the home PC, leave Onion bound to localhost (default). Do not change listen address for remote access.

---

## Run on the home PC

```bash
# Terminal A — dashboard
onion web

# Terminal B — MCP bridge (profile as needed)
onion
# or: onion start <profile>
```

Turn on web Serve from the repo (preferred):

```bash
# keep onion web running in another terminal
pnpm serve
# same as: onion serve
```

Or print copy-paste commands (web + MCP ports):

```bash
pnpm remote
# same as: onion remote
```

Typical raw commands (ports may differ):

```bash
# Web UI → https://<magicdns>/
tailscale serve --bg http://127.0.0.1:3847

# MCP profile on local 3737 → https://<magicdns>:8443/mcp
tailscale serve --bg --https=8443 http://127.0.0.1:3737

tailscale serve status
```

`<magicdns>` looks like `home-mac.tailnet-name.ts.net` (see `tailscale status` / `tailscale serve status`).

---

## Connect from outside

### Web dashboard (browser)

1. Join Tailscale on the client device.
2. Open the HTTPS URL from `tailscale serve status` (or `https://<home-magicdns>/`).
3. Enter the **Control token** on the unlock screen.
4. Use the dashboard as usual.

### MCP (non-ChatGPT clients)

Point the MCP client at:

```text
https://<home-magicdns>:8443/mcp
```

(Use the HTTPS port you chose in `onion remote`.)

Send MCP auth:

- `token` mode: `Authorization: Bearer <profile-or-ONION_BRIDGE_TOKEN>`

ChatGPT should keep using **OpenAI Secure MCP Tunnel**, not this Tailscale URL.

---

## Verify

| Check | Expect |
|-------|--------|
| Home: `curl -s http://127.0.0.1:3847/api/health` | `{"status":"ok"}` |
| Home: `curl -s http://127.0.0.1:3847/api/auth` | `mode:"token","required":true` |
| Client browser: Serve URL | Unlock screen, then dashboard |
| Client: dashboard without token | Unauthorized / unlock prompt |
| `tailscale serve status` | Handlers point at `127.0.0.1` ports |

---

## Failure modes

| Symptom | Likely cause |
|---------|----------------|
| Client cannot open URL | Home PC asleep/off; Tailscale not running; different tailnet |
| Connection refused | `onion web` / bridge not running; Serve not started; wrong port |
| Unlock loop / Unauthorized | Wrong **Control token**; still on `local` mode; old UI cache — hard refresh |
| MCP 401 | Missing/wrong MCP bearer; using wrong token by mistake |
| Only works on home LAN | Hitting `127.0.0.1` on the client, or LAN IP instead of MagicDNS/Serve URL |
| Serve URL works then dies | `tailscale serve reset` was run; home PC restarted without `--bg` serve |

Stop serving:

```bash
tailscale serve reset
```

---

## Funnel (not default)

Tailscale **Funnel** publishes to the public internet. Do not enable it for Onion unless you intentionally accept that risk. If you ever use Funnel, control + MCP auth are mandatory.

---

## Appendix: Cloudflare Tunnel (optional)

If you need a public HTTPS hostname instead of Tailscale:

1. Keep Onion on localhost.
2. Run `cloudflared tunnel` (or Quick Tunnel) proxying to `http://127.0.0.1:3847` (and a second ingress for MCP if needed).
3. Still require **control token** and MCP `token`.
4. Treat the hostname as sensitive; anyone with the URL can reach the proxy.

Cloudflare is **not** required for the home-away phone/laptop case; Tailscale Serve is preferred.

---

## Related tickets

- `T-261005-01` — MCP auth (`none` / `token`; oauth path later removed)
- `T-261005-03` — Web control auth (`local` / `token`)
- `T-261005-04` — This remote access path
