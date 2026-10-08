"""Render a local documentation review site (requires Python Markdown).

Run from any directory: python tools/preview-wiki.py
The disposable .wiki-preview output is ignored by Git.
"""
from pathlib import Path
import re
import html
import markdown

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "docs" / "wiki"
OUT = ROOT / ".wiki-preview"
OUT.mkdir(exist_ok=True)
STYLE = """
*{box-sizing:border-box}body{margin:0;background:#fff;color:#1f2328;font:16px/1.6 system-ui,sans-serif}
main{max-width:1040px;margin:40px auto;padding:0 40px 80px}a{color:#0969da;text-decoration:none}a:hover{text-decoration:underline}
h1,h2{border-bottom:1px solid #d1d9e0;padding-bottom:.3em;line-height:1.3}h1{font-size:32px}h2{margin-top:32px;font-size:24px}
h3{margin-top:24px}img{max-width:100%;height:auto;vertical-align:middle}p,ul,ol,table,pre{margin:0 0 16px}
table{border-collapse:collapse;display:block;max-width:100%;overflow-x:auto}th,td{border:1px solid #d1d9e0;padding:8px 12px}
th{font-weight:600;background:#f6f8fa}tr:nth-child(even){background:#f6f8fa}td img{min-width:260px}
pre{padding:16px;border-radius:6px;background:#f6f8fa;overflow:auto;font-size:13px}code{font-family:ui-monospace,monospace;font-size:.85em;background:#eff1f3;padding:2px 4px;border-radius:4px}pre code{padding:0;background:none}
details{padding:12px;border:1px solid #d1d9e0;border-radius:6px;margin:16px 0}nav{margin-bottom:24px;font-size:14px;color:#59636e}
@media(max-width:700px){main{padding:0 16px}h1{font-size:28px}}
"""

def render(source, name):
    text = source.read_text(encoding="utf-8")
    def link(match):
        target = match.group(1)
        if re.match(r"https?:|mailto:|#", target):
            return match.group(0)
        if target.startswith("images/"):
            target = "../docs/wiki/" + target
        elif target.startswith("docs/wiki/"):
            target = target.removeprefix("docs/wiki/")
            if target.startswith("images/"):
                target = "../docs/wiki/" + target
        if ".md" in target:
            target = target.replace(".md", ".html")
        elif target.endswith(".json"):
            target = "../docs/wiki/" + target
        return "](" + target + ")"
    text = re.sub(r"\]\(([^)\s]+)\)", link, text)
    body = markdown.markdown(text, extensions=["tables", "fenced_code", "toc", "md_in_html"])
    title = html.escape(source.stem.replace("-", " "))
    page = f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{STYLE}</style><main><nav>Documentation review · <a href="README.html">README</a> · <a href="Home.html">Wiki Home</a></nav>{body}</main></html>'
    (OUT / name).write_text(page, encoding="utf-8")

for source in WIKI.glob("*.md"):
    render(source, source.stem + ".html")
render(ROOT / "README.md", "README.html")
print(f"Rendered {len(list(OUT.glob('*.html')))} review pages in {OUT}")
