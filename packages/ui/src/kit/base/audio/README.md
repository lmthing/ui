# kit/base/audio

`KitMicCapture` shows supplied levels and elapsed time, with hold or toggle input.
Only a host `MicCaptureAdapter` opens capture, after its own permission check.
Preview and missing-adapter states never request audio.
