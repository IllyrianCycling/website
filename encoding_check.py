import subprocess
import os

os.chdir(r"C:\Users\Legion\Documents\IC\website")

def check_file(path):
    # Get HEAD version
    head_bytes = subprocess.check_output(["git", "show", f"HEAD:{path}"], stderr=subprocess.DEVNULL)
    # Get working copy
    with open(path, "rb") as f:
        wc_bytes = f.read()
    
    print(f"\n=== {path} ===")
    
    # 1. UTF-8 decode and BOM
    for label, data in [("HEAD", head_bytes), ("WORKING", wc_bytes)]:
        has_bom = data.startswith(b"\xef\xbb\xbf")
        try:
            text = data.decode("utf-8")
            print(f"  {label}: UTF-8 OK, BOM={has_bom}, len={len(text)} chars")
        except UnicodeDecodeError as e:
            print(f"  {label}: UTF-8 DECODE ERROR at {e.start}")
    
    # 2. Line endings
    for label, data in [("HEAD", head_bytes), ("WORKING", wc_bytes)]:
        crlf = data.count(b"\r\n")
        lf = data.count(b"\n") - crlf
        print(f"  {label}: CRLF={crlf}, LF={lf}")
    
    # 3. Count U+0107 (ć)
    for label, data in [("HEAD", head_bytes), ("WORKING", wc_bytes)]:
        text = data.decode("utf-8")
        count = text.count("\u0107")
        print(f"  {label}: U+0107 count = {count}")
    
    # 4. Mojibake sequences
    mojibake = {
        "Lovcen corruption \u00c4\u2021": "\u00c4\u2021",
        "€ corruption \u00e2\u201a\u00ac": "\u00e2\u201a\u00ac",
        "· corruption \u00c2\u00b7": "\u00c2\u00b7",
        "generic \u00c3": "\u00c3",
    }
    for label, data in [("HEAD", head_bytes), ("WORKING", wc_bytes)]:
        text = data.decode("utf-8")
        print(f"  {label} mojibake counts:")
        for name, seq in mojibake.items():
            c = text.count(seq)
            if c:
                print(f"    {name}: {c}")

check_file("frontend/index.html")
check_file("frontend/schema.json")