# Kokoro voice through kokoro-onnx (pip install kokoro-onnx soundfile), all clips in one go.
# Model files (from github.com/thewh1teagle/kokoro-onnx releases, model-files-v1.0):
#   kokoro-v1.0.int8.onnx (or kokoro-v1.0.onnx) and voices-v1.0.bin
# Usage: python kokoro_tts.py <model.onnx> <voices.bin> < jobs.json
#   jobs.json: [{"text": "...", "out": "a.wav", "voice": "bm_george", "speed": 1.0, "lang": "en-gb"}, ...]
import sys, json, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro(sys.argv[1], sys.argv[2])
for j in json.load(sys.stdin):
    samples, sr = k.create(j["text"], voice=j.get("voice", "bm_george"), speed=float(j.get("speed", 1.0)), lang=j.get("lang", "en-gb"))
    sf.write(j["out"], samples, sr)
    print(j["out"], round(len(samples) / sr, 2), flush=True)
