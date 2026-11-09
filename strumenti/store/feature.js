const { chromium } = require("playwright"); const fs = require("fs"); const R = "/home/claude/curvaroma/";
const b64 = f => fs.readFileSync(f).toString("base64"), font = f => `data:font/woff2;base64,${b64(R + f)}`;
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await pg.setContent(`<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;overflow:hidden;position:relative;background:radial-gradient(circle at 30% 20%,#A52A3B 0,#8E1F2F 45%,#5F0E24 100%);font-family:C,Arial,sans-serif;color:#FFF6F0}
.l{position:absolute;left:64px;top:150px;width:470px}.l img{width:100%;display:block}
p{position:absolute;left:66px;top:262px;width:470px;font-size:30px;line-height:1.25}
.s{position:absolute;right:70px;top:46px;width:300px;border-radius:26px;overflow:hidden;border:5px solid #2B0A15;box-shadow:0 14px 40px rgba(0,0,0,.55);transform:rotate(4deg)}.s img{display:block;width:100%}
</style><div class="l"><img src="data:image/png;base64,${b64(R + "img/logo-chiaro.png")}"></div><p>Pagelle, notizie e pronostici: l'app dei tifosi della Roma.</p><div class="s"><img src="data:image/png;base64,${b64(__dirname + "/iphone/1-pagelle.png")}"></div>`);
  await pg.waitForTimeout(300); await pg.screenshot({ path: __dirname + "/store/google-grafica-1024x500.png" }); await b.close();
})();
