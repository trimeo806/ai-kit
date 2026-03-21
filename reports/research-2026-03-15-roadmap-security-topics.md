# Research: roadmap.sh Security Topics & Checklists

**Date**: 2026-03-15
**Scope**: Comprehensive extraction of security-related topics, categories, and checklist items from roadmap.sh across frontend, backend, API, and full-stack domains
**Status**: Complete
**Methodology**: Multi-source web fetching and targeted searches of roadmap.sh content

---

## Executive Summary

roadmap.sh provides extensive security coverage across multiple learning paths. The primary security resources are:
1. **API Security Best Practices** — most comprehensive checklist format
2. **Frontend Developer Roadmap** — front-end-specific security topics
3. **Backend Developer Roadmap** — backend-specific security topics
4. **Cyber Security Roadmap** — comprehensive infosec curriculum
5. **DevSecOps Roadmap** — infrastructure/automation security

Key finding: OWASP Top 10 and core security concepts are integrated throughout roadmaps, with the **API Security Best Practices** page offering the most detailed, actionable checklist format.

---

## Sources Consulted

1. [API Security Best Practices](https://roadmap.sh/best-practices/api-security) — High credibility, detailed checklists
2. [Cyber Security Roadmap](https://roadmap.sh/cyber-security) — High credibility, comprehensive infosec topics
3. [Frontend Developer Roadmap](https://roadmap.sh/frontend) — High credibility, frontend-specific security
4. [Backend Developer Roadmap](https://roadmap.sh/backend) — High credibility, backend-specific security
5. [Full Stack Developer Roadmap](https://roadmap.sh/full-stack) — High credibility, integrated security coverage
6. [Frontend Performance Best Practices](https://roadmap.sh/best-practices/frontend-performance) — Medium credibility (performance-focused)
7. [Best Practices Section](https://roadmap.sh/best-practices) — Medium credibility, index page

---

## FRONTEND SECURITY TOPICS

### Core Topics Covered

| Topic | Description | Checklist Items |
|-------|-------------|-----------------|
| **HTTPS** | Foundational protocol security | Use HTTPS on all websites; enforce HTTPS redirects |
| **CORS** (Cross-Origin Resource Sharing) | Cross-domain request control | Validate cross-origin requests; proper CORS headers |
| **CSP** (Content Security Policy) | XSS & code injection prevention | Define whitelisted content sources; avoid inline scripts; use nonces/hashes |
| **OWASP Risks** | Common web vulnerabilities | Address XSS, CSRF, injection attacks |
| **Security Headers** | HTTP response headers | X-Content-Type-Options, X-Frame-Options, Content-Security-Policy |
| **Dependency Security** | Third-party library vulnerabilities | Monitor dependencies; keep updated; use vulnerability scanners |

### Attack Vectors Addressed

- **XSS (Cross-Site Scripting)** — Addressed via CSP, input validation, output encoding
- **CSRF (Cross-Site Request Forgery)** — State parameter in OAuth flow
- **Injection Attacks** — Input validation, sanitization requirements

### Frontend-Specific Checklist Items (Derived)

- [ ] Enable HTTPS on all resources
- [ ] Implement Content Security Policy headers
- [ ] Configure X-Content-Type-Options: nosniff
- [ ] Set X-Frame-Options to prevent clickjacking
- [ ] Sanitize all user input before DOM insertion
- [ ] Use async/defer attributes to prevent XSS timing attacks
- [ ] Monitor and update frontend dependencies regularly
- [ ] Avoid storing sensitive data (tokens, credentials) in localStorage
- [ ] Use httpOnly cookies for session tokens
- [ ] Validate CORS origins explicitly
- [ ] Implement subresource integrity (SRI) for CDN resources

---

## BACKEND & API SECURITY TOPICS

### Authentication & Authorization

| Topic | Best Practices |
|-------|-----------------|
| **JWT (JSON Web Tokens)** | Use strong secrets; short TTL/RTTL; don't extract algorithm from header; small payload; no sensitive data in payload |
| **OAuth 2.0** | Validate redirect_uri server-side; use code exchange (not response_type=token); include state parameter; define default scope |
| **Session Management** | Use centralized login; implement max retry + jail features; short session TTL |
| **MFA / 2FA** | Implement multi-factor authentication for sensitive operations |
| **Basic Authentication** | Avoid; use standard auth (JWT, OAuth, sessions) instead |

### Input Validation & Data Protection

| Topic | Checklist Items |
|-------|-----------------|
| **Input Validation** | Sanitize all user-supplied data; validate request parameters; implement bounds checking |
| **Injection Prevention** | Disable XML entity parsing (XXE); disable entity expansion in XML/YAML; use prepared statements for SQL |
| **Sensitive Data Handling** | Never return credentials, tokens, or PII in responses; encrypt all sensitive data in transit & at rest |
| **ID Strategy** | Prefer UUID over auto-increment IDs to avoid enumeration attacks |

### HTTP Security Headers

| Header | Recommended Value | Purpose |
|--------|-------------------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME type sniffing |
| X-Frame-Options | deny | Prevent clickjacking / framing attacks |
| Content-Security-Policy | default-src 'none' | Restrict resource loading; prevent XSS |
| HSTS | Include SSL directive | Prevent SSL strip attacks |

### Output Security

- Avoid returning sensitive data in responses
- Return proper HTTP response codes per operation
- Force content-type for all responses
- Remove fingerprinting headers (e.g., X-Powered-By, Server)

### Access Control

| Topic | Checklist Items |
|-------|-----------------|
| **Rate Limiting** | Limit requests to avoid DDoS/brute force; implement throttling |
| **IP Whitelisting** | Private APIs accessible only from safe-listed IPs |
| **HTTPS Enforcement** | Use HTTPS on server-side; configure secure ciphers |
| **Directory Listings** | Turn off directory listings; prevent file enumeration |
| **Endpoint Protection** | Verify all endpoints protected behind authentication |

### Monitoring & Logging

| Topic | Best Practices |
|-------|-----------------|
| **Centralized Logging** | Use centralized login for all services/components |
| **Request Monitoring** | Monitor all requests, responses, and errors with agents |
| **Alerting** | Configure alerts (SMS, Slack, Email, Kibana, CloudWatch) |
| **Sensitive Data** | Never log credentials, tokens, PII; mask sensitive fields |
| **IDS/IPS** | Deploy IDS and/or IPS system to monitor all traffic |

### API Security Checklist (Comprehensive)

- [ ] **Authentication**: Use JWT or OAuth 2.0; avoid Basic Auth
- [ ] **JWT Security**: Strong secret; short TTL; backend-enforced algorithm; no sensitive payload data
- [ ] **OAuth**: Server-side redirect_uri validation; state parameter for CSRF; code exchange (not token response)
- [ ] **Rate Limiting**: Implement request throttling; DDoS protection
- [ ] **Max Retry**: Implement max retry + account lockout/jail features
- [ ] **HTTPS**: All traffic encrypted; use secure ciphers
- [ ] **HSTS**: Include SSL directive to prevent downgrade attacks
- [ ] **Input Validation**: Sanitize all user input; validate request parameters; bounds checking
- [ ] **SQL Injection**: Use prepared statements; never concatenate SQL
- [ ] **XXE Prevention**: Disable XML entity parsing
- [ ] **Resource Enumeration**: Use UUIDs, not auto-increment IDs
- [ ] **Directory Listing**: Disable; prevent file enumeration
- [ ] **Private APIs**: IP whitelist for internal endpoints
- [ ] **Response Headers**: X-Content-Type-Options, X-Frame-Options, CSP, HSTS
- [ ] **Fingerprinting**: Remove X-Powered-By, Server, and other revealing headers
- [ ] **Response Data**: No credentials, tokens, or PII in responses
- [ ] **HTTP Codes**: Return proper status codes per operation
- [ ] **Centralized Logging**: All requests/responses logged centrally
- [ ] **Sensitive Logging**: Never log credentials, tokens, or personal data
- [ ] **Monitoring Agents**: Deploy agents to monitor all traffic
- [ ] **Alerting**: SMS/Slack/Email/Kibana/CloudWatch alerts for anomalies
- [ ] **IDS/IPS**: Deploy intrusion detection/prevention systems
- [ ] **CI/CD Security**: Unit/integration tests; code review (no self-approval); continuous security analysis
- [ ] **Dependency Scanning**: Check for known vulnerabilities; keep dependencies updated
- [ ] **Deployment Rollback**: Design rollback solution for failed deployments
- [ ] **Debug Mode**: Disable in production
- [ ] **Stack Non-Executable**: Use non-executable stack when available
- [ ] **Large Data Handling**: Avoid HTTP blocking for large payloads; use async/streaming
- [ ] **CDN for Uploads**: Use CDN for file uploads; validate uploads

---

## BACKEND SECURITY TOPICS

### Cryptography

| Topic | Methods Covered |
|-------|-----------------|
| **Hashing Algorithms** | MD5, SHA, scrypt, bcrypt |
| **Password Storage** | bcrypt, scrypt (never plain text or weak hashing) |

### Protocol Security

| Topic | Details |
|-------|---------|
| **HTTPS** | Enforce across all communications |
| **SSL/TLS** | Use modern versions; secure cipher suites |

### Application Security

| Topic | Coverage |
|-------|----------|
| **OWASP Risks** | Top 10 vulnerabilities addressed |
| **CORS** | Cross-origin request validation |
| **CSP** | Content security policies |
| **Server Security** | Hardening, access control |

### Backend Checklist (Derived)

- [ ] **Password Hashing**: Use bcrypt or scrypt; never MD5 or SHA without salting
- [ ] **HTTPS/TLS**: All external communication encrypted; use modern TLS versions
- [ ] **Secure Ciphers**: Configure strong cipher suites; disable weak algorithms
- [ ] **CORS Policies**: Validate origins; use specific Allow-Origin headers
- [ ] **CSP Headers**: Implement strict content policies
- [ ] **OWASP Risks**: Address Top 10 (Injection, Authentication, Sensitive Data, etc.)
- [ ] **Server Hardening**: Minimal services running; firewall rules; SELinux/AppArmor
- [ ] **API Endpoints**: All protected behind authentication
- [ ] **SQL Injection**: Prepared statements; parameterized queries; ORM safety
- [ ] **Session Management**: Secure session storage; short timeouts; HTTPS-only cookies
- [ ] **Secrets Management**: Environment variables; no hardcoded credentials; rotate regularly

---

## FULL-STACK SECURITY INTEGRATION

### Cross-Layer Topics

| Layer | Security Focus |
|-------|-----------------|
| **Frontend** | JWT/OAuth token handling; CSP; HTTPS; input validation |
| **Backend** | Authentication systems; database security; API protection |
| **Infrastructure** | AWS security; environment configuration; CI/CD hardening |
| **DevOps** | GitHub Actions security; Terraform IaC; Ansible hardening |

### Full-Stack Checklist

- [ ] **Unified Auth**: Consistent authentication/authorization across layers
- [ ] **Secrets Management**: Environment variables for all layers; no hardcoded credentials
- [ ] **Database Security**: SQL injection prevention; row-level security; encryption at rest
- [ ] **API Design**: RESTful security standards; rate limiting; input validation
- [ ] **CI/CD Pipeline**: Secure deployment; secrets rotation; signed artifacts
- [ ] **Infrastructure**: VPC isolation; security groups; WAF rules; DDoS protection
- [ ] **Monitoring**: Centralized logging; ELK/CloudWatch; security alerts
- [ ] **Compliance**: GDPR/CCPA requirements; data retention; audit trails

---

## CYBER SECURITY ROADMAP TOPICS

### Foundational Skills

- IT Fundamentals (hardware, networking, OS)
- Operating Systems (Windows, Linux, macOS administration)
- Networking Knowledge (OSI model, protocols, ports, SSL/TLS)

### Core Security Concepts

| Topic | Details |
|-------|---------|
| **Zero Trust** | Architecture; validation at every layer |
| **Defense in Depth** | Layered security strategies |
| **Cyber Kill Chain** | Attack phases; detection opportunities |
| **Risk Assessment** | Identification, analysis, mitigation |
| **Compliance** | Regulations, audit, governance |
| **Backup & Resiliency** | Recovery planning; disaster procedures |

### Authentication & Access Control

- Kerberos
- LDAP
- SSO (Single Sign-On)
- RADIUS
- MFA / 2FA
- Certificate-based auth
- Local authentication

### Tools & Technologies

| Category | Tools |
|----------|-------|
| **Network Tools** | nmap, tcpdump, wireshark, netstat, ping, dig, tracert |
| **Packet Analysis** | Protocol analyzers, sniffers |
| **Virtualization** | VMware, VirtualBox, ESXi, Proxmox |
| **Pentesting** | Metasploit, Burp Suite, OWASP ZAP |

### Advanced Topics

- Forensics fundamentals
- Threat hunting basics
- Vulnerability management
- Reverse engineering concepts
- Penetration testing rules of engagement
- Network segmentation & DMZ architecture

### Certifications Referenced

- Beginner: CompTIA A+, Security+, Network+, Linux+, CCNA
- Advanced: CEH, CISA, CISM, OSCP, CISSP, GIAC

---

## SECURITY TOPICS BY CATEGORY

### OWASP Top 10 References (Integrated Throughout)

roadmap.sh integrates OWASP Top 10 coverage into multiple learning paths:

| OWASP Category | Roadmap Placement | Details |
|----------------|-------------------|---------|
| Injection | Backend, API, QA Engineer roadmaps | SQL, XXE, LDAP injection prevention |
| Authentication | Frontend, Backend, API Security | JWT, OAuth, MFA/2FA, session management |
| Sensitive Data | API Security, Full-Stack | Encryption at rest/in transit; secrets management |
| XML External Entities (XXE) | API Security | Disable entity parsing; entity expansion limits |
| Broken Access Control | Backend, API Security | Authorization checks; IP whitelisting |
| CSRF | API Security, Frontend | State parameter; SameSite cookies |
| XSS | Frontend, API Security | CSP; input sanitization; output encoding |
| Insecure Deserialization | Backend, API | Avoid untrusted serialization; use JSON |
| Using Components with Known Vulnerabilities | CI/CD Security | Dependency scanning; vulnerability monitoring |
| Insufficient Logging & Monitoring | API Security, DevSecOps | Centralized logging; alerting; IDS/IPS |

### Secrets Management

- Environment variables (no hardcoded secrets)
- Encrypted configuration files
- Secrets rotation procedures
- Access control to secrets stores

### Dependency Security

- Vulnerability scanners (npm audit, snyk, etc.)
- Automated dependency updates
- Regular security audits
- Monitoring CVE databases

### Code Review & CI/CD Security

- Mandatory code review (no self-approval)
- Automated security analysis (SAST)
- Continuous vulnerability scanning (DAST/SCA)
- Secure artifact signing
- Rollback procedures

### Headers & CSP

| Header | Purpose | Recommended Value |
|--------|---------|-------------------|
| Strict-Transport-Security (HSTS) | Prevent downgrade attacks | include-subdomains; long max-age |
| X-Content-Type-Options | MIME type sniffing | nosniff |
| X-Frame-Options | Clickjacking prevention | deny / same-origin |
| Content-Security-Policy (CSP) | XSS/injection prevention | default-src 'none'; specific whitelists |
| X-XSS-Protection | Legacy XSS filter (deprecated) | 1; mode=block |

---

## STRUCTURED CHECKLISTS

### API Security Checklist (Most Comprehensive)

**Authentication & Authorization**
- [ ] Avoid Basic Authentication; use JWT/OAuth
- [ ] Use strong JWT secrets (>32 characters)
- [ ] Set short JWT TTL/RTTL
- [ ] Extract algorithm from backend, not header
- [ ] Don't store sensitive data in JWT payload
- [ ] Keep JWT payload small
- [ ] Validate OAuth redirect_uri server-side
- [ ] Use code exchange (avoid response_type=token)
- [ ] Include state parameter in OAuth flows
- [ ] Define default scope; validate per app

**Access Control & Rate Limiting**
- [ ] Implement request rate limiting
- [ ] Use max retry + account lockout (jail)
- [ ] Whitelist IPs for private APIs
- [ ] Verify all endpoints authenticated
- [ ] Implement role-based access control (RBAC)

**Input Validation & Output Security**
- [ ] Sanitize all user input
- [ ] Validate request parameters
- [ ] Implement bounds checking
- [ ] Disable XML entity parsing
- [ ] Disable XML entity expansion
- [ ] Use UUIDs instead of auto-increment IDs
- [ ] Avoid user IDs in resource URLs
- [ ] Force content-type for responses
- [ ] Never return credentials/tokens in responses
- [ ] Return proper HTTP status codes

**Transport Security**
- [ ] Use HTTPS with secure ciphers
- [ ] Implement HSTS header
- [ ] Encrypt sensitive data at rest & in transit

**Security Headers**
- [ ] Send X-Content-Type-Options: nosniff
- [ ] Send X-Frame-Options: deny
- [ ] Send CSP: default-src 'none'
- [ ] Remove fingerprinting headers (X-Powered-By)

**Monitoring & Logging**
- [ ] Use centralized logging
- [ ] Monitor requests, responses, errors
- [ ] Set up alerting (SMS/Slack/Email)
- [ ] Never log sensitive data
- [ ] Deploy IDS/IPS

**CI/CD & Deployment**
- [ ] Unit & integration tests mandatory
- [ ] Code review before merge (no self-approval)
- [ ] Continuous security analysis
- [ ] Check dependencies for vulnerabilities
- [ ] Design rollback procedures
- [ ] Disable debug mode in production
- [ ] Use non-executable stacks

**Operational**
- [ ] Avoid HTTP blocking on large payloads
- [ ] Use CDN for file uploads

### Frontend Security Checklist

- [ ] Enforce HTTPS for all resources
- [ ] Implement Content Security Policy headers
- [ ] Set X-Content-Type-Options: nosniff
- [ ] Configure X-Frame-Options: deny
- [ ] Sanitize all user input before DOM insertion
- [ ] Use async/defer on scripts to prevent XSS timing
- [ ] Monitor and update dependencies
- [ ] Avoid storing sensitive data in localStorage
- [ ] Use httpOnly cookies for tokens
- [ ] Validate CORS origins explicitly
- [ ] Implement Subresource Integrity (SRI) for CDNs
- [ ] Minify and compress JavaScript/CSS
- [ ] Use async loading for tracking/analytics
- [ ] Validate form input client-side + server-side
- [ ] Use Content-Security-Policy nonces for inline scripts

### Backend Security Checklist

- [ ] Hash passwords with bcrypt/scrypt
- [ ] Enforce HTTPS/TLS for all traffic
- [ ] Use strong, modern cipher suites
- [ ] Implement CORS policies with specific origins
- [ ] Configure CSP headers
- [ ] Address OWASP Top 10 risks
- [ ] Harden server configuration
- [ ] Use prepared statements for SQL
- [ ] Implement secure session management
- [ ] Store secrets in environment variables
- [ ] Implement role-based access control
- [ ] Log all authentication attempts
- [ ] Rotate credentials regularly
- [ ] Disable unnecessary services
- [ ] Configure firewall rules

---

## Technology Comparison

### Authentication Methods

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **JWT** | Stateless APIs, microservices | Scalable, no session storage | Token revocation difficult |
| **OAuth 2.0** | Third-party integrations | Delegated auth, wide support | Complex flow; more vectors |
| **Session-based** | Traditional web apps | Simple, server-controlled | Scalability; shared state |
| **MFA/2FA** | High-security access | Strong verification | User friction |

### Hashing Algorithms

| Algorithm | Use Case | Security |
|-----------|----------|----------|
| **bcrypt** | Password hashing | High; adaptive rounds |
| **scrypt** | Password hashing | High; memory-hard |
| **SHA** | NOT passwords | Low for passwords; ok for HMAC |
| **MD5** | Legacy only | Deprecated; insecure |

---

## Trade-Offs & Recommendations

### JWT vs OAuth 2.0

- **JWT**: Use for internal APIs, microservices, stateless auth
- **OAuth**: Use for delegated auth, third-party integrations, user federation
- **Session-based**: Use for traditional monolithic apps with server-side state

### Logging Sensitivity

- **Issue**: Logging too much enables attackers; logging too little hides incidents
- **Solution**: Log transaction IDs, timestamps, status codes; mask PII/credentials; centralize with retention policies

### Rate Limiting Granularity

- **Fine-grained**: Per-user, per-endpoint, per-IP (prevents abuse but adds overhead)
- **Coarse-grained**: Global limits (simpler, less precise)
- **Recommendation**: Per-endpoint + per-user for APIs; global for backend services

### CSP Strictness vs Usability

- **Strict**: `default-src 'none'` (safest, requires explicit whitelists)
- **Moderate**: `default-src 'self'` (allows same-origin; simpler)
- **Loose**: Avoid; allows inline scripts
- **Recommendation**: Start strict; relax only when necessary; use nonces/hashes for inline scripts

---

## Consensus vs Experimental

### Stable / Proven
- ✅ HTTPS/TLS encryption
- ✅ JWT for API authentication
- ✅ OAuth 2.0 for delegated auth
- ✅ bcrypt/scrypt for password hashing
- ✅ Content Security Policy headers
- ✅ CORS validation
- ✅ Input validation & sanitization
- ✅ Centralized logging
- ✅ Rate limiting & throttling
- ✅ Security code reviews

### Emerging / Evolving
- 🔄 Zero Trust architecture (growing adoption)
- 🔄 API-first security (new best practices)
- 🔄 Passwordless authentication (FIDO2, WebAuthn) — growing but not universal
- 🔄 Runtime Application Self-Protection (RASP) — newer approach
- 🔄 Shift-left security in CI/CD — gaining traction but inconsistently implemented

---

## Coverage by Roadmap.sh Learning Path

### Beginner Level
- Basic HTTPS enforcement
- Password hashing concepts
- Input validation fundamentals
- Basic authentication types

### Intermediate Level
- JWT implementation
- OAuth 2.0 flows
- CORS policies
- CSP headers
- Rate limiting
- Secure session management

### Advanced Level
- Zero Trust architecture
- Advanced cryptography
- Threat modeling
- Penetration testing
- Incident response
- Compliance (GDPR, HIPAA, PCI-DSS)
- DevSecOps practices

---

## Unresolved Questions

1. **Frontend-specific XSS/CSRF**: While OWASP risks are mentioned, explicit XSS and CSRF checklist items aren't detailed on frontend roadmap—likely covered under "OWASP Risks" umbrella
2. **Specific WAF Rules**: No specific Web Application Firewall (WAF) configuration examples provided in roadmap.sh
3. **Compliance Frameworks**: GDPR/HIPAA/PCI-DSS mentioned but detailed compliance checklists not extracted
4. **Threat Modeling**: No explicit threat modeling or STRIDE methodology mentioned in web security sections
5. **Secret Rotation Frequency**: No specific timelines for credential rotation provided
6. **Scanning Tools**: While vulnerability scanning is mentioned, no specific tool recommendations beyond general categories

---

## Sources

- [API Security Best Practices](https://roadmap.sh/best-practices/api-security)
- [Cyber Security Roadmap](https://roadmap.sh/cyber-security)
- [Frontend Developer Roadmap](https://roadmap.sh/frontend)
- [Backend Developer Roadmap](https://roadmap.sh/backend)
- [Full Stack Developer Roadmap](https://roadmap.sh/full-stack)
- [Frontend Performance Best Practices](https://roadmap.sh/best-practices/frontend-performance)
- [Best Practices Section](https://roadmap.sh/best-practices)

---

## Verdict

**Status**: `ACTIONABLE`

The research has produced comprehensive, structured security topic extraction from roadmap.sh. The API Security Best Practices page provides the most detailed, checklist-formatted content. All major security domains (authentication, authorization, input validation, output security, monitoring, headers, OWASP Top 10) are covered across the learning paths. Sufficient detail exists to build security testing frameworks, training materials, or security audits based on these topics.

---

**Report Generated**: 2026-03-15
