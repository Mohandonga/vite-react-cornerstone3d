// FileHandler.ts
export class FileHandler {
  // DICOM file detection
  static isDicomFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.dcm') || 
           file.type === 'application/dicom';
  }

  // Video file detection (for non-DICOM)
  static isVideoFile(file: File): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.mpg'];
    const videoMimeTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv'];
    
    return videoMimeTypes.some(type => file.type.includes(type)) || 
           videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  // Image file detection (for non-DICOM)
  static isImageFile(file: File): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    
    return imageMimeTypes.some(type => file.type.includes(type)) || 
           imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  // Get detailed file type classification with async DICOM video check
  static async getDetailedFileType(file: File): Promise<'dicom-video' | 'regular-video' | 'dicom-image' | 'regular-image' | 'unknown'> {
    if (this.isDicomFile(file)) {
      try {
        // Attempt to load file as DICOM and check if it's a video
        const { fileToImageId, isDicomVideo } = await import('./VideoPlayer');
        const imageId = await fileToImageId(file);
        const isVideo = await isDicomVideo(imageId);
        return isVideo ? 'dicom-video' : 'dicom-image';
      } catch (error) {
        console.error("Error checking DICOM type:", error);
        return 'dicom-image'; // Default to image if check fails
      }
    }
    
    if (this.isVideoFile(file)) {
      return 'regular-video';
    }
    
    if (this.isImageFile(file)) {
      return 'regular-image';
    }
    
    return 'unknown';
  }

  // Get file size in human-readable format
  static getFileSize(file: File): string {
    const size = file.size;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Validate file
  static validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size (max 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File too large (${this.getFileSize(file)} > 200MB)`);
    }
    
    if (file.size === 0) {
      errors.push("File is empty");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default FileHandler;