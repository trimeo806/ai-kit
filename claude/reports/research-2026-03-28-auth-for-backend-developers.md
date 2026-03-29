# Research: Authentication and Authorization for Backend Development
### A Comprehensive Guide for Frontend Developers Learning Java Spring Boot

**Date:** March 28, 2026
**Scope:** Complete reference on authentication and authorization for backend developers (TypeScript/React/Next.js to Java Spring Boot)
**Status:** ACTIONABLE

---

## Table of Contents

1. [Foundations](#foundations)
2. [Authentication Approaches](#authentication-approaches)
3. [Authorization Approaches](#authorization-approaches)
4. [Spring Boot Implementation](#spring-boot-implementation)
5. [Edge Cases & Pitfalls](#edge-cases--pitfalls)
6. [Comparison Tables](#comparison-tables)
7. [Best Practices](#best-practices)
8. [TypeScript/React Developer Perspective](#typescriptreact-developer-perspective)
9. [Methodology](#methodology)
10. [Unresolved Questions](#unresolved-questions)

---

## FOUNDATIONS

### What Problem Does Authentication Solve?

Authentication answers: **"Who are you?"** It verifies that the person claiming to be a user is actually that user.

**Real-world analogy (airport):** You show your passport to prove your identity. The border agent compares your face to your passport photo and checks the document's authenticity. Only after this verification are you allowed through.

**Why it matters:**
- Protects against imposters accessing accounts
- Creates accountability for actions taken in a system
- Enables personalization and user-specific data retrieval
- Forms the foundation for all access control

### What Problem Does Authorization Solve?

Authorization answers: **"What are you allowed to do?"** It grants or denies access to specific resources based on the authenticated identity.

**Real-world analogy (airport):** After proving your identity, your boarding pass (authorization credential) determines:
- Which flight you can board
- Which seat you can occupy
- Which areas of the airport you can access

Without the boarding pass, even an authenticated passenger cannot board the plane.

### Authentication vs. Authorization: Core Difference

| Aspect | Authentication | Authorization |
|--------|---|---|
| **Question** | Who are you? | What can you do? |
| **When** | First step (gate-keeper) | After authentication (permission check) |
| **Mechanism** | Verifies identity | Grants access to resources |
| **Requirement** | Proof (credentials) | Roles, permissions, policies |
| **Failure impact** | No one gets in | Wrong people access wrong resources |
| **Example** | Username + password | Admin sees dashboard, user sees limited view |

**Order of operations:** Authentication MUST always come before authorization. Users prove their identity first, then receive permissions.

### Historical Evolution of Authentication

1. **HTTP Basic Auth (1990s)**
   - Username:password sent with every request in Base64 encoding
   - Problem: Easily decoded, exposed in every request, vulnerable to MITM attacks

2. **Session-Based Auth (1990s-2000s)**
   - Server generates session ID after login
   - Client stores session ID in cookie
   - Server stores session data in memory/database
   - Problem: Requires server-side state, doesn't scale horizontally

3. **Token-Based Auth (2000s-2010s)**
   - Server issues token after login
   - Client includes token in Authorization header
   - Server validates token without storing session state
   - Enables stateless architecture

4. **JWT (JSON Web Tokens) (2010s-present)**
   - Self-contained token format (RFC 7519)
   - Token contains claims that identify user + permissions
   - No server-side storage needed (stateless)
   - Industry standard for modern APIs

5. **OAuth 2.0 (2010s-present)**
   - Delegation protocol for granting third-party access
   - User grants app A permission to access resources on service B
   - Common use: "Login with Google" / "Connect with Facebook"

6. **OpenID Connect (2014-present)**
   - Authentication layer on top of OAuth 2.0
   - Adds ID token with user information
   - Bridges gap between OAuth 2.0 (authorization-only) and SAML (heavy enterprise)

7. **Passwordless Auth (2020s-present)**
   - Magic links, WebAuthn, passkeys
   - Eliminates password attack surface
   - Growing adoption: passkey registrations up 350% from 2024 to 2026

### OWASP Top 10 Authentication & Authorization Threats

#### A1: Broken Access Control (Most Critical)
**What:** Applications fail to enforce proper access restrictions on authenticated users
- URL manipulation: `/admin` accessible to regular users
- Lack of validation in API endpoints
- Improper role-based permission checks
- Object-level authorization failures

**Impact:** Unauthorized access to sensitive data, functionality abuse

#### A2: Identification and Authentication Failures
**What:** Weak authentication mechanisms allow attackers to compromise identities
- Weak passwords (no validation, no history)
- Missing MFA on sensitive accounts
- Brute force attacks not prevented (no rate limiting)
- Session management flaws
- Passwords stored in plaintext

**Impact:** Account takeover, data breach

#### A3: Broken Object-Level Authorization (API-specific)
**What:** APIs fail to check ownership before returning objects
```
GET /api/users/1
GET /api/users/2  ← Different user can access user 2's data
```

**Impact:** Data disclosure of other users' sensitive information

---

## AUTHENTICATION APPROACHES

### a) Basic Authentication (HTTP Basic Auth)

**How it works:**
1. Client sends username:password encoded in Base64 in Authorization header
   ```
   Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
   ```
2. Server decodes and validates against database
3. Request proceeds if valid

**Pros:**
- Extremely simple to implement
- Part of HTTP standard
- Requires no session management
- Works in curl, Postman, basic tools

**Cons:**
- Credentials sent with EVERY request (exposure risk)
- Base64 encoding is NOT encryption (easily decoded)
- No built-in logout mechanism
- No protection against MITM attacks without HTTPS
- Password reset requires new credentials

**Security Risks:**
- Credentials leak if HTTPS not enforced
- Browser caches credentials in memory
- Works poorly in distributed systems

**When to use:**
- Internal microservice-to-microservice communication (with mTLS)
- Quick prototypes
- Simple scripts/tools

**When NOT to use:**
- Public-facing APIs
- User-facing applications
- Anything without mandatory HTTPS

**Real-world examples:** GitHub API (deprecated in favor of PATs), older internal APIs

---

### b) Session-Based Authentication (Cookie + Server Session)

**How it works:**
1. User logs in with username + password
2. Server validates and creates a session object (stored in DB/memory)
3. Server sends back session ID in `Set-Cookie` header
4. Browser automatically includes session cookie with each request
5. Server validates session ID on each request

**Diagram:**
```
1. POST /login {username, password}
           ↓
2. Server validates, creates session
           ↓
3. HTTP 200 with Set-Cookie: sessionId=abc123
           ↓
4. GET /protected
   Cookie: sessionId=abc123
           ↓
5. Server looks up session abc123 → logged in as user X
```

**Pros:**
- Stateful: Server maintains full control
- Easy logout (delete session)
- Session data can be large (no token size limits)
- Works with server-rendered templates naturally
- Browser handles cookies automatically

**Cons:**
- Requires server-side storage (doesn't scale horizontally without shared session store)
- Session IDs can be stolen (fixation attacks)
- Multiple servers need access to same session store (Redis, DB)
- Not ideal for distributed architectures
- CSRF vulnerable (requires additional token)

**Security Risks:**
- Session fixation: attacker tricks user into using attacker-controlled session ID
- Session hijacking: attacker steals valid session ID
- CSRF attacks: attacker forces authenticated user to perform action

**Mitigation:**
- Regenerate session ID after successful login
- Use `HttpOnly` + `Secure` flags on cookies
- Implement CSRF tokens
- Store sessions in secure, replicated store (Redis)
- Set reasonable session timeouts

**When to use:**
- Server-rendered applications (PHP, JSP, traditional Java web apps)
- Applications where logout must be instant
- Monolithic applications (single server or load-balanced behind sticky sessions)

**When NOT to use:**
- Microservices architecture
- Stateless API servers
- Mobile apps without cookie support

**Real-world examples:** Traditional PHP applications, some Java JSP apps, legacy systems

---

### c) Token-Based Authentication (JWT)

**How it works:**
1. User logs in with username + password
2. Server validates and creates a token (no storage)
3. Server sends token to client
4. Client stores token (localStorage, sessionStorage, memory, or secure cookie)
5. Client includes token in Authorization header with each request
6. Server validates token signature without database lookup

**JWT Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Three parts:
1. **Header:** Algorithm (HS256, RS256) and token type
2. **Payload:** Claims (sub=user ID, name, roles, custom data, exp=expiration)
3. **Signature:** HMAC(header.payload, secret) — proves token wasn't tampered with

**Token validation:**
1. Decode header, payload, signature
2. Verify signature: HMAC(new_header.new_payload) == provided_signature
3. Check expiration: `exp` claim < current time?
4. Check issued-at: `iat` claim not in future?
5. Check issuer: `iss` matches expected value?
6. Extract user info from payload

**Pros:**
- Stateless: no server-side storage required
- Scalable: all information in token itself
- Works across domains (CORS friendly)
- Great for microservices
- Can include rich information (roles, permissions, custom data)
- Widely adopted industry standard
- Mobile-friendly (doesn't require cookies)

**Cons:**
- Cannot revoke token instantly (token valid until expiration)
- Token size can be large (affects bandwidth)
- Requires HTTPS to prevent token exposure
- Requires client-side token storage (XSS risk if in localStorage)
- No built-in logout (must use blacklist or token rotation)
- Cannot modify user permissions mid-session (requires token refresh)

**Security Risks:**
- Token stored in localStorage: vulnerable to XSS attacks
- Token in URL: logged in servers, browser history
- No expiration: leaked token works forever
- Algorithm confusion: HMAC vs RSA confusion attacks
- Token contains PII: sensitive data readable by client
- No revocation: fired employee's token still works

**Token Refresh Pattern (Industry Standard):**

Access Token (short-lived, 15 minutes):
- For API requests
- Frequently expires
- Minimal damage if leaked

Refresh Token (long-lived, 7 days):
- Stored securely (HttpOnly cookie preferred)
- Used only to get new access tokens
- Can be rotated (each refresh returns new refresh token)
- Can be revoked by server

Flow:
```
1. POST /login → {accessToken, refreshToken}
   Client stores: accessToken in memory, refreshToken in HttpOnly cookie

2. GET /protected {Authorization: Bearer accessToken}
   → 200 Success

3. 15 minutes later, accessToken expires
   GET /protected → 401 Unauthorized

4. Client uses refreshToken:
   POST /refresh {refreshToken}
   → {newAccessToken, newRefreshToken}

5. GET /protected {Authorization: Bearer newAccessToken}
   → 200 Success
```

**Cookie-Based JWT Storage (Recommended):**
```
Set-Cookie: accessToken=eyJhb...; Max-Age=900; HttpOnly; Secure; SameSite=Strict
Set-Cookie: refreshToken=abc123; Max-Age=604800; HttpOnly; Secure; SameSite=Strict
```

- `HttpOnly`: JavaScript cannot access (XSS protection)
- `Secure`: HTTPS only (encryption in transit)
- `SameSite=Strict`: Not sent in cross-site requests (CSRF protection)

**When to use:**
- RESTful APIs
- Microservices
- Single-page applications (SPAs)
- Mobile apps
- Cross-domain requests
- Modern distributed systems

**When NOT to use:**
- Real-time revocation required (instant logout across all sessions)
- Highly sensitive systems requiring per-request validation
- Simple server-rendered apps (sessions better choice)

**Real-world examples:** Google APIs, GitHub APIs, Okta, Auth0, Firebase

---

### d) OAuth 2.0 / OpenID Connect

**OAuth 2.0: What is it?**
- Standard for **authorization** (granting access)
- Allows apps to access user data on another service WITHOUT knowing password
- Enables "social login" (Login with Google, etc.)
- NOT an authentication protocol (doesn't identify user)

**Real-world scenario (social login):**
```
1. User clicks "Login with Google" on app.example.com
2. Browser redirected to accounts.google.com
3. User logs in to Google (if not already)
4. Google shows: "Example App wants to access your email"
5. User clicks "Allow"
6. Google redirects back to app.example.com with authorization code
7. Example App exchanges code for access token
8. Example App uses token to fetch user email from Google
9. Example App creates local session
```

**Why not use password directly?**
- User never gives app.example.com their Google password
- User can revoke access without changing password
- Google can track which apps have access
- If Example App is compromised, Google password stays safe

**OAuth 2.0 Flows:**

1. **Authorization Code Flow (web apps, most secure)**
   ```
   Client → Authorization Server (user login)
   User grants consent
   Authorization Server → Client (authorization code)
   Client → Authorization Server (code exchange for token, server-to-server)
   Authorization Server → Client (access token)
   Client → Resource Server (use token)
   ```

2. **Implicit Flow (deprecated, don't use)**
   - Token returned directly in URL (security risk)
   - No server-to-server exchange

3. **Client Credentials Flow (service-to-service)**
   ```
   Service A → OAuth Server {client_id, client_secret}
   OAuth Server → Service A {access_token}
   Service A → Service B API {access_token}
   ```

4. **Device Flow (IoT, smart TVs)**
   - User authenticates on device with web browser
   - Device gets token

**OpenID Connect (OIDC): What is it?**
- Layer on top of OAuth 2.0
- Adds **authentication** (ID token with user info)
- Industry-standard replacement for SAML

**Key difference:**
- OAuth 2.0: "Here's an access token to access your Google Drive"
- OIDC: "Here's an access token AND an ID token proving who you are"

**ID Token (JWT with claims):**
```json
{
  "iss": "https://accounts.google.com",
  "azp": "app.example.com",
  "aud": "app.example.com",
  "sub": "110169547812345678901",  // User ID
  "email": "user@example.com",
  "email_verified": true,
  "iat": 1516239022,
  "exp": 1516242622
}
```

**OAuth 2.0 Scopes:**
- Define what data client can access
- User sees scopes in consent screen

```
scope=openid profile email offline_access
  - openid: Standard OpenID Connect scopes
  - profile: User's name, picture, etc.
  - email: User's email address
  - offline_access: Can refresh token after logout
```

**Pros:**
- User never shares password with third-party
- Centralized identity management
- User sees what data is shared
- Can revoke access anytime
- Works across platforms (web, mobile, desktop)
- OIDC adds authentication to OAuth 2.0

**Cons:**
- More complex than basic auth or sessions
- Requires third-party provider
- Third-party outage affects login
- Requires HTTPS
- More setup (provider configuration)

**Security Risks:**
- Authorization code interception (use PKCE)
- Token leakage
- State parameter missing (CSRF attacks)
- Redirect URI misconfiguration

**PKCE (Proof Key for Code Exchange):**
- Prevents authorization code interception in mobile/SPA apps
- Client creates random `code_verifier`
- Client sends SHA256(code_verifier) as `code_challenge`
- Authorization server returns code
- Client exchanges code + original `code_verifier` for token
- Server verifies they match

**When to use:**
- Login with social accounts (Google, GitHub, etc.)
- Delegated access to user data
- Third-party integrations
- Enterprise SSO (with OIDC)

**When NOT to use:**
- Internal-only systems (no need for delegation)
- High-security systems (simpler auth methods better)
- Simple applications (overhead not justified)

**Real-world examples:**
- Google login
- GitHub login
- Facebook login
- Auth0
- Okta
- Keycloak (open-source)

---

### e) API Keys

**How it works:**
1. Administrator generates unique key: `sk_live_abcdef123456`
2. Client stores key securely
3. Client includes key in Authorization header or query parameter
4. Server validates key against database
5. Grants access to associated resources

**Key format (varies by provider):**
- GitHub: Personal access tokens (PAT)
- Stripe: `sk_live_` (secret) and `pk_live_` (public)
- AWS: Access Key ID + Secret Access Key

**Pros:**
- Simple to implement
- No complex token exchange
- Easy to revoke individual keys
- Works for service-to-service auth
- No user credential management needed

**Cons:**
- All API keys have equal permissions (no granular control)
- Keys don't expire (must be manually rotated)
- Hard to track which app uses which key
- Leaked key = full access until discovered
- Not suitable for user authentication

**Security Risks:**
- Leaked in logs, source code, error messages
- Hardcoded in applications
- Shared among team members (no audit trail)
- No expiration
- Can't distinguish between users

**Best Practices:**
- Never commit to source control (use environment variables)
- Rotate keys regularly (90 days)
- Use different keys for different environments (dev, staging, prod)
- Generate keys with least privilege
- Use read-only keys when possible
- Monitor usage for anomalies
- Revoke immediately if suspected leak

**When to use:**
- Internal service-to-service communication
- Webhook authentication
- Third-party API access (GitHub, Stripe, etc.)
- Simple background jobs
- Development/testing environments

**When NOT to use:**
- User authentication (use JWT or sessions)
- High-security systems (use mTLS)
- Applications requiring fine-grained permissions
- Systems needing token expiration

**Real-world examples:**
- GitHub API
- Stripe API
- Twilio API
- Sendgrid API

---

### f) Multi-Factor Authentication (MFA / 2FA)

**What it is:**
- Requires multiple independent verification methods
- "Something you know" + "Something you have" + "Something you are"

**Types:**

1. **Time-based One-Time Password (TOTP)**
   - Authenticator app generates 6-digit codes
   - Changes every 30 seconds
   - App and server share secret seed
   - Examples: Google Authenticator, Authy, Microsoft Authenticator

2. **SMS OTP (One-Time Password)**
   - Server sends 6-digit code via SMS
   - User enters code
   - Code expires quickly (5 minutes)
   - Less secure than TOTP (SIM hijacking, SMS interception)

3. **Email OTP**
   - Similar to SMS OTP but via email
   - More secure than SMS
   - User must check email

4. **Push Notifications**
   - Server sends notification to registered device
   - User approves/denies on app
   - Examples: Okta, Microsoft Authenticator
   - Works offline after setup

5. **Hardware Tokens (FIDO2 / Passkeys)**
   - Physical security key or device
   - Biometric or PIN to unlock
   - Cryptographic authentication
   - Phishing-resistant
   - Examples: YubiKey, Titan Security Key

6. **Backup Codes**
   - Generated once during setup
   - Single-use recovery codes
   - Stored securely by user
   - Used if primary method unavailable

**Flow (TOTP example):**
```
1. User enters username + password
2. Server validates → ask for MFA code
3. User opens authenticator app
4. User enters 6-digit code
5. Server validates code (matches TOTP for that user)
6. User authenticated
```

**Pros:**
- Significantly increases security (even if password stolen)
- Phishing-resistant (FIDO2)
- Compliance requirement (healthcare, finance)
- Works on all platforms

**Cons:**
- User friction (must carry device or app)
- Lost devices = locked accounts
- SMS/email can be slow
- Requires backup codes management

**Best Practices:**
- Make MFA optional for regular users, mandatory for admins
- Support multiple MFA methods (let user choose)
- Require MFA after password change
- Require MFA for sensitive operations (payment, data export)
- Encourage FIDO2 hardware keys for high-security accounts

**When to use:**
- All user-facing applications
- Admin accounts (mandatory)
- Financial systems
- Healthcare systems
- Any system with sensitive data

**Real-world examples:** GitHub (TOTP, WebAuthn, SMS), Google, Microsoft, Banks

---

### g) Certificate-Based Authentication (mTLS)

**What it is:**
- Mutual TLS authentication (server AND client present certificates)
- Uses X.509 certificates and public key infrastructure

**How it works:**
```
1. Client and server each have certificates (public key + signature)
2. Client connects to server
3. Server presents certificate → Client verifies signature
4. Client presents certificate → Server verifies signature
5. If both valid → encrypted TLS connection established
6. No passwords needed
```

**Certificate components:**
- Public key
- Subject name (who owns cert)
- Issuer (who signed cert)
- Serial number
- Validity period (expiration)
- Signature (proof of issuer's verification)

**Trust chain:**
```
Root CA (self-signed) → Intermediate CA → Client/Server Certificate
```

Client verifies chain by checking each signature.

**Pros:**
- Very high security (cryptographic proof of identity)
- Phishing-resistant (bound to domain via certificate)
- No passwords needed
- Excellent for service-to-service auth
- Fine-grained access control possible
- Works offline

**Cons:**
- Complex to set up (certificate management)
- Requires infrastructure (Certificate Authority)
- Certificate expiration management overhead
- User experience pain (cert installation)
- Not suitable for large user populations
- Key compromise = major problem

**Certificate Management:**
- Generation: Create CSR (Certificate Signing Request)
- Signing: CA signs CSR → returns certificate
- Distribution: Install cert on client device
- Renewal: Before expiration (typically 1-2 years)
- Revocation: CRL (Certificate Revocation List) or OCSP

**When to use:**
- Microservice-to-microservice communication
- Zero-trust networks
- High-security internal systems
- API gateways
- VPN authentication
- IoT devices (fixed identities)

**When NOT to use:**
- User-facing applications (too complex)
- Public APIs (users won't manage certs)
- Systems with many users/devices (scaling nightmare)

**Real-world examples:**
- Kubernetes inter-node communication
- Service meshes (Istio, Linkerd)
- Enterprise VPNs
- Bank-to-bank APIs

---

### h) SAML (Security Assertion Markup Language)

**What it is:**
- XML-based authentication/authorization protocol
- Enterprise-focused single sign-on (SSO)
- Heavy-weight, XML-heavy alternative to modern approaches

**How it works:**
```
1. User accesses app.example.com (Service Provider)
2. App doesn't recognize user → redirect to company SSO (Identity Provider)
3. User logs in to company SSO (if not already)
4. SSO creates XML assertion with:
   - User ID
   - Name
   - Email
   - Groups/Roles
   - Signature (proof of issuer)
5. SSO redirects back to app with assertion
6. App validates assertion signature
7. App creates session based on assertion data
```

**SAML Assertion (XML):**
```xml
<saml:Assertion>
  <saml:Subject>
    <saml:NameID>user@company.com</saml:NameID>
  </saml:Subject>
  <saml:AttributeStatement>
    <saml:Attribute Name="email" Value="user@company.com"/>
    <saml:Attribute Name="role" Value="manager"/>
  </saml:AttributeStatement>
  <ds:Signature><!-- Cryptographic signature --></ds:Signature>
</saml:Assertion>
```

**Pros:**
- Industry standard in enterprises
- Rich assertion data (roles, attributes, groups)
- Centralized identity management
- Good for on-premises deployments
- Strong security features

**Cons:**
- XML is verbose and complex
- Steep learning curve
- Configuration heavy
- Not mobile-friendly
- Slower than modern protocols
- Declining adoption (replaced by OIDC)

**SAML vs. OAuth vs. OIDC:**

| Aspect | SAML | OAuth 2.0 | OpenID Connect |
|--------|------|----------|--------|
| **Purpose** | Authentication + Authorization | Authorization only | Authentication + Authorization |
| **Format** | XML | JSON | JSON (JWT) |
| **Use case** | Enterprise SSO | Third-party delegated access | Consumer SSO, modern apps |
| **Mobile-friendly** | Poor | Good | Good |
| **Learning curve** | Steep | Moderate | Moderate |
| **Adoption** | Enterprise (legacy) | Growing (modern) | Growing (modern) |
| **Spring Support** | Excellent | Excellent | Excellent |

**When to use:**
- Enterprise environments requiring SSO
- Companies with existing SAML infrastructure
- On-premises identity management
- High regulatory requirements

**When NOT to use:**
- New applications (use OIDC instead)
- Mobile apps
- Public-facing apps
- Startups/small companies

**Real-world examples:** Okta, Ping Identity, Microsoft AD, enterprise Shibboleth

---

### i) Passwordless Authentication

**Magic Links:**

How it works:
```
1. User enters email: user@example.com
2. Server generates token: abc123def456
3. Server sends email with link:
   https://app.example.com/login?token=abc123def456
4. User clicks link
5. App validates token (not expired, not used before)
6. User authenticated
```

Pros:
- No password to forget/hack
- Simple UX
- Email ownership verified
- Works on all devices

Cons:
- User must check email (slower than password)
- Email addresses can be intercepted
- One-time use means replay protection needed
- Session expires quickly
- Not ideal for frequent login

**WebAuthn / Passkeys:**

What it is:
- W3C standard for passwordless, phishing-resistant authentication
- Uses public key cryptography
- Biometric or PIN to unlock key

How it works:
```
1. User registers device
2. Device generates key pair (public key + private key)
3. Private key stored securely on device (not sent to server)
4. Server stores public key
5. On login:
   a. Server sends challenge (random bytes)
   b. Device signs challenge with private key
   c. Device sends signature
   d. Server verifies signature with public key
```

Pros:
- Phishing-resistant (works only on registered domain)
- Biometric/PIN protected
- Works offline
- Growing adoption (passkeys now mainstream 2026)
- Synced across devices (cloud passkeys)

Cons:
- Newer (less legacy support)
- Lost device = account access issue
- Requires device with biometric or PIN
- Not supported in all browsers yet

**OTP (One-Time Password):**

How it works:
```
1. User enters email
2. Server generates 6-digit code
3. Server sends code via email
4. User enters code on login page
5. Code expires after 5 minutes
```

Pros:
- Simple to understand
- Works on basic phones
- Low infrastructure cost

Cons:
- Email delivery delay
- Easy to mistype
- SMS variant subject to SIM hijacking
- Not truly passwordless (still needs code)

**Adoption in 2026:**
- Passkeys (FIDO2): 1 million daily registrations (350% increase from 2024)
- Magic links: Popular in consumer apps (Slack, Notion)
- OTP: Fallback for most systems

**When to use:**
- Passwordless: Mainstream adoption now (use passkeys for new apps)
- Magic links: Infrequent login apps, email-centric flows
- OTP: Fallback method or legacy support

---

### j) Single Sign-On (SSO)

**What it is:**
- User logs in once, accesses multiple independent applications without re-entering credentials
- Requires identity provider (central login service) and service providers (apps)

**How it works:**
```
1. User tries to access App A
2. App A redirects to SSO provider
3. SSO provider checks: is user already logged in?
4. If yes → redirect to App A with token (no login required)
5. If no → user logs in once
6. User accesses App B → automatically authorized (already in SSO session)
7. User accesses App C → automatically authorized
```

**SSO Protocols:**
- SAML (enterprise, heavyweight)
- OpenID Connect (modern, recommended)
- OAuth 2.0 (can be used for SSO)
- Custom (less common)

**Benefits:**
- Single login across ecosystem
- Centralized user management
- User logout everywhere at once
- Faster user experience (no re-login)
- Better security (audit in central place)
- Enforces consistent security policies

**Pros:**
- Seamless user experience
- Centralized control
- Security compliance easier
- User lifecycle management (provisioning/deprovisioning)

**Cons:**
- SSO provider becoming single point of failure
- Requires infrastructure setup
- More complex than single app auth
- Testing more complex (multiple apps)

**Real-world examples:**
- Google Workspace (login once, access Gmail, Drive, etc.)
- Microsoft 365 (login once, access all services)
- Okta (enterprise SSO)
- Auth0 (consumer SSO)

---

## AUTHORIZATION APPROACHES

### a) Role-Based Access Control (RBAC)

**How it works:**

```
Users → Roles → Permissions → Resources

User "John" ← Role "Manager" ← Permission "Create Reports" ← Resource "Reports Module"
User "Jane" ← Role "Admin" ← Permission "Delete Users" ← Resource "Users Module"
User "Bob" ← Role "Viewer" ← Permission "View Reports" (read-only) ← Resource "Reports"
```

**Configuration example:**
```
Roles:
  - Admin: all permissions
  - Manager: create, read, update reports; view users
  - Viewer: read reports only
  - Editor: create, read, update content

User assignments:
  john → Manager
  jane → Admin
  bob → Viewer
  alice → Editor
```

**Implementation:**
```sql
-- Database schema
CREATE TABLE roles (id, name);
CREATE TABLE users (id, name, role_id);
CREATE TABLE permissions (id, name);
CREATE TABLE role_permissions (role_id, permission_id);

-- Check authorization
SELECT permissions.name
FROM users
JOIN roles ON users.role_id = roles.id
JOIN role_permissions ON roles.id = role_permissions.role_id
JOIN permissions ON role_permissions.permission_id = permissions.id
WHERE users.id = ? AND permissions.name = 'view_reports';
```

**Pros:**
- Simple to understand and implement
- Easy to model real-world organizational structures
- Audit easy (see all permissions for role)
- Scales reasonably well
- Good for most traditional applications

**Cons:**
- Role explosion: creates too many roles as system grows
  - Example: Manager_US, Manager_EU, Manager_Finance → too many combinations
- Inflexible: can't grant specific permissions without creating new role
- Time-based access hard to model
- Cross-org/cross-team permissions hard to implement
- Not data-aware (can't say "only their own department's data")

**When to use:**
- Traditional applications
- Organizational structure matches role hierarchy
- Few role-permission combinations
- Simple, clear access patterns

**When NOT to use:**
- Complex, dynamic permissions needed
- Time/location-based access
- Fine-grained, object-level permissions
- Multi-tenant systems with complex rules

**Real-world examples:** Most traditional enterprise apps, WordPress (Admin, Editor, Author, Subscriber)

---

### b) Attribute-Based Access Control (ABAC)

**How it works:**

Authorization decision based on attributes of:
- User (department, location, title, security clearance)
- Resource (sensitivity level, owner, tags, classification)
- Environment (time of day, IP address, device type)
- Action (read, write, delete, etc.)

**Example rules:**
```
Rule 1: User can READ document IF:
  - user.role == "analyst" AND
  - document.classification == "internal" AND
  - user.department == document.owner_department

Rule 2: User can DELETE document IF:
  - user.role == "admin" AND
  - document.created_by == user.id AND
  - current_time < document.created_at + 24_hours

Rule 3: User can ACCESS system IF:
  - user.mfa_enabled == true AND
  - user.location IN ["office", "vpn"] AND
  - user.security_clearance >= 3
```

**Policy language (example):**
```
{
  "effect": "allow",
  "principal": {"AWS": "*"},
  "action": "s3:GetObject",
  "resource": "arn:aws:s3:::bucket/documents/*",
  "condition": {
    "StringEquals": {"aws:username": "${document.owner}"},
    "IpAddress": {"aws:SourceIp": "10.0.0.0/8"},
    "DateGreaterThan": {"aws:CurrentTime": "2026-01-01T00:00:00Z"}
  }
}
```

**Pros:**
- Very flexible and powerful
- Dynamic decisions based on context
- Time-based, location-based access
- Attribute changes update permissions automatically
- Scales well for complex systems
- Enables fine-grained control

**Cons:**
- Difficult to implement and test
- Policy explosion: hard to manage many policies
- Performance impact (evaluation complex)
- Audit and debugging harder
- Requires comprehensive attribute data
- Policy conflicts possible

**Challenges:**
1. **Attribute synchronization:** If user changes department, old attributes linger
2. **Policy evaluation performance:** Checking many rules is slow
3. **Testing:** Hard to test all rule combinations
4. **Debugging:** Why was access denied? Many rules involved

**When to use:**
- Complex authorization requirements
- Time/location-based access
- Multi-tenant systems
- Sensitive/classified data
- Zero-trust security models
- Cloud access management

**When NOT to use:**
- Simple applications
- RBAC sufficient
- Attribute data unavailable
- Performance-critical systems

**Real-world examples:** AWS IAM, GCP IAM with Conditions, Azure conditional access

---

### c) Permission-Based Access Control

**How it works:**

Similar to RBAC but grants permissions directly to users (no intermediate role layer).

```
User "John" ← Permission "create_report"
           ← Permission "view_users"
           ← Permission "delete_draft_reports"

User "Jane" ← Permission "create_report"
           ← Permission "view_users"
           ← Permission "delete_all_reports"
           ← Permission "manage_users"
```

**Pros:**
- Simple (one less abstraction layer than RBAC)
- Very flexible
- Easy to grant specific permissions

**Cons:**
- Doesn't scale (too many user-permission assignments)
- Hard to audit ("what can manager role do?" requires listing all users)
- Maintenance nightmare (update all users vs. update one role)
- Violates DRY principle

**When to use:**
- Only for very small systems or specialized cases
- As supplement to RBAC (RBAC for most, direct permissions for exceptions)

---

### d) Policy-Based Access Control

**How it works:**

Authorization defined in policies (declarative rules), evaluated at runtime.

Policies answer: "Is this request allowed?"

**Policy example:**
```
Policy: "Managers can approve expense reports"
  If: user.role == "manager" AND request.action == "approve" AND resource.type == "expense_report"
  Then: allow

Policy: "Employees can only view own documents"
  If: resource.owner == user.id OR user.role == "admin"
  Then: allow
  Else: deny
```

**Policy storage:**
- Database
- Configuration files
- Policy engine (OPA, HashiCorp Sentinel)

**Pros:**
- Highly expressive
- Centralized rule definition
- Easy to audit and change
- Supports complex logic
- Language-agnostic (policies separate from code)

**Cons:**
- Requires policy engine (added complexity)
- Policy conflicts possible
- Debugging complex
- Performance overhead (policy evaluation)

**Tools:**
- Open Policy Agent (OPA) - open-source, Rego language
- HashiCorp Sentinel - Terraform/Cloud
- AWS IAM Policies - cloud-specific
- Azure Policy - cloud-specific

**When to use:**
- Complex authorization rules
- Multi-tenant systems
- Regulatory compliance (policies as documentation)
- Systems requiring frequent permission changes
- DevOps/infrastructure access

---

### e) OAuth 2.0 Scopes

**What it is:**

OAuth 2.0 scopes define what data/actions a token can access.

**Examples:**
```
scope=read:user        → Can read user profile
scope=write:repos      → Can create/modify repositories
scope=delete:repos     → Can delete repositories
scope=repo             → Full repo access
scope=admin:org_hook   → Admin access to org webhooks
```

**Flow:**
```
1. App requests: /authorize?scope=read:user,write:repos
2. User sees: "App requests permission to: Read your profile, Create/modify repos"
3. User approves
4. Token received with those scopes
5. Token can only do those actions (not delete repos without delete scope)
```

**Common scope patterns:**

GitHub-style:
```
read:user, write:user, read:repos, write:repos, delete:repos
```

Google-style:
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/drive
```

**Pros:**
- Principle of least privilege
- User sees what app can do
- Fine-grained token permissions
- Can't be exploited beyond granted scope

**Cons:**
- Scope explosion (too many combinations)
- Users don't understand scopes (too technical)
- No hierarchical relationships between scopes
- Token can't change scopes dynamically

**Best practices:**
- Design minimal scopes
- Document scope meanings
- Request only necessary scopes
- Use readonly scopes by default
- Support scope reduction (app requests less than user granted)

---

### f) ACL (Access Control Lists)

**How it works:**

ACL specifies which users/groups can perform which actions on specific resources.

**Example (file system):**
```
File: report.pdf
Owner: john
ACL:
  - john: read, write, execute, change permissions
  - jane: read, write
  - security_team: read only
  - everyone_else: no access
```

**Implementation:**
```sql
CREATE TABLE acl (
  id, resource_id, principal_id, principal_type,
  permission (read/write/delete/admin)
);

-- Check authorization
SELECT permission FROM acl
WHERE resource_id = ? AND principal_id = ? AND permission = 'read';
```

**Pros:**
- Very fine-grained (per-resource)
- Flexible (different perms per user)
- Easy to audit ("who can access this file?")
- Works for objects/documents
- Good for shared resources

**Cons:**
- Doesn't scale with many resources
- ACL explosion: hard to manage thousands of ACLs
- Performance impact (lookup for every resource)
- Difficult to change permissions in bulk
- User-centric (hard to manage by resource type)

**When to use:**
- Document/file sharing
- Object-level permissions
- Team-based collaboration
- Small number of resources

**When NOT to use:**
- Application-wide authorization (use RBAC)
- Thousands of resources
- Bulk permission changes needed
- Performance-critical systems

**Real-world examples:**
- Google Drive sharing
- Dropbox sharing
- Unix file permissions
- Git repository access

---

## SPRING BOOT IMPLEMENTATION

### a) Spring Security Architecture

**Overview:**

Spring Security is a framework providing authentication, authorization, and protection against common attacks.

```
Request
  ↓
Spring Security Filter Chain
  ↓
  ├─ SecurityContextHolder (contains Authentication object)
  ├─ UserDetailsService (load user from DB)
  ├─ PasswordEncoder (hash/verify passwords)
  ├─ AuthenticationProvider (perform authentication)
  └─ AuthorizationManager (check permissions)
  ↓
Response
```

**Core Components:**

1. **SecurityFilterChain (formerly WebSecurityConfigurerAdapter)**
   - Sequence of filters handling security
   - Every HTTP request passes through this chain
   - Configurable per endpoint

2. **Authentication Object**
   ```java
   Authentication {
     Principal principal,      // Who? (user details)
     Credentials credentials,  // What proves it? (password, token)
     Authorities authorities,  // What can they do? (roles/permissions)
     boolean isAuthenticated,
     Map<String,Object> details
   }
   ```

3. **SecurityContext**
   ```java
   SecurityContext {
     Authentication authentication  // Current logged-in user
   }
   ```
   - Stored in `SecurityContextHolder` (ThreadLocal by default)
   - Access anywhere: `SecurityContextHolder.getContext().getAuthentication()`

4. **UserDetailsService**
   ```java
   interface UserDetailsService {
     UserDetails loadUserByUsername(String username);
   }
   ```
   - Loads user from database on login
   - Usually implemented with JPA/Hibernate

5. **PasswordEncoder**
   ```java
   interface PasswordEncoder {
     String encode(String rawPassword);           // Hash password
     boolean matches(String rawPassword, String encodedPassword);
   }
   ```
   - BCryptPasswordEncoder (recommended)
   - Argon2PasswordEncoder (best, but slower)

**Authentication Flow:**

```
1. User submits login form
   POST /login {username, password}

2. UsernamePasswordAuthenticationFilter intercepts
   - Creates Authentication object with username + password
   - Passes to AuthenticationManager

3. AuthenticationManager delegates to AuthenticationProvider
   - Calls UserDetailsService.loadUserByUsername(username)
   - Gets UserDetails from database

4. AuthenticationProvider:
   - Compares submitted password with stored hash using PasswordEncoder
   - If matches → create Authentication with authorities
   - If fails → throw BadCredentialsException

5. SuccessfulAuthenticationHandler:
   - Creates SecurityContext with Authentication
   - Stores in SecurityContextHolder
   - Creates session (if session-based) or returns JWT (if token-based)

6. User now authenticated for future requests
```

**Configuration (Spring Boot 3.0+ style):**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .authorizeHttpRequests(authz -> authz
        .requestMatchers("/public/**").permitAll()
        .requestMatchers("/admin/**").hasRole("ADMIN")
        .anyRequest().authenticated()
      )
      .formLogin(form -> form
        .loginPage("/login")
        .defaultSuccessUrl("/home")
      )
      .logout(logout -> logout.logoutUrl("/logout"))
      .csrf(csrf -> csrf.disable());  // For REST APIs

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);  // Work factor 12
  }

  @Bean
  public AuthenticationManager authenticationManager(UserDetailsService userDetailsService) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
    provider.setUserDetailsService(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder());
    return new ProviderManager(provider);
  }
}
```

---

### b) JWT Implementation in Spring Boot

**Complete Flow (Register → Login → Protected Endpoint):**

**Step 1: User Registration**
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  @Autowired private UserRepository userRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
    // Check if user exists
    if (userRepository.existsByEmail(req.getEmail())) {
      return ResponseEntity.badRequest().body("Email already taken");
    }

    // Create user with hashed password
    User user = new User();
    user.setEmail(req.getEmail());
    user.setPassword(passwordEncoder.encode(req.getPassword()));
    user.setRoles(Set.of(new Role("ROLE_USER")));

    userRepository.save(user);

    return ResponseEntity.ok("User registered successfully");
  }
}
```

**Step 2: User Login (Generate Tokens)**
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest req) {
  // Authenticate using Spring Security
  Authentication auth = authenticationManager.authenticate(
    new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
  );

  // Generate JWT access token
  String accessToken = jwtProvider.generateAccessToken(auth);

  // Generate JWT refresh token
  String refreshToken = jwtProvider.generateRefreshToken(auth);

  // Store refresh token in DB or Redis
  RefreshToken rt = new RefreshToken();
  rt.setToken(refreshToken);
  rt.setUser((User) auth.getPrincipal());
  rt.setExpiryDate(Instant.now().plus(7, ChronoUnit.DAYS));
  refreshTokenRepository.save(rt);

  // Return tokens
  return ResponseEntity.ok()
    .header("Set-Cookie", "refreshToken=" + refreshToken +
      "; HttpOnly; Secure; SameSite=Strict; Max-Age=604800")
    .body(new AuthResponse(accessToken, "Bearer"));
}
```

**JWT Provider (Token Generation & Validation):**
```java
@Component
public class JwtProvider {

  @Value("${jwt.secret}")
  private String jwtSecret;  // From application.yml

  @Value("${jwt.expiration}")
  private int jwtExpiration;  // 15 minutes in milliseconds

  public String generateAccessToken(Authentication auth) {
    UserDetails userDetails = (UserDetails) auth.getPrincipal();

    Map<String, Object> claims = new HashMap<>();
    claims.put("roles", auth.getAuthorities().stream()
      .map(GrantedAuthority::getAuthority)
      .collect(Collectors.toList()));

    return Jwts.builder()
      .setClaims(claims)
      .setSubject(userDetails.getUsername())
      .setIssuedAt(new Date())
      .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
      .signWith(SignatureAlgorithm.HS512, jwtSecret)
      .compact();
  }

  public String generateRefreshToken(Authentication auth) {
    UserDetails userDetails = (UserDetails) auth.getPrincipal();

    return Jwts.builder()
      .setSubject(userDetails.getUsername())
      .setIssuedAt(new Date())
      .setExpiration(new Date(System.currentTimeMillis() + 7 * 24 * 60 * 60 * 1000))
      .signWith(SignatureAlgorithm.HS512, jwtSecret)
      .compact();
  }

  public String getUsernameFromToken(String token) {
    return Jwts.parser()
      .setSigningKey(jwtSecret)
      .parseClaimsJws(token)
      .getBody()
      .getSubject();
  }

  public boolean validateToken(String token) {
    try {
      Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token);
      return true;
    } catch (SignatureException e) {
      log.error("Invalid JWT signature");
    } catch (MalformedJwtException e) {
      log.error("Invalid JWT token");
    } catch (ExpiredJwtException e) {
      log.error("Expired JWT token");
    } catch (UnsupportedJwtException e) {
      log.error("Unsupported JWT token");
    } catch (IllegalArgumentException e) {
      log.error("JWT claims string is empty");
    }
    return false;
  }
}
```

**Step 3: JWT Filter (Validate Token on Every Request)**
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  @Autowired private JwtProvider jwtProvider;
  @Autowired private UserDetailsService userDetailsService;

  @Override
  protected void doFilterInternal(HttpServletRequest req,
                                   HttpServletResponse res,
                                   FilterChain filterChain)
    throws ServletException, IOException {

    try {
      // Extract token from Authorization header
      String jwt = getJwtFromRequest(req);

      if (jwt != null && jwtProvider.validateToken(jwt)) {
        // Get username from token
        String username = jwtProvider.getUsernameFromToken(jwt);

        // Load user details
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        // Create Authentication object
        Authentication auth = new UsernamePasswordAuthenticationToken(
          userDetails, null, userDetails.getAuthorities()
        );

        // Store in SecurityContext (valid for this request)
        SecurityContextHolder.getContext().setAuthentication(auth);
      }
    } catch (Exception e) {
      log.error("Could not set user authentication: " + e.getMessage());
    }

    filterChain.doFilter(req, res);
  }

  private String getJwtFromRequest(HttpServletRequest request) {
    String bearerToken = request.getHeader("Authorization");
    if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
      return bearerToken.substring(7);
    }
    return null;
  }
}
```

**Step 4: Register Filter in Security Config**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Autowired private JwtAuthenticationFilter jwtAuthenticationFilter;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      .exceptionHandling(exceptions -> exceptions
        .authenticationEntryPoint(new JwtEntryPoint())
      )
      .sessionManagement(session -> session
        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // No sessions
      )
      .authorizeHttpRequests(authz -> authz
        .requestMatchers("/api/auth/**").permitAll()
        .anyRequest().authenticated()
      )
      .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }
}
```

**Step 5: Token Refresh Endpoint**
```java
@PostMapping("/refresh")
public ResponseEntity<?> refreshToken(HttpServletRequest request) {
  // Get refresh token from cookie
  String refreshToken = Arrays.stream(request.getCookies())
    .filter(cookie -> "refreshToken".equals(cookie.getName()))
    .map(Cookie::getValue)
    .findFirst()
    .orElse(null);

  if (refreshToken == null || !jwtProvider.validateToken(refreshToken)) {
    return ResponseEntity.status(401).body("Invalid refresh token");
  }

  String username = jwtProvider.getUsernameFromToken(refreshToken);
  UserDetails userDetails = userDetailsService.loadUserByUsername(username);

  // Generate new access token
  Authentication auth = new UsernamePasswordAuthenticationToken(
    userDetails, null, userDetails.getAuthorities()
  );
  String newAccessToken = jwtProvider.generateAccessToken(auth);

  return ResponseEntity.ok(new AuthResponse(newAccessToken, "Bearer"));
}
```

**Step 6: Protected Endpoint (Requires Authentication)**
```java
@RestController
@RequestMapping("/api/users")
public class UserController {

  @GetMapping("/profile")
  public ResponseEntity<?> getProfile() {
    // Get authenticated user from SecurityContext
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    UserDetails userDetails = (UserDetails) auth.getPrincipal();

    return ResponseEntity.ok("Profile for: " + userDetails.getUsername());
  }
}
```

**application.yml Configuration:**
```yaml
jwt:
  secret: "very-long-secret-key-at-least-256-bits-or-more-characters-here"
  expiration: 900000  # 15 minutes
```

---

### c) OAuth 2.0 with Spring Security

**Spring Authorization Server (AS) Setup:**

```java
@Configuration
@EnableAuthorizationServer
public class AuthServerConfig extends AuthorizationServerConfigurerAdapter {

  @Autowired private AuthenticationManager authenticationManager;

  @Override
  public void configure(AuthorizationServerSecurityConfigurer security)
    throws Exception {
    security.tokenKeyAccess("permitAll()").checkTokenAccess("isAuthenticated()");
  }

  @Override
  public void configure(ClientDetailsServiceConfigurer clients)
    throws Exception {
    clients.inMemory()
      .withClient("client-app")
      .secret(passwordEncoder.encode("client-secret"))
      .authorizedGrantTypes("authorization_code", "refresh_token")
      .scopes("read", "write")
      .redirectUris("http://localhost:3000/callback");
  }

  @Override
  public void configure(AuthorizationServerEndpointsConfigurer endpoints)
    throws Exception {
    endpoints.authenticationManager(authenticationManager);
  }
}
```

**Resource Server Config (Validates JWT from AS):**

```java
@Configuration
@EnableResourceServer
public class ResourceServerConfig extends ResourceServerConfigurerAdapter {

  @Override
  public void configure(HttpSecurity http) throws Exception {
    http.authorizeRequests()
      .antMatchers("/public/**").permitAll()
      .anyRequest().authenticated()
      .and()
      .oauth2();
  }
}
```

**Social Login (Google, GitHub):**

```java
@Configuration
public class OAuth2SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .oauth2Login(oauth2 -> oauth2
        .loginPage("/login")
        .defaultSuccessUrl("/home")
      )
      .authorizeHttpRequests(authz -> authz
        .requestMatchers("/login/**", "/oauth2/**").permitAll()
        .anyRequest().authenticated()
      );

    return http.build();
  }
}
```

**application.yml:**
```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: your-client-id
            client-secret: your-client-secret
            scope: profile, email
          github:
            client-id: your-client-id
            client-secret: your-client-secret
            scope: read:user, user:email
```

---

### d) Method-Level Security (@PreAuthorize)

**Enable Method Security:**
```java
@Configuration
@EnableMethodSecurity(
  prePostEnabled = true,  // @PreAuthorize, @PostAuthorize
  securedEnabled = true,  // @Secured
  jsr250Enabled = true    // @RolesAllowed
)
public class MethodSecurityConfig {
}
```

**@PreAuthorize (Most Flexible):**
```java
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  // Only users with ROLE_ADMIN
  @PreAuthorize("hasRole('ADMIN')")
  @DeleteMapping("/{id}")
  public ResponseEntity<?> deleteReport(@PathVariable Long id) {
    // Delete logic
    return ResponseEntity.ok("Deleted");
  }

  // Only users with read:reports scope
  @PreAuthorize("hasAuthority('SCOPE_read:reports')")
  @GetMapping
  public ResponseEntity<?> listReports() {
    return ResponseEntity.ok(reports);
  }

  // Complex: user is report owner OR is admin
  @PreAuthorize("@reportService.isOwner(#id) or hasRole('ADMIN')")
  @PutMapping("/{id}")
  public ResponseEntity<?> updateReport(@PathVariable Long id, @RequestBody Report report) {
    // Update logic
    return ResponseEntity.ok(updated);
  }

  // Access to resource owned by user
  @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
  @GetMapping("/user/{userId}")
  public ResponseEntity<?> getUserReports(@PathVariable Long userId) {
    return ResponseEntity.ok(reports);
  }

  // Time-based access
  @PreAuthorize("T(java.time.LocalDateTime).now().getHour() >= 9 && " +
               "T(java.time.LocalDateTime).now().getHour() < 17")
  @GetMapping("/business-hours")
  public ResponseEntity<?> businessHoursOnly() {
    return ResponseEntity.ok("Only during business hours");
  }
}
```

**@PostAuthorize (Filters Return Value):**
```java
@PostAuthorize("returnObject.owner == authentication.principal.id or hasRole('ADMIN')")
@GetMapping("/{id}")
public Report getReport(@PathVariable Long id) {
  return reportRepository.findById(id);  // Throws if not authorized
}
```

**@Secured (Role-only):**
```java
@Secured("ROLE_ADMIN")
@DeleteMapping("/{id}")
public ResponseEntity<?> deleteReport(@PathVariable Long id) {
  return ResponseEntity.ok("Deleted");
}
```

**@RolesAllowed (JSR-250 standard):**
```java
@RolesAllowed("ADMIN")
@DeleteMapping("/{id}")
public ResponseEntity<?> deleteReport(@PathVariable Long id) {
  return ResponseEntity.ok("Deleted");
}
```

**Custom Security Expression:**
```java
@Component("reportService")
public class ReportService {

  @Autowired private ReportRepository reportRepository;

  public boolean isOwner(Long reportId) {
    Report report = reportRepository.findById(reportId).orElse(null);
    String currentUser = SecurityContextHolder.getContext()
      .getAuthentication().getName();
    return report != null && report.getOwner().equals(currentUser);
  }
}
```

---

### e) CORS + CSRF Handling

**CORS Configuration:**
```java
@Configuration
public class CorsConfig {

  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
          .allowedOrigins("http://localhost:3000", "https://example.com")
          .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
          .allowedHeaders("*")
          .allowCredentials(true)
          .maxAge(3600);
      }
    };
  }
}
```

**Or in Spring Security:**
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
  http.cors(cors -> cors
    .configurationSource(request -> {
      CorsConfiguration config = new CorsConfiguration();
      config.setAllowedOrigins(List.of("http://localhost:3000"));
      config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
      config.setAllowCredentials(true);
      return config;
    })
  );
  return http.build();
}
```

**CSRF Protection (Form-based apps):**
```java
http.csrf(csrf -> csrf
  .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
  .ignoringRequestMatchers("/api/**")  // Ignore for stateless APIs
);
```

**Why disable CSRF for REST APIs:**
- REST APIs use JWT or stateless auth
- CSRF attacks require session cookies
- Stateless APIs can't verify CSRF tokens properly
- Use JWT validation instead

---

## EDGE CASES & PITFALLS

### Token Expiration Handling

**Problem:** When access token expires, client receives 401 error.

**Solution (Refresh Pattern):**
```javascript
// React hook for API calls with auto-refresh
const useAuthenticatedFetch = () => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));

  const fetchWithAuth = async (url, options = {}) => {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // If 401, try refresh
    if (response.status === 401) {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'  // Include refresh token cookie
      });

      if (refreshResponse.ok) {
        const { accessToken: newToken } = await refreshResponse.json();
        setAccessToken(newToken);
        localStorage.setItem('accessToken', newToken);

        // Retry original request
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`
          }
        });
      }
    }

    return response;
  };

  return { fetchWithAuth };
};
```

### Race Conditions in Token Refresh

**Problem:** Multiple API calls expire simultaneously → multiple refresh requests.

**Solution (Refresh Token Rotation):**

Each refresh returns new refresh token (old token invalidated).

```java
@PostMapping("/refresh")
public ResponseEntity<?> refreshToken(HttpServletRequest request) {
  String refreshToken = getRefreshToken(request);

  // Check if token already used (revoked)
  if (refreshTokenRepository.isRevoked(refreshToken)) {
    // Suspicious: possible token replay attack
    invalidateAllUserTokens(getUserFromToken(refreshToken));
    return ResponseEntity.status(401).body("Refresh token revoked");
  }

  // Generate new tokens
  String newAccessToken = jwtProvider.generateAccessToken(auth);
  String newRefreshToken = jwtProvider.generateRefreshToken(auth);

  // Revoke old refresh token
  refreshTokenRepository.revoke(refreshToken);

  // Store new refresh token
  refreshTokenRepository.save(newRefreshToken);

  return ResponseEntity.ok(new AuthResponse(newAccessToken, newRefreshToken));
}
```

**Frontend:**
```javascript
// Promise-based lock to prevent race conditions
let refreshPromise = null;

const ensureAccessToken = async () => {
  if (accessToken && !isExpired(accessToken)) {
    return accessToken;
  }

  // If refresh already in progress, wait for it
  if (refreshPromise) {
    await refreshPromise;
    return accessToken;
  }

  // Perform refresh only once
  refreshPromise = (async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      const { accessToken: newToken } = await response.json();
      setAccessToken(newToken);
    } else {
      redirectToLogin();
    }
  })();

  await refreshPromise;
  refreshPromise = null;
  return accessToken;
};
```

### Session Fixation Attacks

**Problem:** Attacker tricks user into using attacker-controlled session ID.

```
1. Attacker accesses app → gets session id=abc123
2. Attacker tricks user into visiting: /login?sessionid=abc123
3. User logs in with attacker's session ID
4. Attacker can now use session abc123 as logged-in user
```

**Solution (Session Regeneration on Login):**
```java
@PostMapping("/login")
public ResponseEntity<?> login(HttpServletRequest request) {
  // Invalidate old session
  request.getSession(false).invalidate();

  // Create new session after authentication
  HttpSession newSession = request.getSession(true);
  newSession.setAttribute("userId", user.getId());
  newSession.setMaxInactiveInterval(1800);  // 30 minutes

  return ResponseEntity.ok("Logged in");
}
```

### CSRF vs Stateless APIs

**CSRF (Cross-Site Request Forgery):**
```
1. User logged in to bank.com (has session cookie)
2. User visits evil.com while logged in
3. evil.com sends: POST bank.com/transfer {amount: 1000, to: attacker}
4. Browser includes bank.com session cookie automatically
5. Bank processes transfer (user didn't intend this)
```

**Why CSRF doesn't affect stateless APIs:**
- Stateless APIs require JWT in Authorization header (not automatic like cookies)
- `<img src="api.example.com/transfer">` can't include Authorization header
- Attacker would need to write JavaScript (but SOP blocks cross-domain access)

**CSRF Protection for Session-Based Apps:**
```java
http.csrf(csrf -> csrf
  .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
);
```

Flow:
```
1. Server returns CSRF token in response
2. Client includes token in X-CSRF-TOKEN header on POST/PUT/DELETE
3. Attacker can't read token (on different domain) → can't include in request
```

### JWT Size Bloat

**Problem:** JWT grows with each claim, affecting bandwidth.

**Example (bloated JWT):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwi... [8KB of claims] ...
```

**Solution:**
```java
// Only include necessary claims
Map<String, Object> claims = new HashMap<>();
claims.put("sub", user.getId());
claims.put("roles", extractRoles(user));
// DON'T include: full user object, all permissions, unnecessary data

return Jwts.builder()
  .setClaims(claims)
  .signWith(SignatureAlgorithm.HS512, jwtSecret)
  .compact();
```

**Rule:** JWT should be <1KB typically. >5KB is problematic.

### Storing Secrets Securely

**DON'T:**
```java
// ❌ Hardcoded secret
private String jwtSecret = "super-secret-key";

// ❌ In source code
// ❌ In application.properties
spring.security.jwt.secret=super-secret-key

// ❌ In environment variable visible to all processes
String secret = System.getenv("JWT_SECRET");
```

**DO:**
```java
// ✅ Environment variable (process-specific)
String secret = System.getenv("JWT_SECRET");

// ✅ Spring Vault integration
@Value("${vault.jwt.secret}")
private String jwtSecret;

// ✅ AWS Secrets Manager
SecretsManagerClient client = SecretsManagerClient.builder().build();
GetSecretValueRequest request = GetSecretValueRequest.builder()
  .secretId("jwt-secret")
  .build();
String secret = client.getSecretValue(request).secretString();

// ✅ Docker secrets (Kubernetes, Swarm)
String secret = new String(Files.readAllBytes(
  Paths.get("/run/secrets/jwt_secret")
));
```

### Password Reset Flow Security

**Vulnerability: Password reset token reused:**
```
1. User requests password reset
2. Server generates token: reset123
3. User clicks link: /reset?token=reset123
4. User submits new password
5. Token NOT invalidated
6. Attacker uses same token reset123 again
```

**Secure implementation:**
```java
@PostMapping("/reset-password")
public ResponseEntity<?> resetPassword(@RequestBody ResetRequest req) {
  PasswordResetToken token = resetTokenRepository.findByToken(req.getToken());

  // Checks
  if (token == null) return ResponseEntity.badRequest().body("Invalid token");
  if (token.isExpired()) return ResponseEntity.badRequest().body("Token expired");
  if (token.isUsed()) return ResponseEntity.badRequest().body("Token already used");

  // Update password
  User user = token.getUser();
  user.setPassword(passwordEncoder.encode(req.getNewPassword()));
  userRepository.save(user);

  // Invalidate token
  token.setUsed(true);
  token.setUsedAt(LocalDateTime.now());
  resetTokenRepository.save(token);

  // Invalidate all other tokens for this user
  resetTokenRepository.deleteAllByUserAndNotId(user, token.getId());

  return ResponseEntity.ok("Password reset successful");
}
```

**Additional security:**
- Generate token with crypto random (SecureRandom)
- Token expires in 30 minutes
- One-time use
- Hash token before storing in DB (don't store plaintext)

### Brute Force Protection (Rate Limiting)

**Problem:** Attacker tries 1000 password combinations per second.

**Spring Security with rate limiting:**
```java
@Component
public class BruteForceProtection {

  private final Map<String, AttemptLog> attemptsCache = new ConcurrentHashMap<>();

  public boolean isBlocked(String username) {
    if (!attemptsCache.containsKey(username)) {
      return false;
    }

    AttemptLog log = attemptsCache.get(username);
    if (log.getAttempts() >= 5) {  // 5 failed attempts
      long timeLocked = ChronoUnit.MINUTES.between(log.getLastAttempt(), LocalDateTime.now());
      return timeLocked < 15;  // Locked for 15 minutes
    }
    return false;
  }

  public void loginSucceeded(String username) {
    attemptsCache.remove(username);
  }

  public void loginFailed(String username) {
    AttemptLog log = attemptsCache.getOrDefault(username,
      new AttemptLog());
    log.addAttempt();
    log.setLastAttempt(LocalDateTime.now());
    attemptsCache.put(username, log);
  }
}
```

**Usage in authentication:**
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest req) {
  if (bruteForceProtection.isBlocked(req.getEmail())) {
    return ResponseEntity.status(429)
      .body("Too many failed attempts. Try again in 15 minutes.");
  }

  try {
    Authentication auth = authenticationManager.authenticate(
      new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
    );
    bruteForceProtection.loginSucceeded(req.getEmail());
    // Generate tokens...
  } catch (BadCredentialsException e) {
    bruteForceProtection.loginFailed(req.getEmail());
    return ResponseEntity.status(401).body("Invalid credentials");
  }
}
```

### Account Lockout Strategies

**Time-based lockout:**
- Lock account for 15-30 minutes after N failed attempts
- Temporary (user can try again later)
- Auto-unlock

**Manual unlock:**
- Require admin intervention
- More secure but burdensome
- Good for sensitive systems

**Email verification unlock:**
- Send unlock link via email
- Verifies email ownership
- Prevents false lockouts

### Token in URL (Don't Do This!)

**Why NOT to put JWT in URL:**
```
// ❌ DON'T
GET /api/protected?token=eyJhbGc...

Risks:
- URL logged in server access logs (token exposed)
- URL visible in browser history
- URL in Referer header sent to other sites
- Browser autocomplete suggests token
- Screenshot contains token
```

**DO:**
```javascript
// ✅ Authorization header
fetch('/api/protected', {
  headers: {
    'Authorization': 'Bearer eyJhbGc...'
  }
});

// ✅ Cookie (HttpOnly)
fetch('/api/protected', {
  credentials: 'include'  // Auto-includes cookies
});
```

### Logout in Stateless Systems

**Problem:** With JWT, server has no control over token.

**Solutions:**

1. **Token Blacklist (simple but doesn't scale)**
   ```java
   @Component
   public class TokenBlacklist {
     private final Set<String> blacklistedTokens = ConcurrentHashMap.newKeySet();

     public void logout(String token) {
       blacklistedTokens.add(token);  // Cache token until expiry
     }

     public boolean isBlacklisted(String token) {
       return blacklistedTokens.contains(token);
     }
   }
   ```

2. **Refresh Token Revocation (better)**
   ```java
   @PostMapping("/logout")
   public ResponseEntity<?> logout(HttpServletRequest request) {
     String refreshToken = getRefreshTokenFromCookie(request);
     refreshTokenRepository.revoke(refreshToken);
     return ResponseEntity.ok("Logged out");
   }
   ```
   - Access token continues working (can't revoke)
   - On refresh, revoked refresh token rejected
   - Next login requires credentials again

3. **Short Access Token Lifespan (best)**
   - Access token: 15 minutes
   - On logout, refresh token revoked
   - Access token expires naturally in 15 minutes
   - No explicit revocation needed

### Multi-Device Session Management

**Problem:** User logs in on phone → wants different permissions than desktop.

**Solution:**
```java
@Entity
public class UserSession {
  Long id;
  User user;
  String deviceId;
  String deviceName;
  String ipAddress;
  LocalDateTime loginTime;
  LocalDateTime lastActivity;
  boolean active;
}

@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest httpReq) {
  String deviceId = req.getDeviceId();  // From client
  String ipAddress = getClientIpAddress(httpReq);

  UserSession session = new UserSession();
  session.setUser(user);
  session.setDeviceId(deviceId);
  session.setIpAddress(ipAddress);
  session.setActive(true);
  sessionRepository.save(session);

  // Include sessionId in JWT
  claims.put("sessionId", session.getId());
  String token = jwtProvider.generateAccessToken(auth, claims);

  return ResponseEntity.ok(new AuthResponse(token));
}
```

**Logout from all devices:**
```java
@PostMapping("/logout-all")
public ResponseEntity<?> logoutAllDevices() {
  Long userId = getCurrentUserId();
  sessionRepository.deactivateAllSessions(userId);
  return ResponseEntity.ok("Logged out from all devices");
}
```

### Clock Skew Issues with JWT

**Problem:** Server clocks slightly different (exp claim validation fails).

```
Server A: 10:00:00 (issue token with exp=10:15:00)
Server B: 10:00:10 (validates token, time is 10:00:10)
But Server B thinks token already expired if checking strictly
```

**Solution (Add clock skew tolerance):**
```java
public boolean validateToken(String token) {
  try {
    Claims claims = Jwts.parser()
      .setSigningKey(jwtSecret)
      .parseClaimsJws(token)
      .getBody();

    // Allow 60 second clock skew
    Date expiration = claims.getExpiration();
    Date now = new Date();
    long skewMillis = 60 * 1000;  // 60 seconds

    if (expiration.getTime() + skewMillis < now.getTime()) {
      throw new ExpiredJwtException(null, claims, "Token expired");
    }

    return true;
  } catch (ExpiredJwtException e) {
    log.error("Token expired");
    return false;
  }
}
```

---

## COMPARISON TABLES

### Authentication Methods Comparison

| Method | Security | Complexity | Scalability | Best For | Worst For | Spring Support |
|--------|----------|-----------|-------------|----------|-----------|--------|
| Basic Auth | Low | Low | Poor | Scripts, internal APIs | Public APIs, production | Built-in |
| Sessions | Medium | Medium | Poor | Server-rendered apps | Distributed systems | Built-in |
| JWT | High | Medium | Excellent | REST APIs, SPAs, mobile | Instant logout needed | Excellent (spring-security-oauth2-jose) |
| OAuth 2.0 | Very High | High | Excellent | Social login, third-party | Simple internal apps | Excellent (spring-security-oauth2) |
| OIDC | Very High | High | Excellent | Enterprise SSO, consumer | Simple systems | Excellent |
| API Keys | Medium | Low | Excellent | Service-to-service | User authentication | Manual |
| mTLS | Very High | Very High | Excellent | Microservices, zero-trust | User-facing apps | Need Spring Cloud Security |
| SAML | Very High | Very High | Good | Enterprise SSO | Modern apps, mobile | Excellent (spring-security-saml2) |
| Magic Links | High | Medium | Good | Infrequent login | Frequent login apps | Custom required |
| WebAuthn | Very High | High | Excellent | High-security needs | Legacy browsers | Custom/third-party |

### Authorization Models Comparison

| Model | Flexibility | Scalability | Complexity | Audit Trail | Best For | Worst For |
|-------|-------------|------------|-----------|------------|----------|-----------|
| RBAC | Medium | Good | Low | Good | Traditional apps | Complex permissions |
| ABAC | Very High | Medium | Very High | Difficult | Complex rules, context | Simple systems |
| Permissions | Low | Poor | Low | Good | Simple systems | Large user base |
| Policy-Based | Very High | Good | High | Excellent | Compliance, complex | Simple systems |
| OAuth Scopes | Medium | Excellent | Medium | Good | API access delegation | Internal-only |
| ACL | Very High | Poor | Medium | Excellent | Per-resource control | Many resources |

---

## BEST PRACTICES

### 1. Password Hashing

**Recommendation: Argon2id (best) or BCrypt (very good)**

```java
// Argon2id (recommended for new projects)
@Bean
public PasswordEncoder passwordEncoder() {
  return new Argon2PasswordEncoder(
    16,      // Salt length (bytes)
    32,      // Hash length (bytes)
    1,       // Parallelism (CPU threads)
    19*1024, // Memory (19 MiB)
    2        // Iterations
  );
}

// BCrypt (if Argon2 unavailable)
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12);  // Work factor 12
}
```

**Never do:**
- Plain text passwords
- MD5 or SHA-1 (broken)
- Simple salts (must be unique per hash)
- Excessive work factors (causes DoS)

### 2. HTTPS Everywhere

**Must have:**
- HTTPS on all endpoints serving auth
- Certificate from trusted CA
- TLS 1.2 minimum (1.3 preferred)
- Strong ciphers only

**Server configuration:**
```yaml
server:
  port: 8443
  ssl:
    key-store: classpath:keystore.jks
    key-store-password: password
    key-store-type: JKS
    key-alias: tomcat
    protocol: TLSv1.3
```

### 3. Secure Headers

```java
@Configuration
public class SecurityHeadersConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.headers(headers -> headers
      .hsts(hsts -> hsts
        .maxAgeInSeconds(31536000)     // 1 year
        .includeSubDomains(true)
      )
      .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'self'")
      )
      .xssProtection(xss -> xss.and())
      .frameOptions(frameOptions -> frameOptions.sameOrigin())
    );

    return http.build();
  }
}
```

**Key headers:**
- `Strict-Transport-Security`: Force HTTPS
- `Content-Security-Policy`: Prevent XSS
- `X-Content-Type-Options: nosniff`: Prevent MIME sniffing
- `X-Frame-Options: DENY`: Prevent clickjacking

### 4. Rate Limiting

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private final RateLimiter rateLimiter = RateLimiter.create(10);  // 10 requests/sec

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain filterChain)
    throws ServletException, IOException {

    if (!rateLimiter.tryAcquire()) {
      response.setStatus(429);
      response.setContentType("application/json");
      response.getWriter().write("{\"error\": \"Too many requests\"}");
      return;
    }

    filterChain.doFilter(request, response);
  }
}
```

### 5. Audit Logging

```java
@Component
public class SecurityAuditLogger {

  @Autowired private AuditLogRepository auditLogRepository;

  public void logAuthentication(String username, boolean success, String ipAddress) {
    AuditLog log = new AuditLog();
    log.setTimestamp(LocalDateTime.now());
    log.setUsername(username);
    log.setAction("LOGIN");
    log.setSuccess(success);
    log.setIpAddress(ipAddress);
    auditLogRepository.save(log);
  }

  public void logAuthorizationFailure(String username, String resource) {
    AuditLog log = new AuditLog();
    log.setTimestamp(LocalDateTime.now());
    log.setUsername(username);
    log.setAction("UNAUTHORIZED_ACCESS");
    log.setResource(resource);
    auditLogRepository.save(log);
  }
}
```

### 6. Principle of Least Privilege

- Grant only necessary permissions
- Default deny (explicit allow required)
- Regular permission audits
- Remove unused roles/permissions

### 7. Defense in Depth

Layer multiple security controls:
1. HTTPS (encryption)
2. Authentication (who are you?)
3. Authorization (what can you do?)
4. Input validation (prevent injection)
5. Rate limiting (prevent brute force)
6. Audit logging (detect threats)
7. Monitoring (alerts)

---

## TypeScript/React Developer Perspective

### How NextAuth.js Maps to Spring Security Concepts

| Spring Security | NextAuth.js | Purpose |
|---|---|---|
| SecurityFilterChain | API route handlers | Intercept requests |
| AuthenticationManager | credentials() provider | Validate credentials |
| UserDetailsService | getProvider() | Load user details |
| SecurityContext | session (server-side) | Store user state |
| Authentication object | JWT payload | Represent logged-in user |
| PasswordEncoder | handled by provider | Hash passwords |
| @PreAuthorize | middleware auth checks | Method-level security |

### NextAuth.js Configuration (with Spring Backend)

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Spring Backend",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Call Spring Boot backend
        const response = await fetch("http://localhost:8080/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password
          })
        });

        if (!response.ok) {
          throw new Error("Invalid credentials");
        }

        const data = await response.json();

        return {
          id: data.userId,
          email: data.email,
          name: data.name,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60  // 15 minutes (matches Spring access token)
  },
  pages: {
    signIn: "/login",
    error: "/login"
  }
});

export { handler as GET, handler as POST };
```

### React Context Auth (Maps to SecurityContext)

**Spring Security SecurityContext:**
```java
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();
Collection<? extends GrantedAuthority> roles = auth.getAuthorities();
```

**React Context equivalent:**
```typescript
// lib/auth-context.tsx
import { createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from session (like SecurityContextHolder.getContext())
    const loadUser = async () => {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be in AuthProvider');
  return context;
}
```

### Middleware Auth (Maps to SecurityFilterChain)

**Spring Security FilterChain:**
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
  http
    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
    .authorizeHttpRequests(authz -> authz
      .requestMatchers("/public/**").permitAll()
      .anyRequest().authenticated()
    );
  return http.build();
}
```

**Next.js middleware (equivalent):**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Allow public routes
  if (request.nextUrl.pathname.startsWith('/public')) {
    return NextResponse.next();
  }

  // Require authentication for other routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)']
};
```

### Cookie-Based Auth from Frontend Perspective

**Comparison: Cookies vs Authorization Headers**

| Aspect | Cookies | Authorization Header |
|--------|---------|---------------------|
| **Automatic inclusion** | Yes (browser handles) | No (must be manual) |
| **XSS vulnerability** | HttpOnly flag protects | localStorage exposed |
| **CSRF vulnerability** | Yes (requires CSRF token) | No (not automatic) |
| **Domain binding** | Domain + path | None |
| **Setup complexity** | Less code | More code |
| **Best for** | Server-rendered apps | SPAs, REST APIs |

**Cookie implementation (React + Spring):**
```typescript
// Login stores token in HttpOnly cookie (Spring sets it)
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'  // Include cookies
  });

  if (response.ok) {
    setIsAuthenticated(true);
    // Browser stores Set-Cookie automatically
  }
};

// Protected requests include cookie automatically
const fetchProtected = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include'  // Browser includes HttpOnly cookies
  });
  return response.json();
};
```

### JWT in React (localStorage vs. Cookie)

**localStorage (avoid for sensitive tokens):**
```typescript
// ❌ XSS risk if malicious script injected
localStorage.setItem('accessToken', token);
const token = localStorage.getItem('accessToken');
```

**HttpOnly Cookie (recommended):**
```typescript
// ✅ Spring sets HttpOnly cookie
// JavaScript can't access it (XSS protection)
// Browser includes it automatically on same-domain requests
fetch('/api/protected', {
  credentials: 'include'
});
```

**Memory + Refresh Token Pattern (secure):**
```typescript
const useAuthStore = create((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),

  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'  // Get refresh token in HttpOnly cookie
    });

    const { accessToken } = await response.json();
    set({ accessToken });  // Store in memory only (cleared on page refresh)
  },

  refreshAccessToken: async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'  // Use refresh token from cookie
    });

    const { accessToken } = await response.json();
    set({ accessToken });
  }
}));
```

---

## Methodology

**Knowledge Tiers Used:** WebSearch, official documentation

**Research Approach:**
1. **Foundations**: Authentication vs authorization difference, historical evolution, OWASP threats
2. **Authentication Methods**: Deep dive on 10 major approaches with pros/cons/use cases
3. **Authorization Models**: 6 major approaches with comparison
4. **Spring Boot**: Official Spring Security patterns, JWT, OAuth 2.0, method-level security
5. **Edge Cases**: Common pitfalls, security vulnerabilities, mitigations
6. **Frontend Integration**: NextAuth.js, React context, middleware patterns

**Sources Consulted:**
- Auth0, Okta, OWASP official documentation
- Spring Security official docs
- GitHub repositories with implementations
- Recent 2025-2026 articles on authentication trends
- Enterprise SSO providers (Microsoft, Google, Auth0)

**Currency:** Information dated 2024-2026, reflects current best practices

**Coverage Gaps:** None identified. Research covers all requested sections comprehensively.

---

## Unresolved Questions

1. **Quantum Computing Impact on Cryptography**: How will quantum computers affect current JWT signing algorithms? Timeline for migration?

2. **Biometric Privacy**: How do passkey systems ensure user privacy when storing biometric data across synced devices?

3. **OAuth 2.0 vs OIDC Performance**: Quantified performance comparison under high load?

4. **Compliance Specifics**: How do different frameworks (HIPAA, PCI-DSS, GDPR) affect auth implementation differently in Spring Boot?

5. **Account Recovery Standardization**: Why haven't industry standards emerged for secure account recovery flows?

6. **Token Revocation Scalability**: What's the best approach for instant token revocation in systems with millions of tokens?

7. **Zero-Trust Evolution**: How are authentication and authorization evolving under zero-trust model? Any Spring-specific frameworks emerging?

---

## Agent & Skills

- **Agent**: `backend-developer` or `fullstack-developer`
- **Skills**: `spring-security-expert`, `api-designer`, `security-reviewer`
- **Handoffs**:
  - After implementation → `code-reviewer`
  - Security concerns → `security-reviewer`
  - Performance tuning → `database-architect` (for auth storage optimization)

---

**Total Word Count:** ~10,000 words
**Estimated Read Time:** 60-90 minutes
**Depth Level:** Expert reference document
**Target Audience:** Frontend developers (TS/React/Next.js) learning Java Spring Boot backend development

This comprehensive guide provides everything needed to understand and implement enterprise-grade authentication and authorization in Spring Boot, bridging the gap from frontend frameworks to backend security patterns.
