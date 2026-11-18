# Genera las fuentes estáticas WOFF2 del navegador (la UI y la vista rápida de colores).
# Uso: python3 scripts/build-fonts.py  (necesita fonttools y brotli). Ya vienen generadas en public/fonts.
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
G = '/usr/share/fonts/truetype/sand-box/google/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'fonts')
JOBS = [
  ('inter-400', 'Inter/Inter-VariableFont_opsz,wght.ttf', {'wght': 400, 'opsz': 14}),
  ('inter-500', 'Inter/Inter-VariableFont_opsz,wght.ttf', {'wght': 500, 'opsz': 14}),
  ('inter-600', 'Inter/Inter-VariableFont_opsz,wght.ttf', {'wght': 600, 'opsz': 14}),
  ('inter-700', 'Inter/Inter-VariableFont_opsz,wght.ttf', {'wght': 700, 'opsz': 24}),
  ('jakarta-400', 'Plus Jakarta Sans/PlusJakartaSans-VariableFont_wght.ttf', {'wght': 400}),
  ('jakarta-700', 'Plus Jakarta Sans/PlusJakartaSans-VariableFont_wght.ttf', {'wght': 700}),
  ('playfair-700', 'Playfair Display/PlayfairDisplay-VariableFont_wght.ttf', {'wght': 700}),
  ('bricolage-700', 'Bricolage Grotesque/BricolageGrotesque-VariableFont_opsz,wdth,wght.ttf', {'wght': 700, 'opsz': 72, 'wdth': 100}),
  ('fraunces-600', 'Fraunces/Fraunces-VariableFont_SOFT,WONK,opsz,wght.ttf', {'wght': 600, 'opsz': 72, 'SOFT': 50, 'WONK': 0}),
  ('instrument-serif-400', 'Instrument Serif/InstrumentSerif-Regular.ttf', None),
  ('instrument-serif-400i', 'Instrument Serif/InstrumentSerif-Italic.ttf', None),
]
UNI = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+2605,U+2713,U+00B7'
for name, src, loc in JOBS:
    f = TTFont(G + src)
    if loc:
        axes = {a.axisTag for a in f['fvar'].axes}
        f = instancer.instantiateVariableFont(f, {k: v for k, v in loc.items() if k in axes})
        if 'wght' in loc: f['OS/2'].usWeightClass = loc['wght']
    for flavor, ext in (('woff2', 'woff2'),):
        opts = subset.Options(); opts.flavor = flavor; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
        s = subset.Subsetter(opts); s.populate(unicodes=subset.parse_unicodes(UNI)); 
        g = TTFont(); f2 = f
        import copy; f2 = copy.deepcopy(f)
        s.subset(f2); f2.flavor = flavor
        f2.save(os.path.join(OUT, f'{name}.{ext}'))
    print('ok', name)
