"""Construction date from an RCE register description (parser shared with amsterdam-by-building).

RCE writes dates as Roman centuries with an optional part: XVII (the century), XVIIa–d (quarters),
XVII A/B (halves); or as years ("1660", "plm 1800", "ca. 1650", "1660-1662"); or in words
("zeventiende eeuw", "17e eeuw"). The first date in a description dates the building itself;
later ones date the facade, the roof, the stoop.

Wikidata inception (P571) is not used: it often records a restoration (Rembrandthuis: 1907).
"""
import csv
import re

ROMAN = {"XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15, "XVI": 16, "XVII": 17, "XVIII": 18, "XIX": 19, "XX": 20}
ORDINAL = {"elfde": 11, "twaalfde": 12, "dertiende": 13, "veertiende": 14, "vijftiende": 15, "zestiende": 16,
           "zeventiende": 17, "achttiende": 18, "negentiende": 19, "twintigste": 20}

RE_ROMAN = re.compile(r"\b(XVIII|XVII|XVI|XIII|XII|XIV|XIX|XV|XX|XI)\s?([a-d]|[AB])?(?![A-Za-z])")
RE_YEAR = re.compile(r"\b(1[0-9]{3})(?:\s?[-–/]\s?(1[0-9]{3}|[0-9]{2}))?\b")
# Ordinal words almost always mean centuries here ("zeventiende of ouder", "achttiende-eeuws").
RE_WORD = re.compile(r"\b(" + "|".join(ORDINAL) + r")|\b(1[1-9]e|1[1-9]de)[\s-]+eeuw", re.I)


def century_span(c: int, part: str | None) -> tuple[int, int]:
    lo = (c - 1) * 100
    if not part:
        return lo, lo + 99
    if part in "abcd":
        q = "abcd".index(part)
        return lo + 25 * q, lo + 25 * q + 24
    h = "AB".index(part)
    return lo + 50 * h, lo + 50 * h + 49


def first_date(text: str) -> tuple[int, int] | None:
    found = []
    for m in RE_ROMAN.finditer(text):
        # Roman centuries only count inside parentheses, where RCE puts them.
        if text.rfind("(", 0, m.start()) > text.rfind(")", 0, m.start()):
            found.append((m.start(), century_span(ROMAN[m.group(1)], m.group(2))))
    for m in RE_YEAR.finditer(text):
        a = int(m.group(1))
        b = m.group(2)
        b = a if not b else int(b) if len(b) == 4 else a // 100 * 100 + int(b)
        if 1000 <= a <= 2026 and a <= b <= 2026:
            found.append((m.start(), (a, b)))
    for m in RE_WORD.finditer(text):
        w = (m.group(1) or m.group(2)).lower()
        c = ORDINAL.get(w) or int(re.match(r"\d+", w).group())
        found.append((m.start(), century_span(c, None)))
    return min(found)[1] if found else None


if __name__ == "__main__":
    tests = ["Pand met halsgevel (XVIId).", "Koetshuis met gevel (XIX A).", "Huis (zeventiende of ouder) met gevel (achttiende eeuw)",
             "Huis (XVII) met gevel onder rechte lijst (plm 1800).", "Kerk, gebouwd 1620-23 naar ontwerp van De Keyser", "Pakhuis (1660)."]
    for t in tests:
        print(first_date(t), "←", t)
