# Control secret rotation

Daily (or on-demand) Onion **control token** rotation for remote dashboard unlock.

## Format

- `word` + `digits` + `word`
- Max **10** ASCII characters
- Examples: `cat7dog`, `sea12oak`

## On demand

```bash
pnpm rotate
# same as: onion rotate
```

This will:

1. Generate a new secret  
2. Save `controlAuthMode=token` + `controlToken` to `~/.onion-bridge/web.json`  
3. Ensure web + Tailscale Serve are up (`onion up`)  
4. Print **URL + secret** once to the terminal  

Skip starting web/Serve:

```bash
onion rotate --no-up
```

## Daily (macOS launchd)

Sample plist (default **10:00**, Kakao notify):

[`docs/launchd/com.onion-bridge.rotate.plist`](launchd/com.onion-bridge.rotate.plist)

```bash
# 1) Copy
cp docs/launchd/com.onion-bridge.rotate.plist ~/Library/LaunchAgents/

# 2) Edit REPO path / pnpm path inside the plist if needed
#    (sample uses /Users/doh/workspace/Onion-Bridge and nvm pnpm)

# 3) Load
launchctl load ~/Library/LaunchAgents/com.onion-bridge.rotate.plist

# Check
launchctl list | grep onion
tail -f /tmp/onion-rotate.log

# Unload
launchctl unload ~/Library/LaunchAgents/com.onion-bridge.rotate.plist
```

Requires prior `onion kakao login` and a working Tailscale Serve setup.

## LLM later

Rotate/handoff go through ports (`SecretGeneratorPort`, `HandoffNotifierPort`, `IntentPort`, `LifecyclePort`).  
v1 is CLI/rules; a later SpaceXAI intent adapter can call the same rotate/up/stop tools.
