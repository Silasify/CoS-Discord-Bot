import math, subprocess, os
FONT="Cinzel, 'Trajan Pro', Georgia, 'Times New Roman', serif"
cx,cy=512,512
def octa(r,off=22.5): return " ".join(f"{cx+r*math.cos(math.radians(off+45*i)):.1f},{cy+r*math.sin(math.radians(off+45*i)):.1f}" for i in range(8))
rays="".join(f'<polygon points="{cx},{cy} {cx+700*math.cos(math.radians(a-4)):.0f},{cy+700*math.sin(math.radians(a-4)):.0f} {cx+700*math.cos(math.radians(a+4)):.0f},{cy+700*math.sin(math.radians(a+4)):.0f}"/>' for a in range(0,360,15))
half=[(0,-262),(34,-250),(112,-192),(152,-112),(162,-20),(152,62),(122,142),(82,212),(42,252),(0,266)]
def hp(pts):
    r=[(512+x,cy+y) for x,y in pts]; l=[(512-x,cy+y) for x,y in reversed(pts)]
    return " ".join(f"{x},{y}" for x,y in r+l[1:-1] if True)
helmet=hp(half)
blade=lambda: '<g><polygon points="512,60 526,150 524,690 512,730 500,690 498,150" fill="url(#steel)" stroke="url(#gold)" stroke-width="3"/><polygon points="430,700 594,700 584,722 440,722" fill="url(#gold)"/><rect x="500" y="722" width="24" height="120" fill="url(#gold)"/><circle cx="512" cy="860" r="18" fill="url(#gold)"/></g>'
def emblem(extra=""):
    return f'''<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe29a"/><stop offset=".5" stop-color="#d9a441"/><stop offset="1" stop-color="#8a5f1c"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d8780"/><stop offset=".5" stop-color="#4a4540"/><stop offset="1" stop-color="#1c1815"/></linearGradient>
<linearGradient id="helm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1613"/><stop offset=".35" stop-color="#5b554e"/><stop offset=".5" stop-color="#3a3530"/><stop offset=".65" stop-color="#5b554e"/><stop offset="1" stop-color="#1a1613"/></linearGradient>
<radialGradient id="bg" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#3a1f12"/><stop offset="1" stop-color="#0c0908"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#f6b44a"/><stop offset=".45" stop-color="#d9702a"/><stop offset="1" stop-color="#d9702a" stop-opacity="0"/></radialGradient>
<clipPath id="in"><polygon points="{octa(452)}"/></clipPath></defs>
<polygon points="{octa(486)}" fill="#0c0908"/>
<g clip-path="url(#in)"><rect width="1024" height="1024" fill="url(#bg)"/><g fill="#d9a441" fill-opacity=".13">{rays}</g>
<circle cx="{cx}" cy="{cy}" r="330" fill="url(#halo)" fill-opacity=".85"/>
<g transform="rotate(40 512 512)">{blade()}</g><g transform="rotate(-40 512 512)">{blade()}</g>
<polygon points="{helmet}" fill="url(#helm)" stroke="url(#gold)" stroke-width="7" stroke-linejoin="round"/>
<polygon points="512,{cy-262} 524,{cy-236} 520,{cy-70} 512,{cy-50} 504,{cy-70} 500,{cy-236}" fill="url(#gold)"/>
<polygon points="{cx-118},{cy-34} {cx+118},{cy-34} {cx+98},{cy+14} {cx-98},{cy+14}" fill="#0c0908" stroke="url(#gold)" stroke-width="4"/>
<polygon points="{cx-104},{cy-26} {cx+104},{cy-26} {cx+88},{cy+6} {cx-88},{cy+6}" fill="#f6b44a"/>
<polygon points="{cx-14},{cy-34} {cx+14},{cy-34} {cx+22},{cy+104} {cx},{cy+126} {cx-22},{cy+104}" fill="#17130f" stroke="url(#gold)" stroke-width="3"/>
<g fill="#0c0908">{"".join(f'<rect x="{cx+dx-5}" y="{cy+150}" width="10" height="{h}" rx="3"/>' for dx,h in [(-64,46),(-38,60),(38,60),(64,46)])}</g>
<g fill="url(#gold)">{"".join(f'<polygon points="{cx+dx},{cy+322} {cx+dx+14},{cy+338} {cx+dx},{cy+354} {cx+dx-14},{cy+338}"/>' for dx in (-44,0,44))}</g>
</g>
<polygon points="{octa(470)}" fill="none" stroke="url(#gold)" stroke-width="14" stroke-linejoin="miter"/>
<polygon points="{octa(446)}" fill="none" stroke="url(#gold)" stroke-width="3" stroke-opacity=".8"/>
{extra}'''
def svg(w,h,body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'
out={}
out['emblem']=(1024,1024,svg(1024,1024,'<rect width="1024" height="1024" fill="#0c0908"/>'+emblem()))
out['emblem-transparent']=(1024,1024,svg(1024,1024,emblem()))
txt=lambda y,s,sz,sp,f="url(#gold)":f'<text x="512" y="{y}" font-family="{FONT}" font-weight="700" font-size="{sz}" letter-spacing="{sp}" text-anchor="middle" fill="{f}">{s}</text>'
out['logo-lockup']=(1024,1300,svg(1024,1300,emblem()+txt(1130,"CHILDREN OF SALUSA",58,7)+txt(1195,"A  DUNE: AWAKENING  GUILD",28,12,"#e9c477")))
for n,(w,h,s) in out.items():
    open(n+'.svg','w',encoding='utf8').write(s)
    subprocess.run([r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe","--headless","--disable-gpu","--hide-scrollbars","--default-background-color=00000000",f"--window-size={w},{h}",f"--screenshot={os.path.abspath(n)}.png","file:///"+os.path.abspath(n+'.svg').replace(chr(92),'/')],capture_output=True)
