# Privacy Policy

**Effective Date:** February 1, 2026

## Overview

The ProTour MCP Server is a **read-only API** that provides access to publicly available Pokémon TCG tournament data. This service does not collect, store, or process any personal information from API users.

## Data We Provide

This API serves publicly available tournament data including:
- Match results from public tournaments
- Deck lists submitted by tournament participants
- Player names as published in official tournament results
- Aggregated statistics and archetype information

**Source:** All data originates from public tournament results published at melee.gg.

## Data We Do NOT Collect

This API does **not** collect:
- ❌ User accounts or authentication information
- ❌ Personal information from API users
- ❌ IP addresses (beyond temporary rate limiting)
- ❌ Cookies or tracking data
- ❌ Analytics or behavioral data
- ❌ Email addresses or contact information

## Rate Limiting

The API implements rate limiting (100 requests per minute per IP address) to ensure fair usage. IP addresses used for rate limiting are:
- Stored temporarily in memory only
- Never logged to disk
- Automatically cleared when the server restarts
- Not associated with any user identity

## Third-Party Services

This API may be deployed on third-party hosting platforms (Vercel, AWS, Railway, etc.). These platforms may collect standard server logs according to their own privacy policies:
- [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)
- [AWS Privacy Notice](https://aws.amazon.com/privacy/)
- [Railway Privacy Policy](https://railway.app/legal/privacy)

## Data Security

Security measures include:
- Read-only access (no data modification possible)
- Input validation on all requests
- Rate limiting to prevent abuse
- Security headers (CSP, HSTS, X-Frame-Options)
- No authentication credentials stored

## Public Data Notice

All tournament data served by this API is **publicly available information** from official Pokémon TCG tournament results. If you are a tournament participant and wish to have your information removed from our dataset, please contact the tournament organizers directly at melee.gg.

## Children's Privacy

This API does not knowingly collect or process data from children under 13. The service provides tournament results data only.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Effective Date" above.

## Data Retention

- **Tournament data**: Stored indefinitely as historical records
- **Rate limiting data**: Cleared on server restart (ephemeral)
- **Server logs**: Subject to hosting provider retention policies

## Your Rights

Since we do not collect personal information from API users, there is no user data to access, modify, or delete. 

If you believe your tournament data (player name, deck list) should be removed, please contact:
- Tournament organizers at melee.gg (original data source)
- This project maintainers via GitHub issues

## Contact

For questions about this privacy policy:
- Open an issue: https://github.com/sp3c1/protour-data-viz/issues
- Email: [Your contact email if you want to provide one]

## Legal Basis

This API processes publicly available tournament results under the principle of legitimate interest in:
- Providing tournament statistics and analysis
- Supporting the Pokémon TCG community
- Educational and research purposes

## International Users

This API is hosted in [hosting region - update based on deployment]. By using this API, you acknowledge that your requests may be processed in this region.

---

**Summary:** This is a simple, read-only API that serves public tournament data. We don't collect user information, don't use cookies, and don't track you. Rate limiting is temporary and memory-only.
