# Owner correction: preserve the original outfits

The owner preferred the pre-fix garment silhouettes. Restore android-outfits.js geometry from ded6e05b78263c07f2b0cde653f95e4e984cf387 exactly, retaining only the wrapsProfile flag consumed by the existing near-arm redraw pass. Keep the Industrial Echo up-view arm depth correction. No limb positions or garment shapes are redesigned.

The earlier before/after outfit preview and verification describe the preceding implementation, not this correction. Native and Chromium CI must validate this revision separately; owner visual approval remains pending.
