# Mullvad VPN Integration (SOCKS5)

OFFGRID includes a built-in integration for Mullvad VPN to anonymize web-dependent AI tasks.

## Overview

When the AI assistant needs to search the web or read the content of a URL, it creates an external footprint. To protect your privacy and anonymize this footprint, OFFGRID can route these specific requests through Mullvad's local SOCKS5 proxy.

## How it Works

1.  **App-Specific Routing**: Unlike a system-wide VPN that routes all your computer's traffic, this integration specifically targets the requests made by the OFFGRID assistant (Web Search and URL Fetching).
2.  **Local Proxy**: It connects to Mullvad's internal SOCKS5 proxy at `10.64.0.1:1080`. This is a standard feature of the Mullvad VPN client.
3.  **Encrypted Tunnel**: The traffic is encrypted and routed through a Mullvad exit node, masking your real IP address from the websites the AI visits.

## Prerequisites

- **Mullvad VPN Client**: You must have the Mullvad VPN app installed on your machine.
- **Active Connection**: You must be connected to a Mullvad server for the proxy to be reachable.

## Setup

1.  Open the **Settings** panel in OFFGRID.
2.  Find the **Network & Privacy** section.
3.  Toggle **Mullvad SOCKS5 Proxy** to **ON**.
4.  Check the status indicator:
    - **Protected (Mullvad)**: Everything is working correctly.
    - **Not Protected**: The proxy is reachable, but the exit node is not recognized as Mullvad.
    - **Proxy Error**: The proxy is unreachable (ensure Mullvad is running and connected).

## Technical Details

- **Implementation**: Uses `socks-proxy-agent` in the Electron main process.
- **Verification**: Uses `https://am.i.mullvad.net/json` to verify the protection status.
- **Scope**: Currently covers DuckDuckGo web searches and general URL fetching via the assistant's tools.
