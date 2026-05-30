# Donation Methodology — WordPress → Static

A full enumeration of how donations worked on the live WordPress site
(www.hclwellness.org) and exactly what the static site does for each, so we can
confirm we are **not regressing the donation experience**. Tracking: #33.

## Summary

The live site uses **two** donation-related systems:

| System     | Role on WordPress                                  | Status on static site                                                   |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| **Zeffy**  | Primary, active donation form (the "Donate" CTA)   | ✅ **Preserved exactly** — same form, same processor                    |
| **GiveWP** | Donor portal + post-donation receipt/failure pages | ⚠️ **Static fallbacks** (the dynamic portal can't run on a static host) |

## 1. Zeffy — primary donation path (preserved)

- **What it is:** a third-party hosted donation/payment platform. The form runs
  entirely on `zeffy.com`; no card data ever touches this site.
- **Where it appears on WordPress:** the **"Donate"** call-to-action — the live
  home hero, the `/volunteer/` page, and the site header — all open the same
  Zeffy modal form.
- **Exact target:**
  `https://www.zeffy.com/embed/donation-form/8e423183-d093-41c4-91a0-947ff24c3bee?modal=true`
  (form id `8e423183-d093-41c4-91a0-947ff24c3bee`).
- **Static site:**
  - Header "Donate" button → same Zeffy URL (`DONATE_URL` in `src/components/header/index.tsx`).
  - In-content "Donate" links on the home and volunteer pages → same Zeffy URL (preserved by the migration transform).
  - The donor-dashboard fallback page links to the same Zeffy URL.
  - CSP allows `zeffy.com` in both `frame-src` and `form-action`.
  - **Result: no regression.** A donor clicks Donate and reaches the identical
    Zeffy form on both sites.

## 2. GiveWP — donor portal & post-donation pages (static fallbacks)

- **What it is:** the GiveWP WordPress plugin (loaded site-wide; `/wp-content/plugins/give/…`).
  It provides a logged-in **donor portal** and post-checkout state pages.
- **Where it appears on WordPress:**
  - `/donor-dashboard/` — `give-embed=donor-dashboard` + `give-embed-donor-profile`
    (accent `#68bb6c`): donor login, giving history, recurring-donation management.
  - `/donation-confirmation/` — GiveWP receipt/thank-you state.
  - `/donation-failed/` — GiveWP failure state.
- **Why it can't be reproduced statically:** these require the live
  WordPress/GiveWP backend and a logged-in session. On a static export they
  render a **perpetual loading spinner**.
- **Static site (implemented in #32):**
  - `/donor-dashboard/` → static notice: donor accounts are managed via the
    donation provider, plus a Zeffy "Make a donation" button and a contact email.
  - `/donation-confirmation/` → static thank-you + link home.
  - `/donation-failed/` → kept its existing static copy.
- **No GiveWP donation _form_** block was found on the crawled content pages —
  the active donate CTA is Zeffy, not a Give form.

## Regression assessment

| Capability                                      | WordPress           | Static site                                 | Regression?                                                      |
| ----------------------------------------------- | ------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Make a one-time donation                        | Zeffy modal         | Zeffy modal (same form)                     | **No**                                                           |
| Donate from header / home / volunteer           | Zeffy               | Zeffy                                       | **No**                                                           |
| Post-donation receipt page                      | GiveWP dynamic      | Static thank-you                            | Minor — receipts come from the processor (Zeffy/GiveWP) by email |
| Donor login / giving history / manage recurring | GiveWP donor portal | **Not available** (static notice + contact) | **Yes — if GiveWP held active donor accounts/recurring gifts**   |

## Open questions for the organization (need confirmation)

- [ ] Is **Zeffy the sole current processor**, or are live donations still taken
      through **GiveWP** anywhere (campaign links not in the crawled page set)?
- [ ] Are there **active recurring donations / donor accounts in GiveWP**? If so,
      how should those donors be directed now that the portal is gone (email,
      keep a GiveWP subdomain, migrate to Zeffy recurring, etc.)?
- [ ] Should `/donor-dashboard`, `/donation-confirmation`, `/donation-failed`
      **redirect** into the Zeffy flow instead of showing a static notice?
- [ ] Confirm the **Zeffy form id** `8e423183-…` is the correct, current campaign.
- [ ] Any **tax-acknowledgement / receipt automation** that lived in GiveWP and
      needs a replacement?

Once answered, update this file with the decisions and close #33.
