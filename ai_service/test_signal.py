import sys
sys.path.insert(0, r"D:\py_packages")
from ecg_analyzer import analyze_ecg_file

result = analyze_ecg_file("test_ecg_normal.csv")
print("=== ECG Signal Analysis Result ===")
print("  Heart Rate   :", result["heartRate"], "bpm")
print("  Rhythm       :", result["rhythmType"])
print("  PR Interval  :", result["prInterval"], "ms")
print("  QRS Duration :", result["qrsDuration"], "ms")
print("  QTc          :", result["qtcInterval"], "ms")
print("  ST Deviation :", result["stDeviation"], "mm")
print("  Risk Score   :", result["riskScore"], "/ 100")
print("  Status       :", result["status"])
print("  Confidence   :", result["confidence"], "%")
print("  Method       :", result["analysisMethod"])
print("  Conditions   :", [c["name"] for c in result["conditions"]])
print("  Samples      :", result["signalSamples"], "@", result["samplingRate"], "Hz")
print("  Recommendation:", result["recommendation"][:80], "...")
