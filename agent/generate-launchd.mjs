#!/usr/bin/env node
// Generates a reviewed launchd file on stdout. Never installs, starts or modifies services.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { escape } from 'node:querystring'

const here = dirname(fileURLToPath(import.meta.url))
const script = resolve(here, 'checkin.mjs')
const xml = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>local.mushi.mac-agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(process.execPath)}</string>
    <string>${xml(script)}</string>
    <string>--watch</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><false/>
  <key>WorkingDirectory</key><string>${xml(resolve(here, '..'))}</string>
</dict>
</plist>`
process.stdout.write(plist + '\n')
