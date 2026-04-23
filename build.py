import base64
import os

def get_base64_image(filepath):
    if not os.path.exists(filepath):
        return ""
    with open(filepath, "rb") as f:
        data = f.read()
        b64 = base64.b64encode(data).decode('utf-8')
        return f"data:image/png;base64,{b64}"

def build():
    with open("index.html", "r") as f:
        html = f.read()

    with open("style.css", "r") as f:
        css = f.read()

    with open("script.js", "r") as f:
        js = f.read()

    harold_b64 = get_base64_image("harold.png")
    soothing_b64 = get_base64_image("soothing.png")

    html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>{css}</style>')
    html = html.replace('<script src="script.js"></script>', f'<script>{js}</script>')
    
    if harold_b64:
        html = html.replace('src="harold.png"', f'src="{harold_b64}"')
    if soothing_b64:
        html = html.replace('src="soothing.png"', f'src="{soothing_b64}"')

    with open("StressTestStandalone.html", "w") as f:
        f.write(html)
        
    print("Standalone export complete: StressTestStandalone.html")

if __name__ == "__main__":
    build()
