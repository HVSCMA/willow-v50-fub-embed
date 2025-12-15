# WILLOWOS-RE V1 LIVE EMBED CHECKLIST

**DO NOT DEPLOY WITHOUT EXECUTING THIS CHECKLIST**

1.  **Environment Check**: Ensure `FUB_API_KEY`, `ATTOM_API_KEY`, and `CLOUDCMA_API_KEY` are active in Netlify.
2.  **Load App**: Open Follow Up Boss -> People -> Select a Person -> Verify **Willow** app loads in right sidebar.
3.  **Momentum Check**: Verify the "🔥 0" chip appears in the top header.
4.  **CMA Gate Test**:
    -   Try clicking "Generate CMA". **MUST FAIL** (Disabled).
    -   Check "I confirm pricing is accurate".
    -   Try clicking "Generate CMA". **MUST SUCCEED** (Button Active).
5.  **Audio Doctrine Test**:
    -   Click "Play" (▶) on Audio Lead Review.
    -   Listen/Read Transcript.
    -   **VERIFY**: The *Suggested Voice* script does NOT mention "Score", "Engagement", or "Trigger".
6.  **Audit Trail Test**:
    -   Send a message via the "Assistant" chat (bottom right).
    -   Refresh FUB Timeline.
    -   **VERIFY**: A Note appears: "Chat Interaction: [Your Message]".
7.  **Final Polish**: Confirm no layout shifts or broken styles in the production iframe.

**IF ANY STEP FAILS: ROLLBACK IMMEDIATELY.**
