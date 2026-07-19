# -*- mode: python ; coding: utf-8 -*-
# Spec multiplataforma (Windows: pasta + exe | macOS: AioraFlow.app).
import sys
from PyInstaller.utils.hooks import collect_all

datas = [("web", "web")]
binaries = []
hiddenimports = []

for pkg in [
    "faster_whisper", "ctranslate2", "av", "onnxruntime", "imageio_ffmpeg",
    "tokenizers", "huggingface_hub", "webview", "anthropic", "docx",
]:
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="AioraFlow",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="AioraFlow",
)

if sys.platform == "darwin":
    app = BUNDLE(
        coll,
        name="AioraFlow.app",
        icon=None,
        bundle_identifier="com.aioraflow.app",
        info_plist={
            "NSMicrophoneUsageDescription": "O AioraFlow usa o microfone para gravar o áudio da consulta.",
            "CFBundleShortVersionString": "1.0.0",
            "NSHighResolutionCapable": True,
        },
    )
