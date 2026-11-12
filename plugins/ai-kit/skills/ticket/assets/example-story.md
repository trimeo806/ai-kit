<!-- Reference example written with ticket-template.md. The line starting 'Title:' is the ticket title; everything after it is the description. -->

# Title: [Inbox] Show a "requires signature" indicator in the inbox list and grid view

## Story

**As an** inbox user, **I want** to recognise a document that requires my signature in the inbox list and grid view, **so that** I see straight away that I have to act on it.

**Links:**

* Design: [Inbox – signature indicator frame](https://design.example.com/file/inbox?node=1710-77000)

## Context / Problem

Documents that require a signature already exist in the platform. The mobile app shows them, and since [PROJ-154](https://tracker.example.com/browse/PROJ-154) the public API marks them with `requiresSignature` and a `signatureStatus` (`PENDING`, `SIGNED`, `DECLINED`). A document that requires a signature cannot be used until it is signed, so the recipient has to notice it.

In the web inbox such a document looks like any other. This story adds only the visual indicator. Signing and declining from the inbox are separate work.

## Scope

**In scope**

* Signature indicator on documents in the inbox list view and grid view, as designed.
* Signature flag on the message data the inbox list uses, if the list API doesn't return it yet.
* Accessible label / tooltip for the indicator in every supported language.

**Out of scope**

* Signing or declining a document from the inbox.
* Blocking delete / archive on a pending document.
* Filtering or sorting by signature status.
* Mobile app and public API (already covered by [PROJ-147](https://tracker.example.com/browse/PROJ-147) / [PROJ-154](https://tracker.example.com/browse/PROJ-154)).

## Acceptance criteria

**AC-1: Indicator in the list view**

* **Given** a user whose inbox contains a document that requires a signature
* **When** they open the inbox in list view
* **Then** that document shows the signature indicator as designed

**AC-2: Indicator in the grid view**

* **Given** the same user and document
* **When** they switch to grid view
* **Then** the document shows the signature indicator as designed

**AC-3: Indicator is stable**

* **Given** a document with the indicator
* **When** the user reloads, pages through the list, or switches between list and grid view
* **Then** the indicator is still shown on that document, in every folder where it is listed

**AC-4 (unchanged): No indicator on other items**

* **Given** an inbox with normal documents and messages
* **When** the user views it in list or grid view
* **Then** none of them shows the signature indicator

**AC-5 (unchanged): Nothing else changes**

* **Given** an inbox with signature and normal documents
* **When** the indicator is added
* **Then** list order, counts, filters, search and the actions available on each item are the same as today

**AC-6: Indicator is understandable and accessible**

* **Given** a document that requires a signature, in list or grid view
* **When** the user hovers over the indicator or uses a screen reader
* **Then** a label such as "Signature required" is shown or read out, in every supported language

**AC-7 (error): Missing signature data**

* **Given** a document whose signature information is missing or unknown
* **When** the list loads
* **Then** the document shows no indicator, and the list still loads without an error

## Dependencies & references

| Ticket / item | Relation | Status |
| --- | --- | --- |
| [PROJ-154 – Extend public API with signature status](https://tracker.example.com/browse/PROJ-154) | Relates; defines `requiresSignature` / `signatureStatus` | Done |
| [PROJ-153 – Signing flow in the mobile app](https://tracker.example.com/browse/PROJ-153) | Relates; the flow the indicator points users to | Done |

## Notes

* **Constraints:** texts in every supported language; the indicator does not rely on colour alone (accessibility); released behind a feature flag.
* **Technical:** inbox web client (list and grid view components) and the inbox service whose message model feeds the list; check whether it already carries the signature flag. The public API already exposes `requiresSignature` and `signatureStatus` ([PROJ-154](https://tracker.example.com/browse/PROJ-154)); reuse the same source instead of deriving it again.
* **Verification:** test account with documents in each signature status, a normal document and a message. Check list and grid view, reload, paging, every folder that lists documents, all languages, a screen reader on the indicator, and the feature flag on and off.
