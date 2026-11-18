"""Build elev01.npy (0.1-degree elevation, metres) from NOAA's ETOPO1 colour relief image.
Get the image with:  pip download --no-deps basemap-data  and unzip mpl_toolkits/basemap_data/etopo1.jpg
The colours are matched to heights calibrated at 22 well-known places (Tibet 4800 m, Alps 2000 m, Amazon 100 m ...)."""
from PIL import Image
import numpy as np

im = Image.open('etopo1.jpg').resize((3600, 1800), Image.BILINEAR)
a = np.asarray(im).astype(np.float32)
cal = [((52,105,18),0),((238,208,168),250),((175,140,56),1200),((124,104,22),2300),((155,141,138),4800),((137,82,47),3800),((49,156,59),100),((199,161,89),400),((163,133,26),1500),((112,93,34),2000),((223,185,123),800),((105,81,14),2800),((235,197,160),500),((78,189,94),100),((230,201,165),300),((95,197,105),90),((198,168,103),1000),((143,126,25),1900),((142,118,31),1700),((111,197,111),100),((109,82,81),4000),((123,106,24),1900),((240,240,240),2500)]
C = np.array([c for c, _ in cal], np.float32)
E = np.array([e for _, e in cal], np.float32)
flat = a.reshape(-1, 3)
d = ((flat[:, None, :] - C[None, :, :]) ** 2).sum(-1)
idx = np.argsort(d, 1)[:, :3]
w = 1 / (np.take_along_axis(d, idx, 1) + 1.0)
elev = ((E[idx] * w).sum(1) / w.sum(1)).reshape(1800, 3600).astype(np.float32)
np.save('elev01.npy', elev)
print('saved elev01.npy')
