import math, subprocess, os
FONT="Cinzel, 'Trajan Pro', Georgia, 'Times New Roman', serif"
cx,cy=512,470
def star(n,ro,ri,rot=0,c=(cx,cy)):
    pts=[]
    for i in range(2*n):
        r=ro if i%2==0 else ri; a=math.radians(rot+i*180/n-90)
        pts.append(f"{c[0]+r*math.cos(a):.1f},{c[1]+r*math.sin(a):.1f}")
    return " ".join(pts)
def mir(half): return " ".join(f"{cx+x},{cy+y}" for x,y in half)+" "+" ".join(f"{cx-x},{cy+y}" for x,y in reversed(half))
face=[(0,-170),(66,-150),(118,-90),(124,-10),(100,80),(62,150),(0,196)]
eyeR=[(26,-44),(98,-70),(92,-34),(40,-14)]
SH="M122 96 H902 V556 C902 760 706 888 512 972 C318 888 122 760 122 556Z"
SH2="M144 118 H880 V552 C880 742 696 862 512 944 C328 862 144 742 144 552Z"
body=f'''<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d58b"/><stop offset=".5" stop-color="#c79a45"/><stop offset="1" stop-color="#7d5a22"/></linearGradient>
<linearGradient id="gold2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3bf6a"/><stop offset="1" stop-color="#9a7230"/></linearGradient>
<linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d1d17"/><stop offset="1" stop-color="#3e0d0b"/></linearGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .8  0 0 0 0 .6  0 0 0 0 .3  0 0 0 .22 0"/></filter>
<clipPath id="sh"><path d="{SH2}"/></clipPath></defs>
<path d="{SH}" fill="url(#gold)"/>
<path d="{SH2}" fill="url(#red)"/>
<g clip-path="url(#sh)">
<circle cx="{cx}" cy="{cy}" r="360" fill="none" stroke="#c79a45" stroke-opacity=".25" stroke-width="3"/>
<circle cx="{cx}" cy="{cy}" r="330" fill="none" stroke="#c79a45" stroke-opacity=".15" stroke-width="2"/>
<polygon points="{star(14,330,240,0)}" fill="#7d5a22"/>
<polygon points="{star(14,300,210,180/14)}" fill="url(#gold2)" stroke="#3e2a0e" stroke-width="3" stroke-linejoin="miter"/>
<polygon points="{star(14,250,175,0)}" fill="#a77b34" stroke="#3e2a0e" stroke-width="3"/>
<polygon points="{mir(face)}" fill="url(#gold)" stroke="#2c1b08" stroke-width="5" stroke-linejoin="round"/>
<g fill="#1d1005" stroke="#1d1005" stroke-width="3" stroke-linejoin="round">
<polygon points="{" ".join(f'{cx+x},{cy+y}' for x,y in eyeR)}"/>
<polygon points="{" ".join(f'{cx-x},{cy+y}' for x,y in eyeR)}"/>
<polygon points="{cx-38},{cy+34} {cx+38},{cy+34} {cx+20},{cy+84} {cx-20},{cy+84}"/>
</g>
<g fill="none" stroke="#2c1b08" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
<path d="M{cx},{cy-150} V{cy+30}"/>
<path d="M{cx},{cy+84} V{cy+112} M{cx-70},{cy+104} Q{cx-30},{cy+138} {cx},{cy+112} Q{cx+30},{cy+138} {cx+70},{cy+104}"/>
<path d="M{cx-92},{cy-108} L{cx-40},{cy-92} M{cx+92},{cy-108} L{cx+40},{cy-92}"/>
<path d="M{cx-30},{cy+160} L{cx},{cy+186} L{cx+30},{cy+160}"/>
</g>
<g fill="#f1d58b">{"".join(f'<polygon points="{cx+d},{cy+300} {cx+d+14},{cy+316} {cx+d},{cy+332} {cx+d-14},{cy+316}"/>' for d in (-44,0,44))}</g>
<rect width="1024" height="1024" filter="url(#grain)"/>
</g>
<path d="{SH2}" fill="none" stroke="#f1d58b" stroke-opacity=".7" stroke-width="2"/>'''
def svg(w,h,b): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{b}</svg>'
txt=lambda y,s,sz,sp,f="url(#gold)":f'<text x="512" y="{y}" font-family="{FONT}" font-weight="700" font-size="{sz}" letter-spacing="{sp}" text-anchor="middle" fill="{f}">{s}</text>'
out={'crest':(1024,1060,svg(1024,1060,body)),
 'crest-lockup':(1024,1300,svg(1024,1300,body+txt(1130,"CHILDREN OF SALUSA",58,7)+txt(1195,"A  DUNE: AWAKENING  GUILD",28,12,"#e3bf6a")))}
for n,(w,h,s) in out.items():
    open(n+'.svg','w',encoding='utf8').write(s)
    subprocess.run([r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe","--headless","--disable-gpu","--hide-scrollbars","--default-background-color=00000000",f"--window-size={w},{h}",f"--screenshot={os.path.abspath(n)}.png","file:///"+os.path.abspath(n+'.svg').replace(chr(92),'/')],capture_output=True)
