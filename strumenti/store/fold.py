# Cornice del pieghevole dal mockup di Andrea: lato schermo reso simmetrico, sfondo bianco tolto.
from PIL import Image, ImageFilter
import numpy as np, scipy.ndimage as nd, glob, os, sys
a=np.asarray(Image.open('/root/.claude/uploads/f7101fad-b03d-5c26-949b-a5596d971abf/836f6c4c-image.png').convert('RGB')).astype(float)
white=(a.min(-1)>=253); lab,_=nd.label(white)
bg=lab==lab[5,5]; scr=lab==lab[2000,2800]
mid=(2104+3686)//2  # centro dello schermo
x1=3744+6; y0,y1=832-6,3263+6
R=a[y0:y1,mid:x1]; Rbg=bg[y0:y1,mid:x1]; Rscr=scr[y0:y1,mid:x1].copy()
# metà sinistra = specchio della destra, senza il foro della fotocamera (lo schermo lo copre)
L=R[:,::-1].copy(); Lbg=Rbg[:,::-1]; Lscr=Rscr[:,::-1].copy()
# riempi il foro specchiato: tutto ciò che è dentro il contorno dello schermo diventa schermo
inner=nd.binary_fill_holes(Lscr|(~Lbg & nd.binary_fill_holes(Lscr)))
fori=inner & ~Lscr & nd.binary_fill_holes(Lscr)
Lscr=Lscr|fori; L[fori]=255
img=np.concatenate([L,R],1); bgm=np.concatenate([Lbg,Rbg],1); scrm=np.concatenate([Lscr,Rscr],1)
dist=255-img.min(-1)
bordo=nd.binary_dilation(bgm,iterations=2)&~bgm
alpha=np.ones(bgm.shape); alpha[bgm]=0; alpha[bordo]=np.clip(dist[bordo]/30,0,1); alpha[scrm]=0
fr=Image.fromarray(np.dstack([img,alpha*255]).astype(np.uint8),'RGBA')
ys,xs=np.where(scrm); bx0,bx1,by0,by1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
K=float(sys.argv[3]); size=(round(fr.width*K),round(fr.height*K))
frame=fr.resize(size,Image.LANCZOS)
mask=Image.fromarray((scrm*255).astype(np.uint8),'L').filter(ImageFilter.MaxFilter(5)).resize(size,Image.LANCZOS)
os.makedirs(sys.argv[2],exist_ok=True)
for f in sorted(glob.glob(sys.argv[1]+'/*.png')):
    shot=Image.open(f).convert('RGB').resize((round((bx1-bx0)*K),round((by1-by0)*K)),Image.LANCZOS)
    lay=Image.new('RGBA',size,(0,0,0,0)); lay.paste(shot,(round(bx0*K),round(by0*K)))
    tela=Image.new('RGBA',size,(0,0,0,0)); tela.paste(lay,(0,0),mask); tela.alpha_composite(frame)
    tela.save(sys.argv[2]+'/'+os.path.basename(f))
print(size)
