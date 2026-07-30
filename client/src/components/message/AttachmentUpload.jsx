import { useState, useRef } from 'react';
import { Paperclip } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export default function AttachmentUpload({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const toast = useToast();

  const handleSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error(`File too large. Maximum size is 10 MB.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`File type not allowed. Use JPG, PNG, WebP, GIF, or PDF.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // No real progress tracking in fetch — show indeterminate progress
      setProgress(50);
      const data = await api.upload('/upload', formData);
      setProgress(100);
      onUploaded?.(data); // { file_id, name, size, mime }
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
    <div className="attachment-upload">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleSelect}
        disabled={uploading}
        style={{ display: 'none' }}
        id="attachment-input"
      />
      <label
        htmlFor="attachment-input"
        className={`composer-attach-btn ${uploading ? 'disabled' : ''}`}
        title={uploading ? `Uploading... ${progress}%` : 'Attach image or file'}
      >
        {uploading ? (
          <span className="attach-spinner" />
        ) : (
          <Paperclip size={20} />
        )}
      </label>
    </div>
  );
}
