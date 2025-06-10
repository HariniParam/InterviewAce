import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import Header from "../components/header";
import Plotly from "plotly.js-dist-min";
import "./sessionAnalysis.css";

const SessionAnalysis = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [analysis, setAnalysis] = useState({ results: {}, stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      const fetchUser = async () => {
        try {
          const res = await API.get("/profile");
          setUser(res.data);
        } catch (err) {
          navigate("/signin");
        }
      };
      fetchUser();
    }

    fetchSession();
    
    return () => {
      cleanupAudioResources();
    };
  }, [navigate]);

  // Cleans up audio context and media source resources
  const cleanupAudioResources = () => {
    if (mediaSourceRef.current) {
      try {
        mediaSourceRef.current.disconnect();
      } catch (e) {
        console.warn("Error disconnecting media source:", e);
      }
      mediaSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.warn("Error closing audio context:", e));
    }
  };

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/history/${sessionId}`);
      setSession(response.data);
      const { qna, videoUrl: url, role, mode, duration, createdAt } = response.data;
      await analyzeQna(qna, mode, url);
    } catch (err) {
      console.error("Error fetching session:", err);
      setError("Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  // Analyzes an image blob for emotional content
  const analyzeEmotionFromFrame = async (imageBlob) => {
    try {
      if (!imageBlob) {
        console.warn('No image blob provided for emotion analysis');
        return {
          emotions: [{ label: 'neutral', score: 0.5 }],
          primaryEmotion: 'neutral',
          confidence: 50,
          description: 'No image data provided'
        };
      }

      const formData = new FormData();
      formData.append('image', imageBlob, 'frame.jpg');

      const response = await API.post(`/history/${sessionId}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { emotions, primaryEmotion, confidence } = response.data;
      return { emotions, primaryEmotion, confidence, description: 'Backend analysis successful' };
    } catch (error) {
      console.error('Backend emotion analysis failed:', error);
      return {
        emotions: [{ label: 'neutral', score: 0.5 }],
        primaryEmotion: 'neutral',
        confidence: 50,
        description: 'Backend analysis failed'
      };
    }
  };

  // Captures a video frame as an image blob
  const captureVideoFrame = (video, canvas) => {
    return new Promise((resolve) => {
      try {
        if (!canvas || !video || video.readyState < 2) {
          console.warn("Canvas or video not ready for capture");
          resolve(null);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn("Cannot get canvas context");
          resolve(null);
          return;
        }

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        ctx.getContextAttributes().willReadFrequently = true;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
        
      } catch (error) {
        console.warn("Error capturing video frame:", error);
        resolve(null);
      }
    });
  };

  const calculateClarityScore = (qna) => {
    let totalSentences = 0;
    let totalWords = 0;
    let totalCharacters = 0;
    let uniqueWords = new Set();
    let complexWords = 0;
    let responses = 0;

    qna.forEach(item => {
      if (item.answer && typeof item.answer === "string" && item.answer.trim()) {
        responses++;
        const text = item.answer.trim();
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        totalSentences += sentences.length;
        totalWords += words.length;
        totalCharacters += text.length;
        
        words.forEach(word => {
          const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
          uniqueWords.add(cleanWord);
          
          const syllables = countSyllables(cleanWord);
          if (syllables >= 3) complexWords++;
        });
      }
    });

    if (totalWords === 0) return 0;

    const avgWordsPerSentence = totalSentences > 0 ? totalWords / totalSentences : 0;
    const lexicalDiversity = uniqueWords.size / totalWords;
    const complexityRatio = complexWords / totalWords;
    
    const fleschScore = totalSentences > 0 ? 
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * (totalSyllables(qna) / totalWords)) : 0;
    
    const normalizedFlesch = Math.max(0, Math.min(100, fleschScore));
    
    const sentenceLengthScore = getSentenceLengthScore(avgWordsPerSentence);
    const diversityScore = getDiversityScore(lexicalDiversity);
    const complexityScore = getComplexityScore(complexityRatio);
    
    const clarityScore = (
      normalizedFlesch * 0.4 +
      sentenceLengthScore * 0.25 +
      diversityScore * 0.20 +
      complexityScore * 0.15
    );
    
    return Math.round(Math.max(0, Math.min(100, clarityScore)));
  };

  // Counts syllables in a word
  const countSyllables = (word) => {
    if (word.length <= 3) return 1;
    return word.toLowerCase().replace(/[^aeiouy]/g, '').length || 1;
  };

  // Calculates total syllables in Q&A responses
  const totalSyllables = (qna) => {
    let total = 0;
    qna.forEach(item => {
      if (item.answer) {
        const words = item.answer.split(/\s+/).filter(w => w.length > 0);
        words.forEach(word => {
          total += countSyllables(word.replace(/[^\w]/g, ''));
        });
      }
    });
    return total;
  };

  // Scores sentence length for clarity
  const getSentenceLengthScore = (avgWordsPerSentence) => {
    if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) return 100;
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence < 15) return 80;
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence < 10) return 60;
    if (avgWordsPerSentence >= 25 && avgWordsPerSentence <= 30) return 70;
    return Math.max(20, 100 - Math.abs(avgWordsPerSentence - 17.5) * 3);
  };

  // Scores lexical diversity for clarity
  const getDiversityScore = (lexicalDiversity) => {
    if (lexicalDiversity >= 0.6 && lexicalDiversity <= 0.8) return 100;
    if (lexicalDiversity >= 0.5 && lexicalDiversity < 0.6) return 80;
    if (lexicalDiversity >= 0.4 && lexicalDiversity < 0.5) return 60;
    return Math.max(20, 100 - Math.abs(lexicalDiversity - 0.7) * 200);
  };

  // Scores text complexity for clarity
  const getComplexityScore = (complexityRatio) => {
    if (complexityRatio >= 0.1 && complexityRatio <= 0.2) return 100;
    if (complexityRatio >= 0.05 && complexityRatio < 0.1) return 80;
    if (complexityRatio >= 0.2 && complexityRatio <= 0.3) return 70;
    return Math.max(30, 100 - Math.abs(complexityRatio - 0.15) * 300);
  };

  // Calculates sentiment score based on word sentiment
  const calculateSentimentScore = (qna) => {
    const sentimentWords = {
      positive: {
        'excellent': 3, 'outstanding': 3, 'exceptional': 3, 'brilliant': 3,
        'amazing': 3, 'fantastic': 3, 'superb': 3, 'wonderful': 3,
        'good': 2, 'great': 2, 'positive': 2, 'confident': 2, 'successful': 2,
        'effective': 2, 'strong': 2, 'capable': 2, 'skilled': 2, 'experienced': 2,
        'okay': 1, 'fine': 1, 'decent': 1, 'adequate': 1, 'satisfied': 1,
        'comfortable': 1, 'interested': 1, 'motivated': 1, 'ready': 1, 'able': 1
      },
      negative: {
        'terrible': -3, 'awful': -3, 'horrible': -3, 'disaster': -3,
        'failed': -3, 'impossible': -3, 'hate': -3, 'worst': -3,
        'bad': -2, 'poor': -2, 'difficult': -2, 'hard': -2, 'struggle': -2,
        'problem': -2, 'issue': -2, 'concern': -2, 'worried': -2, 'nervous': -2,
        'challenging': -1, 'tough': -1, 'unclear': -1, 'confused': -1,
        'uncertain': -1, 'hesitant': -1, 'concerned': -1, 'tired': -1
      }
    };
    
    let totalSentiment = 0;
    let totalWords = 0;
    let sentimentWords_found = 0;
    
    qna.forEach(item => {
      if (item.answer && typeof item.answer === "string" && item.answer.trim()) {
        const words = item.answer.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 0);
        
        totalWords += words.length;
        
        words.forEach((word, index) => {
          const prevWords = words.slice(Math.max(0, index - 2), index);
          const isNegated = prevWords.some(w => 
            ['not', 'no', 'never', 'none', 'nothing', 'neither', 'nor', 'hardly', 'barely', 'scarcely'].includes(w)
          );
          
          if (sentimentWords.positive[word]) {
            const weight = isNegated ? -sentimentWords.positive[word] : sentimentWords.positive[word];
            totalSentiment += weight;
            sentimentWords_found++;
          }
          
          if (sentimentWords.negative[word]) {
            const weight = isNegated ? -sentimentWords.negative[word] : sentimentWords.negative[word];
            totalSentiment += weight;
            sentimentWords_found++;
          }
        });
      }
    });
    
    if (sentimentWords_found === 0) {
      return 50;
    }
    
    const sentimentDensity = totalSentiment / totalWords;
    const maxDensity = 0.1;
    
    const normalizedSentiment = ((sentimentDensity / maxDensity) + 1) * 50;
    
    return Math.round(Math.max(0, Math.min(100, normalizedSentiment)));
  };

  const analyzeQna = async (qna, mode, videoUrl) => {
    let clarityScore = calculateClarityScore(qna);
    let responseLength = 0;
    let uniqueWordRatio = 0;
    let sentimentScore = calculateSentimentScore(qna);
    let videoMetrics = { brightness: 0, movement: 0 };
    let audioMetrics = { volume: 0, backgroundNoise: 0, speechClarity: 0 };
    let emotionAnalysis = {
      primaryEmotion: 'neutral',
      confidence: 0,
      emotions: [],
      description: 'Analysis in progress...'
    };

    try {
      let totalSentences = 0;
      let totalWords = 0;
      let uniqueWords = new Set();

      qna.forEach(item => {
        if (item.answer && typeof item.answer === "string" && item.answer.trim()) {
          const sentences = item.answer.split(/[.!?]+/).filter(s => s.trim()).length;
          const wordArray = item.answer.split(/\s+/).filter(w => w);
          totalSentences += sentences;
          totalWords += wordArray.length;
          wordArray.forEach(w => uniqueWords.add(w.toLowerCase()));
        }
      });

      responseLength = totalWords;
      uniqueWordRatio = totalWords > 0 ? (uniqueWords.size / totalWords) : 0;

      if (videoUrl) {
        const fullUrl = videoUrl.startsWith("http") ? videoUrl : `http://${window.location.hostname}:5000${videoUrl}`;
        const analysisResult = await analyzeVideoAudioWithEmotion(fullUrl);
        videoMetrics = analysisResult.videoMetrics;
        audioMetrics = analysisResult.audioMetrics;
        emotionAnalysis = analysisResult.emotionAnalysis;
      }

      const results = {
        clarityScore: parseFloat(clarityScore.toFixed(2)),
        responseLength,
        uniqueWordRatio: parseFloat(uniqueWordRatio.toFixed(2)),
        sentimentScore: parseFloat(sentimentScore.toFixed(2)),
        videoMetrics,
        audioMetrics,
        emotionAnalysis,
      };

      const stats = calculateStats(results);
      setAnalysis({ results, stats });
    } catch (err) {
      console.error("Error analyzing session:", err);
      setAnalysis({
        results: {
          clarityScore: 0,
          responseLength: 0,
          uniqueWordRatio: 0,
          sentimentScore: 0,
          videoMetrics: { brightness: 0, movement: 0 },
          audioMetrics: { volume: 0, backgroundNoise: 0, speechClarity: 0 },
          emotionAnalysis: {
            primaryEmotion: 'neutral',
            confidence: 0,
            emotions: [],
            description: 'Analysis failed'
          },
        },
        stats: {
          overallRating: 'Poor',
          overallScore: 0
        }
      });
    }
  };

  // Calculates overall session statistics
  const calculateStats = (results) => {
    const overallScore = ((parseFloat(results.clarityScore) + parseFloat(results.sentimentScore) + parseFloat(results.audioMetrics.speechClarity)) / 3).toFixed(2);
    const overallRating = getPerformanceRating(overallScore);
    return {
      overallScore,
      overallRating,
    };
  };

  // Determines performance rating based on score
  const getPerformanceRating = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Average';
    return 'Needs Improvement';
  };

  // Analyzes video and audio with emotion detection
  const analyzeVideoAudioWithEmotion = async (videoUrl) => {
    return new Promise((resolve) => {
      if (isAnalyzingRef.current) {
        console.warn("Analysis already in progress");
        resolve({
          videoMetrics: { brightness: 0, movement: 0 },
          audioMetrics: { volume: 0, backgroundNoise: 0, speechClarity: 0 },
          emotionAnalysis: {
            primaryEmotion: 'neutral',
            confidence: 0,
            emotions: [],
            description: 'Analysis in progress...'
          }
        });
        return;
      }

      isAnalyzingRef.current = true;

      setTimeout(() => {
        if (!videoRef.current || !canvasRef.current) {
          console.error("DOM elements not ready for video analysis");
          isAnalyzingRef.current = false;
          resolve({
            videoMetrics: { brightness: 0, movement: 0 },
            audioMetrics: { volume: 0, backgroundNoise: 0, speechClarity: 0 },
            emotionAnalysis: {
              primaryEmotion: 'neutral',
              confidence: 0,
              emotions: [],
              description: 'Video analysis failed - DOM elements not ready'
            }
          });
          return;
        }

        performVideoAnalysis(videoUrl, resolve);
      }, 100);
    });
  };

  // Performs frame-by-frame video and audio analysis
  const performVideoAnalysis = (videoUrl, resolve) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Cannot get canvas context");
      isAnalyzingRef.current = false;
      resolve({
        videoMetrics: { brightness: 0, movement: 0 },
        audioMetrics: { volume: 0, backgroundNoise: 0, speechClarity: 0 },
        emotionAnalysis: {
          primaryEmotion: "neutral",
          confidence: 0,
          emotions: [],
          description: "Canvas context not available",
        },
      });
      return;
    }

    ctx.getContextAttributes().willReadFrequently = true;

    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = false; // Unmute video to allow audio analysis

    let framesAnalyzed = 0;
    let totalBrightness = 0;
    let totalMovement = 0;
    let prevFrameData = null;
    let emotionSamples = [];

    let totalVolume = 0;
    let volumeSamples = 0;
    let backgroundNoise = 0;
    let signalToNoiseSamples = [];

    const setupAudioAnalysis = () => {
      try {
        cleanupAudioResources();

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 44100,
        });
        const audioContext = audioContextRef.current;

        if (audioContext.state === "suspended") {
          audioContext.resume().catch(e => console.warn("Error resuming audio context:", e));
        }

        const source = audioContext.createMediaElementSource(video);
        mediaSourceRef.current = source;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser); // Connect source to analyser for processing
        // Do NOT connect to audioContext.destination to prevent audio playback

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        const frequencyData = new Uint8Array(bufferLength);

        const audioAnalyzer = () => {
          if (audioContext.state === "closed") return;

          analyser.getFloatTimeDomainData(dataArray);
          let rms = 0;
          for (let i = 0; i < bufferLength; i++) {
            rms += dataArray[i] * dataArray[i];
          }
          rms = Math.sqrt(rms / bufferLength);
          const volume = Math.min(100, rms * 1000);
          totalVolume += volume;

          if (volume < 10) {
            backgroundNoise += volume;
          }

          analyser.getByteFrequencyData(frequencyData);
          const signalPower = volume > 10 ? volume : 0;
          const noisePower = volume < 10 ? volume : 0.1;
          const snr = signalPower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
          if (snr > 0) {
            signalToNoiseSamples.push(snr);
          }

          volumeSamples++;
        };

        return audioAnalyzer;
      } catch (error) {
        console.warn("Audio analysis setup failed:", error);
        return null;
      }
    };

    let audioAnalyzer = null;

    video.onloadeddata = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      video.currentTime = 0;
      audioAnalyzer = setupAudioAnalysis();
      video.play().catch(e => console.warn("Video play failed:", e));
    };

    // Analyzes individual video frames
    const analyzeFrame = async () => {
      if (framesAnalyzed >= 15 || video.ended || video.paused) {
        video.pause();
        isAnalyzingRef.current = false;

        const emotionAnalysis = await processEmotionSamples(emotionSamples);
        const avgBrightness = framesAnalyzed ? (totalBrightness / framesAnalyzed).toFixed(2) : 0;
        const avgMovement = framesAnalyzed ? (totalMovement / framesAnalyzed).toFixed(2) : 0;
        const avgVolume = volumeSamples ? (totalVolume / volumeSamples).toFixed(2) : 0;
        const avgBackgroundNoise = volumeSamples ? (backgroundNoise / volumeSamples).toFixed(2) : 0;
        const volumeConsistency = volumeSamples > 0 ? (1 - Math.abs(avgVolume - 50) / 50) * 100 : 0;
        const avgSnr = signalToNoiseSamples.length > 0 ?
          signalToNoiseSamples.reduce((sum, snr) => sum + snr, 0) / signalToNoiseSamples.length : 0;
        const snrScore = Math.min(100, (avgSnr / 20) * 100);
        const calculatedSpeechClarity = (volumeConsistency * 0.7 + snrScore * 0.3).toFixed(2);

        resolve({
          videoMetrics: { brightness: parseFloat(avgBrightness), movement: parseFloat(avgMovement) },
          audioMetrics: {
            volume: parseFloat(avgVolume),
            backgroundNoise: parseFloat(avgBackgroundNoise),
            speechClarity: parseFloat(calculatedSpeechClarity),
          },
          emotionAnalysis,
        });
        return;
      }

      try {
        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

          let brightness = 0;
          for (let i = 0; i < imageData.length; i += 4) {
            brightness += (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
          }
          brightness /= (imageData.length / 4);
          totalBrightness += brightness;

          if (prevFrameData) {
            let movement = 0;
            for (let i = 0; i < imageData.length; i += 16) {
              const diff =
                Math.abs(imageData[i] - prevFrameData[i]) +
                Math.abs(imageData[i + 1] - prevFrameData[i + 1]) +
                Math.abs(imageData[i + 2] - prevFrameData[i + 2]);
              movement += diff;
            }
            movement /= (imageData.length / 16);
            totalMovement += movement;
          }
          prevFrameData = imageData.slice();

          if (audioAnalyzer) {
            audioAnalyzer();
          }

          if (framesAnalyzed % 3 === 0) {
            try {
              const frameBlob = await captureVideoFrame(video, canvas);
              if (frameBlob) {
                const emotionResult = await analyzeEmotionFromFrame(frameBlob);
                emotionSamples.push(emotionResult);
              }
            } catch (error) {
              console.warn("Error analyzing emotion for frame:", error);
            }
          }

          framesAnalyzed++;
          video.currentTime += 2;
        }

        setTimeout(analyzeFrame, 200);
      } catch (error) {
        console.warn("Frame analysis error:", error);
        setTimeout(analyzeFrame, 200);
      }
    };

    video.onseeked = analyzeFrame;
    video.onerror = (error) => {
      console.error("Video load error:", error);
      isAnalyzingRef.current = false;
      resolve({
        videoMetrics: { brightness: 0, movement: 0 },
        audioMetrics: { volume: 0, backgroundNoise: 0, speechClarity: 0 },
        emotionAnalysis: {
          primaryEmotion: "neutral",
          confidence: 0,
          emotions: [],
          description: "Video analysis failed",
        },
      });
    };

    setTimeout(() => {
      if (isAnalyzingRef.current) {
        isAnalyzingRef.current = false;
        resolve({
          videoMetrics: { brightness: 0, movement: 0 },
          audioMetrics: { volume: 0, backgroundNoise: 0, speechClarity: 0 },
          emotionAnalysis: {
            primaryEmotion: "neutral",
            confidence: 0,
            emotions: [],
            description: "Video analysis timeout",
          },
        });
      }
    }, 15000);
  };

  // Processes emotion samples to determine dominant emotion
  const processEmotionSamples = async (samples) => {
    if (samples.length === 0) {
      return {
        primaryEmotion: 'neutral',
        confidence: 0,
        emotions: [{ label: 'neutral', score: 1.0 }],
        description: 'No emotion data captured from video frames'
      };
    }
    const emotionCounts = {};
    let totalConfidence = 0;

    samples.forEach(sample => {
      const { primaryEmotion, confidence } = sample;
      emotionCounts[primaryEmotion] = (emotionCounts[primaryEmotion] || 0) + 1;
      totalConfidence += parseFloat(confidence) || 0;
    });

    const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => 
      emotionCounts[a] > emotionCounts[b] ? a : b
    );

    const avgConfidence = totalConfidence / samples.length;

    return {
      primaryEmotion: dominantEmotion,
      confidence: avgConfidence.toFixed(2),
      emotions: Object.entries(emotionCounts).map(([emotion, count]) => ({
        label: emotion,
        score: (count / samples.length).toFixed(2)
      })),
      description: generateEmotionDescription(dominantEmotion, avgConfidence, emotionCounts)
    };
  };

  const generateEmotionDescription = (dominantEmotion, confidence, emotionCounts) => {
    const total = Object.values(emotionCounts).reduce((sum, count) => sum + count, 0);
    const percentage = ((emotionCounts[dominantEmotion] / total) * 100).toFixed(1);
    
    let description = `Primary emotion: ${dominantEmotion} (${percentage}% of frames). `;
    
    if (confidence > 80) {
      description += "High confidence in detection. ";
    } else if (confidence > 60) {
      description += "Moderate confidence in detection. ";
    } else {
      description += "Low confidence - results may vary. ";
    }

    const emotionContexts = {
      happy: "Subject appears positive and engaged.",
      sad: "Subject may be experiencing difficulty or stress.",
      angry: "Subject shows signs of frustration or intensity.",
      surprised: "Subject appears alert and reactive.",
      fear: "Subject may be experiencing anxiety.",
      disgust: "Subject shows signs of discomfort.",
      calm: "Subject appears relaxed and composed.",
      neutral: "Subject maintains a steady demeanor."
    };

    description += emotionContexts[dominantEmotion] || "Subject's emotional state is unclear.";
    return description;
  };

  const renderVisualizations = (results, stats) => {
    const metricsChart = document.getElementById("metrics-bar");
    const emotionChart = document.getElementById("emotion-pie");
    
    if (!metricsChart || !emotionChart) {
      console.error("Chart DOM elements missing");
      return;
    }

    Plotly.newPlot(
      "metrics-bar",
      [
        {
          x: ['Clarity', 'Sentiment', 'Brightness', 'Volume', 'Speech Clarity'],
          y: [
            results.clarityScore,
            results.sentimentScore,
            results.videoMetrics.brightness,
            results.audioMetrics.volume,
            results.audioMetrics.speechClarity
          ],
          type: 'bar',
          marker: { color: ['#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#FF9AA2'] }
        }
      ],
      {
        title: "Overall Session Metrics",
        paper_bgcolor: "#1A2A44",
        plot_bgcolor: "#1A2A44",
        font: { color: "#FFFFFF", size: 12 },
        xaxis: { title: "Metric", color: "#FFFFFF" },
        yaxis: { title: "Score (%)", color: "#FFFFFF" },
      },
      { responsive: true }
    );

    const emotionData = results.emotionAnalysis?.emotions || [];
    if (emotionData.length > 0) {
      Plotly.newPlot(
        "emotion-pie",
        [
          {
            labels: emotionData.map(e => e.label),
            values: emotionData.map(e => parseFloat(e.score)),
            type: "pie",
            marker: {
              colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
            },
            textinfo: 'label+percent',
            textfont: { color: '#FFFFFF' }
          },
        ],
        {
          title: "Session Emotion Distribution",
          paper_bgcolor: "#1A2A44",
          plot_bgcolor: "#1A2A44",
          font: { color: "#FFFFFF", size: 12 },
          showlegend: true,
          legend: { font: { color: "#FFFFFF" } }
        },
        { responsive: true }
      );
    } else {
      Plotly.newPlot(
        "emotion-pie",
        [],
        {
          title: "Session Emotion Distribution",
          annotations: [{
            text: "",
            x: 0.5,
            y: 0.5,
            showarrow: false,
            font: { color: "#FFFFFF", size: 16 }
          }],
          paper_bgcolor: "#1A2A44",
          plot_bgcolor: "#1A2A44",
          font: { color: "#FFFFFF", size: 12 }
        },
        { responsive: true }
      );
    }
  };

  useEffect(() => {
    if (analysis.results.clarityScore !== undefined) {
      renderVisualizations(analysis.results, analysis.stats);
    }
  }, [analysis]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="analysis-page">
        <Header user={user} />
        <div className="analysis-content">
          <div className="loading-spinner">Loading analysis...</div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="analysis-page">
        <Header user={user} />
        <div className="analysis-content">
          <div className="error-container">
            <p>{error || "Session not found"}</p>
            <button className="back-btn" onClick={() => navigate("/history")}>
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-page">
      <Header user={user} />
      <div className="analysis-content">
        <div className="analysis-header">
          <h1>Session Analysis</h1>
          <p>Overall performance insights for your interview</p>
          <div className="analysis-meta">
            <span className="analysis-meta-item">Role: {session?.role || "N/A"}</span>
            <span className="analysis-meta-item">Mode: {session?.mode || "N/A"}</span>
            <span className="analysis-meta-item">Date: {formatDate(session?.createdAt)}</span>
            <span className="analysis-meta-item">Duration: {formatDuration(session?.duration || 0)}</span>
            <span className="analysis-meta-item">Overall Rating: {analysis.stats?.overallRating || "N/A"}</span>
            <span className="analysis-meta-item">Overall Score: {analysis.stats?.overallScore || 0}%</span>
            <button className="back-btn" onClick={() => navigate("/history")}>
              Back to History
            </button>
          </div>
        </div>
        
        <div className="visualizations">
          <h2>Session Performance Overview</h2>
          <div className="chart-grid">
            <div className="chart-wrapper">
              <div id="metrics-bar" className="chart"></div>
            </div>
            <div className="chart-wrapper">
              <div id="emotion-pie" className="chart"></div>
            </div>
          </div>
        </div>

        {analysis.results.clarityScore === undefined ? (
          <div className="no-analysis">
            <h3>No Analysis Available</h3>
            <p>No data was available for this session.</p>
            <button className="back-btn" onClick={() => navigate("/history")}>
              Back to History
            </button>
          </div>
        ) : (
          <div className="analysis-grid">
            <div className="analysis-card">
              <h3>Text Analysis</h3>
              <div className="analysis-item">
                <span className="label">Clarity Score:</span>
                <span className="value">{analysis.results.clarityScore || 0}%</span>
              </div>
              <div className="analysis-item">
                <span className="label">Sentiment Score:</span>
                <span className="value">{analysis.results.sentimentScore || 0}%</span>
              </div>
              <div className="analysis-item">
                <span className="label">Total Words:</span>
                <span className="value">{analysis.results.responseLength || 0}</span>
              </div>
              <div className="analysis-item">
                <span className="label">Unique Word Ratio:</span>
                <span className="value">{analysis.results.uniqueWordRatio || 0}</span>
              </div>
            </div>
            
            <div className="analysis-card">
              <h3>Emotion Analysis</h3>
              <div className="analysis-item">
                <span className="label">Primary Emotion:</span>
                <span className="value emotion-badge">{analysis.results.emotionAnalysis?.primaryEmotion || "neutral"}</span>
              </div>
              <div className="analysis-item">
                <span className="label">Confidence:</span>
                <span className="value">{analysis.results.emotionAnalysis?.confidence || 0}%</span>
              </div>
              <div className="analysis-item">
                <span className="label">Analysis Description:</span>
                <p className="emotion-description">{analysis.results.emotionAnalysis?.description || "No data available"}</p>
              </div>
            </div>
            
            <div className="analysis-card">
              <h3>Proctoring Insights</h3>
              <div className="analysis-item">
                <span className="label">Lighting Quality:</span>
                <span className="value">{analysis.results.videoMetrics?.brightness || 0}%</span>
              </div>
              <div className="analysis-item">
                <span className="label">Movement Detected:</span>
                <span className="value">{analysis.results.videoMetrics?.movement > 10 ? "High" : "Low"}</span>
              </div>
              <div className="analysis-item">
                <span className="label">Audio Volume:</span>
                <span className="value">{analysis.results.audioMetrics?.volume || 0}%</span>
              </div>
              <div className="analysis-item">
                <span className="label">Background Noise:</span>
                <span className="value">{analysis.results.audioMetrics?.backgroundNoise > 5 ? "High" : "Low"}</span>
              </div>
              <div className="analysis-item">
                <span className="label">Speech Clarity:</span>
                <span className="value">{analysis.results.audioMetrics?.speechClarity || 0}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default SessionAnalysis;