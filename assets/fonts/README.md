Typography uses locally served variable fonts, with no third party font requests.

- Source Serif 4, the editorial Latin face: https://github.com/adobe-fonts/source-serif. Official release WOFF2 blobs: Roman `cca344bfa7707992bf39271ee999e385c3727de2`, italic `9fcf4743dfa259398b94c430ca009ef9a98048dd`. Files are unmodified.
- Noto Serif SC, the editorial Chinese face: https://github.com/google/fonts/tree/main/ofl/notoserifsc. Official Google Fonts WOFF2 subsets are served locally under `noto-serif-sc/`, with unicode ranges in `noto-serif-sc.css`; the browser loads only the subsets needed for the text on the page.
- Geist: https://github.com/vercel/geist-font, upstream font blob `71dab8bedba3bfef5dccd7875ed05cac44c7345d`.
- Noto Sans SC: https://github.com/google/fonts/tree/main/ofl/notosanssc, upstream font blob `fb0637bafbcd804fe32152370a1225990745b4bc`.
- The corresponding SIL Open Font Licenses are included in this directory.

Headlines, wordmarks, and editorial reading copy use `--font-editorial`. Controls and navigation use `--font-sans`. These fonts establish a newspaper-inspired style; they are not the New York Times' custom typefaces.

The Chinese sans serif font is a WOFF2 subset of the characters in public HTML, React components, and localized content. Native CJK fonts cover other characters, including user supplied prompts. Regenerate with `scripts/subset-ui-font.py` and fontTools when adding UI characters.
