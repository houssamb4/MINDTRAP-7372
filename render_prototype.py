"""Deterministic 30 fps rendering of the app's shared canvas, with actual PCM-driven lips."""
from playwright.sync_api import sync_playwright
import subprocess,base64,math,array
from pathlib import Path
root=Path('/home/user/mind-trap')
sample_rate=48000
clips=[]
for i in range(3):
    clips.extend([(f'hook{i+1}',i*14.5),(f'reveal{i+1}',i*14.5+10.5)])
clips.append(('outro',43.5))
waveforms=[]
for name,start in clips:
    data=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/f'packages/web/public/audio/{name}_1794344440309.mp3'),'-ac','1','-ar',str(sample_rate),'-f','f32le','-'])
    samples=array.array('f');samples.frombytes(data);waveforms.append((start,samples))
def mouth_at(t):
    for start,samples in waveforms:
        off=int((t-start)*sample_rate)
        if 0<=off<len(samples):
            values=samples[max(0,off-256):min(len(samples),off+256)]
            rms=math.sqrt(sum(x*x for x in values)/max(1,len(values)))*.9
            return 0 if rms<.009 else min(1,rms*9)
    return 0
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.goto('http://localhost:4200',wait_until='networkidle')
    page.evaluate("""async()=>{
      await document.fonts.load('900 80px Poppins'); await document.fonts.load('700 40px Poppins'); await document.fonts.load('400 30px Poppins');
      const mod=await import('/src/web/lib/show.ts');
      window.renderShow=mod.drawShow;window.showChallenges=mod.defaults;window.showSettings=mod.initialSettings;
      window.renderCanvas=document.createElement('canvas');renderCanvas.width=1080;renderCanvas.height=1920;
    }""")
    encoder=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-i',str(root/'mind-trap-prototype.webm'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','49','-movflags','+faststart',str(root/'mind-trap-prototype.mp4')],stdin=subprocess.PIPE)
    for frame in range(1470):
        t=frame/30
        png=page.evaluate("""([t,mouth])=>{renderShow(renderCanvas.getContext('2d'),t,showChallenges,showSettings,mouth);return renderCanvas.toDataURL('image/png').split(',')[1]}""",[t,mouth_at(t)])
        encoder.stdin.write(base64.b64decode(png))
    encoder.stdin.close()
    code=encoder.wait()
    browser.close()
    if code:raise RuntimeError(f'Video encoder failed: {code}')
    print('Rendered 1470 deterministic frames at 30 fps with PCM-driven mouth animation.')