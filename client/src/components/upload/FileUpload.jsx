import { useState, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_SIZE_LABEL = '10 MB';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export default function FileUpload({ onUploaded, accept = ALLOWED_TYPES.join(','), label = 'Upload file' }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const toast = useToast();

  const handleSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_LABEL}.`);
      return;
    }
    if (file.size === 0) {
      toast.error('File is empty.');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('File type not allowed. Allowed: JPG, PNG, WebP, GIF, PDF.');
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress(50);
      const data = await api.upload('/upload', formData);
      setProgress(100);
      onUploaded?.(data);
      toast.success('File uploaded.');
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleSelect}
        disabled={uploading}
        id="file-upload-input"
        style={{ display: 'none' }}
      />
      <label htmlFor="file-upload-input" className={`btn btn-secondary ${uploading ? 'disabled' : ''}`}>
        {uploading ? `Uploading… ${progress}%` : `\u{1F4CE} ${label}`}
      </label>
      <span className="upload-hint" aria-live="polite">
        Max {MAX_SIZE_LABEL} · JPG, PNG, WebP, GIF, PDF
      </span>
    </div>
  );
}
