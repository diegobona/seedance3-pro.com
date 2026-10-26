"""Create the CJK UI font from the official Noto Sans SC variable source.

Usage: python scripts/subset-ui-font.py SOURCE.ttf CHARACTERS.txt OUTPUT.woff2
Requires fonttools and brotli. Keep the upstream OFL alongside the output.
Characters absent from this UI subset fall back to the native CJK font.
"""
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

source, characters, output = sys.argv[1:]
with open(characters, encoding="utf-8") as stream:
    text = stream.read()
font = TTFont(source)
options = subset.Options()
options.flavor = "woff2"
options.layout_features = ["*"]
options.name_IDs = ["*"]
options.name_legacy = True
options.name_languages = ["*"]
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
font.flavor = "woff2"
font.save(output)
print(f"Saved {len(font.getBestCmap())} characters to {output}")
