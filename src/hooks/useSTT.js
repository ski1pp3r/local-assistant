import { useState, useRef, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';
import { log, LOG_TYPES } from '../utils/logger';

export function useSTT(settings) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const transcriberRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const toggleListening = useCallback(async (onResult) => {
    if (listening) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setListening(false);
      }
      return;
    }

    try {
      if (!transcriberRef.current) {
        log('STT_MODEL_LOADING', LOG_TYPES.STT);
        setModelLoading(true);
        transcriberRef.current = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
          device: 'webgpu',
        }).catch(async () => {
          log('STT_WEBGPU_FAILED, FALLING BACK TO CPU', LOG_TYPES.ERROR);
          return await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base');
        });
        setModelLoading(false);
        log('STT_MODEL_LOADED', LOG_TYPES.STT);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      log('STT_RECORDING_STARTED', LOG_TYPES.STT);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        log('STT_RECORDING_STOPPED', LOG_TYPES.STT);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setTranscribing(true);
        log('STT_TRANSCRIBING...', LOG_TYPES.STT);
        
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);

          const langCode = settings?.ui_language === 'en' ? 'en' : 'de';
          const result = await transcriberRef.current(channelData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: langCode,
            task: 'transcribe',
          });

          const text = result.text.trim();
          if (text) {
            log(`STT_RESULT: "${text}"`, LOG_TYPES.STT);
            onResult(text);
          }
        } catch (err) {
          console.error('Transcription error:', err);
          alert('Transcription failed: ' + err.message);
        } finally {
          setTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setListening(true);
    } catch (err) {
      console.error('Mic access error:', err);
      alert('Mic access denied: ' + err.message);
      setModelLoading(false);
    }
  }, [listening, settings]);

  return { listening, transcribing, modelLoading, toggleListening };
}
