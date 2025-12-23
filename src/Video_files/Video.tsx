// App.tsx
import React, { useState } from "react";
import VideoPlayer from "./VideoPlayer";
import FileHandler from "./FileHandler";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'dicom-video' | 'regular-video' | 'dicom-image' | 'regular-image' | 'unknown'>('unknown');
  const [validationError, setValidationError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0] || null;
    
    // Reset states
    setFile(null);
    setFileType('unknown');
    setValidationError("");
    
    if (!uploadedFile) {
      return;
    }

    // Validate file
    const validation = FileHandler.validateFile(uploadedFile);
    if (!validation.isValid) {
      setValidationError(validation.errors.join(', '));
      return;
    }

    setIsLoading(true);
    
    try {
      // Determine file type
      const type = await FileHandler.getDetailedFileType(uploadedFile);
      setFileType(type);
      setFile(uploadedFile);
    } catch (error: any) {
      setValidationError(`Error processing file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.style.background = '#e3f2fd';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.style.background = '#f8f9fa';
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.style.background = '#f8f9fa';
    
    const droppedFile = event.dataTransfer.files?.[0] || null;
    if (!droppedFile) return;

    // Validate file
    const validation = FileHandler.validateFile(droppedFile);
    if (!validation.isValid) {
      setValidationError(validation.errors.join(', '));
      return;
    }

    setIsLoading(true);
    
    try {
      const type = await FileHandler.getDetailedFileType(droppedFile);
      setFileType(type);
      setFile(droppedFile);
    } catch (error: any) {
      setValidationError(`Error processing file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileType('unknown');
    setValidationError("");
  };

  return (
    <div style={{ 
      padding: 20, 
      maxWidth: 1200, 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        color: '#2c3e50',
        marginBottom: 30
      }}>
         Medical File Viewer
      </h1>
      
      {/* Upload Section */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: '2px dashed #007bff',
          borderRadius: 10,
          padding: 40,
          textAlign: 'center',
          background: '#f8f9fa',
          marginBottom: 30,
          cursor: 'pointer',
          transition: 'background 0.3s ease'
        }}
      >
        {isLoading ? (
          <div>
            <div style={{ fontSize: 48, marginBottom: 10 }}>⏳</div>
            <p style={{ color: '#6c757d', margin: 0 }}>Processing file...</p>
          </div>
        ) : file ? (
          <div>
            <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
            <p style={{ color: '#28a745', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              File Loaded Successfully!
            </p>
            <p style={{ margin: '5px 0', color: '#495057' }}>
              <strong>Name:</strong> {file.name}
            </p>
            <p style={{ margin: '5px 0', color: '#495057' }}>
              <strong>Type:</strong> {fileType.replace('-', ' ').toUpperCase()}
            </p>
            <p style={{ margin: '5px 0', color: '#495057' }}>
              <strong>Size:</strong> {FileHandler.getFileSize(file)}
            </p>
            <button
              onClick={clearFile}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 5,
                cursor: 'pointer',
                marginTop: 15
              }}
            >
              Remove File
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 48, marginBottom: 10 }}></div>
            <p style={{ fontSize: 18, color: '#495057', margin: '0 0 10px 0' }}>
              Drag & Drop your file here
            </p>
            <p style={{ color: '#6c757d', margin: '0 0 20px 0' }}>
              or click to browse
            </p>
            <input
              type="file"
              id="file-input"
              onChange={handleUpload}
              accept=".dcm,.mp4,.avi,.mov,.wmv,.flv,.webm,.jpg,.jpeg,.png,.gif,.bmp"
              style={{ display: 'none' }}
            />
            <label
              htmlFor="file-input"
              style={{
                background: '#007bff',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'inline-block',
                textDecoration: 'none',
                transition: 'background 0.3s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#0056b3')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#007bff')}
            >
              Browse Files
            </label>
            <p style={{ color: '#6c757d', fontSize: 14, marginTop: 10 }}>
              Supported formats: Videos (MP4, AVI, MOV, etc.), Images (JPG, PNG, etc.), DICOM (.dcm)
            </p>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {validationError && (
        <div style={{
          background: '#ffe6e6',
          color: '#dc3545',
          padding: 15,
          borderRadius: 5,
          marginBottom: 20,
          textAlign: 'center'
        }}>
          {validationError}
        </div>
      )}
      
      {/* Viewer Section */}
      {file && (
        <div style={{
          background: 'white',
          borderRadius: 10,
          padding: 20,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            color: '#2c3e50',
            marginBottom: 20,
            borderBottom: '1px solid #eee',
            paddingBottom: 10
          }}>
            File Viewer
          </h2>
          <VideoPlayer file={file} fileType={fileType} />
        </div>
      )}
      
      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: 50,
        color: '#6c757d',
        fontSize: 14
      }}>
        <p>Medical File Viewer v1.0 | Supports local video and image files</p>
      </div>
    </div>
  );
}