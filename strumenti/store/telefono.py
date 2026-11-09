from PIL import Image, ImageFilter
import numpy as np, scipy.ndimage as nd, glob, os, sys
D='/tmp/claude-0/'
src=np.asarray(Image.open('/root/.claude/uploads/f7101fad-b03d-5c26-949b-a5596d971abf/4b0f37a2-image.png').convert('RGB')).astype(float)
H,W,_=src.shape; yy,xx=np.mgrid[0:H,0:W]
exp=np.where(((xx//30+yy//30)%2)==0,255.,226.)
dist=np.abs(src-exp[...,None]).max(-1)
schermo=np.load(D+'schermo.npy'); fondo=np.load(D+'fondo.npy')
bordo=nd.binary_dilation(fondo|schermo,iterations=2)&~(fondo|schermo)
alpha=np.ones((H,W)); alpha[fondo|schermo]=0
alpha[bordo]=np.clip((dist[bordo]-3)/50,0,1)
x0,x1,y0,y1=494,1006,34,1075
fr=np.dstack([src,alpha*255]).astype(np.uint8)[y0:y1,x0:x1]
sm=(schermo[y0:y1,x0:x1]*255).astype(np.uint8)
K=float(sys.argv[3]) if len(sys.argv)>3 else 2.4
frame=Image.fromarray(fr,'RGBA'); size=(round(frame.width*K),round(frame.height*K))
frame=frame.resize(size,Image.LANCZOS)
mask=Image.fromarray(sm,'L').filter(ImageFilter.MaxFilter(3)).resize(size,Image.LANCZOS).filter(ImageFilter.GaussianBlur(1))
bx0,bx1,by0,by1=(521-x0)*K,(981-x0)*K,(57-y0)*K,(1053-y0)*K
os.makedirs(sys.argv[2],exist_ok=True)
for f in sorted(glob.glob(sys.argv[1]+'/*.png')):
    shot=Image.open(f).convert('RGB').resize((round(bx1-bx0),round(by1-by0)),Image.LANCZOS)
    tela=Image.new('RGBA',size,(0,0,0,0)); lay=Image.new('RGBA',size,(0,0,0,0)); lay.paste(shot,(round(bx0),round(by0)))
    tela.paste(lay,(0,0),mask); tela.alpha_composite(frame)
    tela.save(sys.argv[2]+'/'+os.path.basename(f))
