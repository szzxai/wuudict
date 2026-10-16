import json, sys, io

out = io.StringIO()
def p(*a):
    print(*a, file=out)

raw = open(r'data\dict.json', encoding='utf-8').read()
p('size:', len(raw))
p('head repr:', repr(raw[:120]))
p('tail repr:', repr(raw[-120:]))
try:
    d = json.loads(raw)
    p('VALID, entries:', len(d))
    p('sample0:', repr(d[0]))
except Exception as e:
    p('INVALID:', repr(str(e))[:300])

open('tmp_py_check.txt', 'w', encoding='utf-8').write(out.getvalue())
