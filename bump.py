# -*- coding: utf-8 -*-
import glob, io, re, time

ver = time.strftime('%Y%m%d%H%M')
pat = re.compile(r'(href|src)="((?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=\d+)?"')
changed = 0
for f in glob.glob('*.html'):
    s = io.open(f, encoding='utf-8').read()
    new = pat.sub(lambda m: '%s="%s?v=%s"' % (m.group(1), m.group(2), ver), s)
    if new != s:
        io.open(f, 'w', encoding='utf-8').write(new)
        changed += 1
print('버전 %s 적용, 파일 %d개' % (ver, changed))
