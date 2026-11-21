from PIL import Image,ImageDraw
import random,math
from pathlib import Path
r=random.Random(42)
W,H=1600,1150
im=Image.new('RGB',(W,H),'#e1e6cd')
d=ImageDraw.Draw(im)
def yroad(x):return 520+80*math.sin(x/185)+20*math.sin(x/95)
def river(x):return 575+120*math.sin(x/205)+50*math.cos(x/98)
points={(i,j):(i*100+r.randint(-22,22),j*80+r.randint(-18,18)) for i in range(-1,18) for j in range(-1,17)}
colors=['#d1ddba','#cad9ad','#dfe4bd','#e7e5c6','#d6dfbb','#c4d5ac','#d3dcaf','#e1dfb5','#d8e4c8']
for i in range(-1,17):
 for j in range(-1,16):
  poly=[points[i,j],points[i+1,j],points[i+1,j+1],points[i,j+1]]
  col=r.choice(colors);d.polygon(poly,fill=col,outline='#f2edd6',width=3)
  if r.random()<.48:
   for t in range(1,13):
    a,b,c,e=poly
    interp=lambda a,b:(a[0]+(b[0]-a[0])*t/13,a[1]+(b[1]-a[1])*t/13)
    d.line([interp(a,b),interp(e,c)],fill='#c5d1a9',width=1)
  if r.random()<.20:
   for k in range(30):
    x,y=poly[0][0]+r.randint(8,85),poly[0][1]+r.randint(7,65)
    radius=r.randint(4,11);d.ellipse((x-radius,y-radius,x+radius,y+radius),fill=r.choice(['#b8cda7','#a9c59e','#bbd0ac']))
rs=[(x,river(x)) for x in range(-2,W+8,4)]
d.line(rs,fill='#bdccb4',width=45);d.line(rs,fill='#a6cfd2',width=36);d.line([(x,y-10) for x,y in rs],fill='#badcdb',width=3)
for f in [lambda x:yroad(x)-190,lambda x:river(x)+140]:
 p=[(x,f(x)) for x in range(-2,W+8,6)];d.line(p,fill='#c6bfa3',width=13);d.line(p,fill='#fff7dc',width=9)
for x0 in [260,640,1140,1450]:
 p=[(x0+60*math.sin(y/140),y) for y in range(-2,H+8,5)];d.line(p,fill='#c9c2a5',width=9);d.line(p,fill='#faf3de',width=6)
 for _ in range(18):
  y=r.choice([320,720,860])+r.randint(-30,30);x=x0+60*math.sin(y/140)+r.choice([-1,1])*r.randint(12,48)
  d.rectangle((x,y,x+10,y+6),fill='#c5bca6',outline='#ada78e')
out=Path('outputs/green-assets/public');out.mkdir(exist_ok=True);im.save(out/'landscape.png',optimize=True)
