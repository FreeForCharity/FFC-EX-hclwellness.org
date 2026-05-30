# Donation Methodology — WordPress → Static

A full enumeration of how donations worked on the live WordPress site
(www.hclwellness.org) and exactly what the static site does for each, so we can
confirm we are **not regressing the donation experience**. Tracking: #33.

## Summary

The live site uses **two** donation-related systems:

| System     | Role on WordPress                                | Status on static site                                                          |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Zeffy**  | Primary, active donation form (the "Donate" CTA) | ✅ **Preserved exactly** — same form, same processor                           |
| **GiveWP** | (legacy) donor portal + post-donation pages      | 🗑️ **Deprecated** — the org moved everything to Zeffy; static fallbacks remain |

> **Confirmed by the organization:** **Zeffy is the sole, current CRM for both
> donations and newsletter sign-ups.** The GiveWP donor dashboard is being
> deprecated. There is no other payment/donation processor.

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

| Capability                                      | WordPress                              | Static site                         | Regression?                                                      |
| ----------------------------------------------- | -------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Make a one-time donation                        | Zeffy modal                            | Zeffy modal (same form)             | **No**                                                           |
| Donate from header / home / volunteer           | Zeffy                                  | Zeffy                               | **No**                                                           |
| Post-donation receipt page                      | GiveWP dynamic                         | Static thank-you                    | Minor — receipts come from the processor (Zeffy/GiveWP) by email |
| Donor login / giving history / manage recurring | GiveWP donor portal (being deprecated) | Static notice + Zeffy "Donate" link | **No** — the org moved all donor management to Zeffy             |

## Confirmed by the organization

- ✅ **Zeffy is the sole, current processor** and the **only CRM** — for both
  **donations and newsletter** sign-ups.
- ✅ The **GiveWP** donor dashboard is **being deprecated**; everything moved to
  Zeffy. No active GiveWP donor accounts / recurring gifts need a separate path.
- ✅ The dynamic donation pages (`/donor-dashboard`, `/donation-confirmation`,
  `/donation-failed`) keep their static fallbacks (notice + Zeffy "Donate").
- ✅ The contact pages' WPForms form is now a direct **`mailto:`** link
  (`/contact-us`, `/contact-form`).

Resolves #33.
