import subprocess, os
FONT="Cinzel, 'Trajan Pro', Georgia, 'Times New Roman', serif"
DEFS='''<defs>
<radialGradient id="sky" cx="{cx}" cy="{cy}" r="0.8"><stop offset="0" stop-color="#f6b44a"/><stop offset="0.3" stop-color="#d9702a"/><stop offset="0.7" stop-color="#6b2a1a"/><stop offset="1" stop-color="#1b0d0a"/></radialGradient>
<radialGradient id="sun"><stop offset="0" stop-color="#fff3c9"/><stop offset="0.6" stop-color="#ffd37a"/><stop offset="1" stop-color="#f2a33a"/></radialGradient>
<linearGradient id="d1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a3a1c"/><stop offset="1" stop-color="#3a1710"/></linearGradient>
<linearGradient id="d2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1e12"/><stop offset="1" stop-color="#150907"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe29a"/><stop offset="0.5" stop-color="#d9a441"/><stop offset="1" stop-color="#8a5f1c"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c0504" stop-opacity="0.75"/><stop offset="1" stop-color="#0c0504" stop-opacity="0"/></linearGradient></defs>'''
def dunes(W,H,hd,fig_x,fs):
    y0=H-hd
    k=hd/524
    fy=lambda yo:y0+(yo-500)*k
    fig=lambda x,y,s:f'<g transform="translate({x} {y}) scale({s})" fill="#0c0504"><path d="M-34 0 C-30 -40 -24 -80 -10 -104 C-8 -122 8 -122 10 -104 C24 -80 30 -40 34 0Z"/></g>'
    return f'''<svg x="0" y="{y0}" width="{W}" height="{hd}" viewBox="0 500 1024 524" preserveAspectRatio="none">
<path d="M0 600 C180 520 300 560 430 590 C560 620 700 520 1024 580 L1024 1024 L0 1024Z" fill="url(#d1)"/></svg>
{fig(fig_x,fy(625),fs)}{fig(fig_x-62*fs,fy(640),fs*0.42)}{fig(fig_x-100*fs,fy(650),fs*0.32)}
<svg x="0" y="{y0}" width="{W}" height="{hd}" viewBox="0 500 1024 524" preserveAspectRatio="none">
<path d="M0 700 C150 640 320 700 480 680 C660 650 820 610 1024 690 L1024 1024 L0 1024Z" fill="url(#d2)"/>
<path d="M0 820 C200 760 420 830 620 800 C800 775 920 790 1024 810 L1024 1024 L0 1024Z" fill="#0c0504"/></svg>'''
def rays(cx,cy,W):
    import math
    out=''
    for a in range(-160,-19,28):
        r=math.radians(a); out+=f'<path d="M{cx} {cy} L{cx+W*math.cos(r):.0f} {cy+W*math.sin(r):.0f}"/>'
    return f'<g stroke="#ffd37a" stroke-opacity="0.16" stroke-width="8">{out}</g>'
def sun(cx,cy,r): return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#sun)"/><circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#fff3c9" stroke-opacity="0.5" stroke-width="3"/>'
def text(x,y,s,size,sp,anchor="middle",weight=700,fill="url(#gold)"):
    return f'<text x="{x}" y="{y}" font-family="{FONT}" font-weight="{weight}" font-size="{size}" letter-spacing="{sp}" text-anchor="{anchor}" fill="{fill}">{s}</text>'
def frame(W,H,m=14):
    return f'<rect x="{m}" y="{m}" width="{W-2*m}" height="{H-2*m}" fill="none" stroke="url(#gold)" stroke-width="5"/><rect x="{m+12}" y="{m+12}" width="{W-2*m-24}" height="{H-2*m-24}" fill="none" stroke="url(#gold)" stroke-opacity="0.7" stroke-width="1.5"/>'
def wrap(W,H,body,cx=.5,cy=.45):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{DEFS.format(cx=cx,cy=cy)}{body}</svg>'
files={}
# banner 960x540
W,H=960,540
files['server-banner']=(W,H,wrap(W,H,f'<rect width="{W}" height="{H}" fill="url(#sky)"/>{rays(480,235,900)}{sun(480,235,115)}{dunes(W,H,300,730,1.5)}<rect x="0" y="360" width="{W}" height="180" fill="#0c0504" fill-opacity="0.35"/>{text(480,425,"CHILDREN OF SALUSA",58,8)}{text(480,478,"A  DUNE: AWAKENING  GUILD",20,9,fill="#e9c477",weight=600)}{frame(W,H)}',.5,.43))
# header 1920x400
W,H=1920,400
files['website-header']=(W,H,wrap(W,H,f'<rect width="{W}" height="{H}" fill="url(#sky)"/>{rays(1500,175,1800)}{sun(1500,175,125)}{dunes(W,H,190,1700,1.7)}<rect width="1200" height="{H}" fill="url(#fade)"/>{text(110,190,"CHILDREN OF SALUSA",64,8,"start")}{text(114,252,"A  DUNE: AWAKENING  GUILD",26,12,"start",600,"#e9c477")}<rect x="114" y="278" width="220" height="3" fill="url(#gold)"/><rect x="0" y="{H-6}" width="{W}" height="6" fill="url(#gold)"/>',.78,.45))
# footer 1920x180
W,H=1920,180
fm=lambda cx:f'<g transform="translate({cx} 90)"><circle r="34" fill="none" stroke="url(#gold)" stroke-width="4"/><circle cy="-4" r="17" fill="url(#sun)"/><path d="M-34 14 C-14 4 8 22 34 8 A34 34 0 0 1 -34 14Z" fill="#8a3a1c"/></g>'
files['website-footer']=(W,H,wrap(W,H,f'<rect width="{W}" height="{H}" fill="#0c0504"/><path d="M0 0 L{W} 0 L{W} 46 C1500 20 1200 60 900 40 C600 22 300 54 0 34Z" fill="#2a110b"/><rect width="{W}" height="4" fill="url(#gold)"/>{fm(560)}{fm(1360)}{text(960,86,"CHILDREN OF SALUSA",36,10)}{text(960,124,"LOYALTY  ·  DISCIPLINE  ·  UNITY",17,8,fill="#c9a059",weight=600)}',.5,.5))
# logo transparent 1024 (profile without bg)
p=open('../children-of-salusa.svg',encoding='utf8').read().replace('<rect width="1024" height="1024" fill="#120807"/>','')
files['logo-transparent']=(1024,1024,p)
for n,(W,H,s) in files.items():
    open(n+'.svg','w',encoding='utf8').write(s)
    subprocess.run([r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe","--headless","--disable-gpu","--hide-scrollbars","--default-background-color=00000000",f"--window-size={W},{H}",f"--screenshot={os.path.abspath(n)}.png","file:///"+os.path.abspath(n+'.svg').replace(chr(92),'/')],capture_output=True)
