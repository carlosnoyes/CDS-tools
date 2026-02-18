# Security

> Security posture and practices for CDS-tools.

## Secret Handling

- Never commit secrets, API keys, or credentials to the repo
- Use environment variables or a secrets manager
- Add sensitive files to `.gitignore`
- <!-- TODO: Specify secrets manager if applicable -->

## Permissions

- <!-- TODO: Define access control model -->
- Follow principle of least privilege

## Dependency Updates

- Regularly update dependencies to patch known vulnerabilities
- <!-- TODO: Describe update cadence or tooling (Dependabot, Renovate, etc.) -->

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. <!-- TODO: Provide private reporting channel (email, security@, etc.) -->
3. Include: description, reproduction steps, impact assessment

## Threat Model Prompts

Use these questions to guide threat modeling sessions:

- [ ] What data does this system handle? What's the sensitivity level?
- [ ] What are the trust boundaries?
- [ ] Who are the actors (users, services, admins)?
- [ ] What happens if credentials are leaked?
- [ ] What's the blast radius of a compromise?
- [ ] Are there rate limits / abuse protections?
