/*
 * Recorder helper - lets a teacher record their OWN voice for any
 * phonics sound using the device microphone (MediaRecorder API), so
 * the app can play back a real human voice instead of relying on
 * text-to-speech guesses that behave differently across devices and
 * installed voices.
 *
 * Requires a "secure context" (https://, or localhost) for
 * getUserMedia to work - this is satisfied by the GitHub Pages
 * deployment, but recording may be unavailable if index.html is
 * opened directly as a local file:// in some browsers. Text-to-speech
 * playback still works either way.
 */
(function (global) {
  "use strict";

  function isSupported() {
    return !!(
      global.navigator &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      global.MediaRecorder
    );
  }

  /**
   * Start recording from the microphone. Calls `onStop(dataUrl)` with a
   * base64 data: URL of the recorded audio once stopped, or
   * `onError(err)` if the microphone couldn't be used. Returns a handle
   * with a `.stop()` method (or null if unsupported).
   */
  function record(onStop, onError) {
    if (!isSupported()) {
      if (onError) {
        onError(
          new Error(
            "Recording isn't available in this browser/context (needs a microphone and a secure https/localhost page)."
          )
        );
      }
      return null;
    }

    let recorder = null;
    let chunks = [];
    let stream = null;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        stream = mediaStream;
        recorder = new MediaRecorder(stream);
        chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () => onStop(reader.result);
          reader.readAsDataURL(blob);
        };
        recorder.start();
      })
      .catch((err) => {
        if (onError) onError(err);
      });

    return {
      stop() {
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        } else if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      }
    };
  }

  global.Recorder = { isSupported, record };
})(typeof window !== "undefined" ? window : globalThis);
