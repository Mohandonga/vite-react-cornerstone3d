// VideoPlayer.tsx
import React, { useEffect, useRef, useState } from "react";
import FileHandler from "./FileHandler";
import {
  RenderingEngine,
  Enums,
  init as csInit,
  metaData,
} from "@cornerstonejs/core";
import * as dicomImageLoader from "@cornerstonejs/dicom-image-loader";

interface VideoPlayerProps {
  file: File;
  fileType: 'dicom-video' | 'regular-video' | 'dicom-image' | 'regular-image' | 'unknown';
}

// Convert local file to imageId for Cornerstone.js
export async function fileToImageId(file: File): Promise<string> {
  return dicomImageLoader.wadouri.fileManager.add(file);
}

// Check if DICOM file is a video
export async function isDicomVideo(imageId: string): Promise<boolean> {
  try {
    const sopCommonModule = metaData.get("sopCommonModule", imageId);
    const multiframeModule = metaData.get("multiframeModule", imageId);
    const numberOfFrames = multiframeModule?.numberOfFrames || 
                          metaData.get("numberOfFrames", imageId) || 
                          1;

    const videoSopClasses = [
      "1.2.840.10008.5.1.4.1.1.77.1.1.1",  // Video Endoscopic Image Storage
      "1.2.840.10008.5.1.4.1.1.77.1.2.1",  // Video Microscopic Image Storage
      "1.2.840.10008.5.1.4.1.1.77.1.4.1",  // Video Photographic Image Storage
      "1.2.840.10008.5.1.4.1.1.181.1",     // Ophthalmic Video
      "1.2.840.10008.5.1.4.1.1.6.2",       // Ultrasound Multi-frame
      "1.2.840.10008.5.1.4.1.1.3.1",       // Ultrasound Multi-frame (Retired)
      "1.2.840.10008.5.1.4.1.1.12.1",      // X-Ray Angiographic Image Storage
      "1.2.840.10008.5.1.4.1.1.12.2",      // X-Ray Radiofluoroscopic Image Storage
    ];

    const sopClassUID = sopCommonModule?.sopClassUID || "";
    return videoSopClasses.includes(sopClassUID) || numberOfFrames > 1;
  } catch (error) {
    console.error("Error checking if DICOM is video:", error);
    return false;
  }
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ file, fileType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dicomViewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const renderingEngineRef = useRef<RenderingEngine | null>(null);

  useEffect(() => {
    if (!file || !containerRef.current) {
      console.log("No file or container available");
      return;
    }

    const handleFile = async () => {
      setError("");
      console.log(`Processing file: ${file.name}, Type: ${fileType}`);
      
      try {
        if (fileType === 'dicom-video' || fileType === 'dicom-image') {
          console.log("Handling DICOM file with Cornerstone.js");
          await handleDicomFile(file, fileType === 'dicom-video');
        } else if (fileType === 'regular-video') {
          const url = URL.createObjectURL(file);
          setVideoUrl(url);
          console.log(`Created object URL for regular video: ${url}`);
          await setupVideoPlayer(url);
        } else if (fileType === 'regular-image') {
          const url = URL.createObjectURL(file);
          setVideoUrl(url);
          console.log(`Created object URL for regular image: ${url}`);
          await handleRegularImage(url);
        } else {
          setError(`Unsupported file type: ${fileType}`);
          console.error(`Unsupported file type: ${fileType}`);
        }
      } catch (err: any) {
        setError(`Failed to load file: ${err.message}`);
        console.error(`Error loading file:`, err);
      }
    };

    handleFile();

    // Cleanup function
    return () => {
      console.log("Cleaning up...");
      if (videoUrl) {
        console.log(`Revoking object URL: ${videoUrl}`);
        URL.revokeObjectURL(videoUrl);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
      // Clean up Cornerstone.js rendering engine if initialized
      if (renderingEngineRef.current) {
        renderingEngineRef.current.disableElement("dicomVP");
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }
    };
  }, [file, fileType]);

  const setupVideoPlayer = async (url: string) => {
    if (!videoRef.current) {
      console.error("Video element not available");
      return;
    }

    const video = videoRef.current;
    video.src = url;
    console.log("Video source set:", url);
    
    // Wait for video to load metadata
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        console.log("Video metadata loaded, duration:", video.duration);
        resolve();
      };
      video.onerror = () => {
        console.error("Error loading video metadata");
        reject(new Error("Failed to load video metadata"));
      };
      video.load();
    });

    setDuration(video.duration);
    
    // Add event listeners
    video.addEventListener('timeupdate', () => {
      setCurrentTime(video.currentTime);
    });
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    video.addEventListener('ended', () => setIsPlaying(false));
    video.addEventListener('error', (e) => {
      console.error("Video playback error:", e);
      setError("Video playback failed. Format may not be supported by browser.");
    });
    
    console.log("Video player setup complete");
  };

  const handleRegularImage = async (url: string) => {
    if (!imageRef.current) {
      console.error("Image element not available");
      return;
    }
    
    const image = imageRef.current;
    image.src = url;
    console.log("Image source set:", url);
    
    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        console.log("Image loaded successfully");
        resolve();
      };
      image.onerror = () => {
        console.error("Error loading image");
        reject(new Error("Failed to load image"));
      };
    });
  };

  const handleDicomFile = async (file: File, isVideo: boolean) => {
    try {
      // Initialize Cornerstone.js
      console.log("Initializing Cornerstone.js");
      await csInit();
      console.log("Cornerstone.js initialized");

      // Convert file to imageId for Cornerstone.js
      const imageId = await fileToImageId(file);
      console.log("DICOM imageId created:", imageId);

      const renderingEngineId = "dicomRE";
      const viewportId = "dicomVP";

      // Create a new rendering engine
      const renderingEngine = new RenderingEngine(renderingEngineId);
      renderingEngineRef.current = renderingEngine;

      // Enable viewport for DICOM rendering - Use VIDEO viewport for DICOM videos
      renderingEngine.enableElement({
        viewportId,
        type: isVideo ? Enums.ViewportType.VIDEO : Enums.ViewportType.STACK,
        element: dicomViewportRef.current!,
        defaultOptions: {
          background: [0, 0, 0]
        }
      });

      console.log(`Viewport enabled for DICOM ${isVideo ? 'video' : 'image'} rendering`);

      const viewport = renderingEngine.getViewport(viewportId) as any;
      
      if (isVideo) {
        // Set video for rendering
        await viewport.setVideo(imageId);
        console.log("DICOM video set for rendering");
        viewport.play();
        console.log("DICOM video playback started");
      } else {
        // Set stack for image rendering
        await viewport.setStack([imageId]);
        console.log("DICOM stack set for rendering");
      }

      // Render the content
      viewport.render();
      console.log(`DICOM ${isVideo ? 'video' : 'image'} rendered`);
    } catch (err: any) {
      console.error("Error rendering DICOM file:", err);
      setError(`Failed to render DICOM file: ${err.message}. Ensure Cornerstone.js and its dependencies are properly installed.`);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      console.log("Pausing video");
      videoRef.current.pause();
    } else {
      console.log("Playing video");
      videoRef.current.play();
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      console.log(`Seeking to: ${time}`);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    console.log("Toggling fullscreen");
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      console.log("Restarting video");
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: 10, 
          padding: 10, 
          background: '#ffe6e6',
          borderRadius: 5 
        }}>
          {error}
        </div>
      )}
      
      {/* Container for rendering */}
      <div
        ref={containerRef}
        style={{ 
          position: 'relative',
          width: "100%", 
          height: "60vh", 
          background: "black",
          border: "1px solid #ddd",
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        {fileType === 'regular-video' ? (
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain"
            }}
          />
        ) : fileType === 'regular-image' ? (
          <img
            ref={imageRef}
            alt={file.name}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain"
            }}
          />
        ) : (fileType === 'dicom-image' || fileType === 'dicom-video') ? (
          <div
            ref={dicomViewportRef}
            style={{
              width: "100%",
              height: "100%",
              background: "black"
            }}
          />
        ) : (
          <div style={{ color: 'white', textAlign: 'center' }}>
            <p>Unable to display content</p>
          </div>
        )}
        
        {/* Custom Video Controls (only for regular videos) */}
        {fileType === 'regular-video' && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '0',
            right: '0',
            background: 'rgba(0,0,0,0.7)',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button 
              onClick={togglePlay}
              style={{ 
                background: '#007bff', 
                border: 'none', 
                color: 'white', 
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            
            <span style={{ color: 'white', fontSize: '14px' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              style={{ flex: 1, cursor: 'pointer' }}
            />
            
            <button 
              onClick={restartVideo}
              style={{ 
                background: '#28a745', 
                border: 'none', 
                color: 'white', 
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              🔄 Restart
            </button>
            
            <button 
              onClick={handleFullscreen}
              style={{ 
                background: '#6c757d', 
                border: 'none', 
                color: 'white', 
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ⛶ Fullscreen
            </button>
          </div>
        )}
      </div>
      
      {/* File Information */}
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        background: '#f8f9fa',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <p><strong>File Name:</strong> {file.name}</p>
        <p><strong>File Type:</strong> {fileType.replace('-', ' ').toUpperCase()}</p>
        <p><strong>File Size:</strong> {FileHandler.getFileSize(file)}</p>
        <p><strong>MIME Type:</strong> {file.type || 'Unknown'}</p>
      </div>
    </div>
  );
};

// Helper function to format time
function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default VideoPlayer;