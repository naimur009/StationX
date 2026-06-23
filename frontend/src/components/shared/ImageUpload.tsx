'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadFile } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ImageValue {
  url: string;
  publicId: string;
}

interface ImageUploadProps {
  value?: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  folder?: string;
  accept?: string;
  maxSize?: number;
  aspectRatio?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/webp';
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export default function ImageUpload({
  value,
  onChange,
  folder = 'uploads',
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  aspectRatio,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedTypes = useMemo(() => accept.split(','), [accept]);
  const maxSizeMB = Math.round(maxSize / (1024 * 1024));

  const aspectStyle = aspectRatio
    ? { aspectRatio: aspectRatio.replace(':', '/') }
    : undefined;

  const previewSize = aspectRatio ? 'w-full max-w-48' : 'h-32 w-32';

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        const labels = acceptedTypes
          .map((t) => t.split('/')[1].toUpperCase())
          .join(', ');
        return `File type ${file.type || 'unknown'} is not supported. Accepted: ${labels}`;
      }
      if (file.size > maxSize) {
        return `File exceeds the maximum size of ${maxSizeMB}MB`;
      }
      return null;
    },
    [acceptedTypes, maxSize, maxSizeMB]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const result = await uploadFile('/uploads/image', file, folder);
        onChange(result.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Upload failed. Please try again.'
        );
      } finally {
        setUploading(false);
      }
    },
    [validateFile, folder, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
  }, [onChange]);

  const handleRetry = useCallback(() => {
    setError(null);
    inputRef.current?.click();
  }, []);

  /* ---- Uploaded state ---- */
  if (value?.url && !uploading) {
    return (
      <div className="space-y-2">
        <div className={cn('relative inline-block overflow-hidden rounded-xl border border-slate-200 shadow-sm', previewSize)}>
          <img
            src={value.url}
            alt="Uploaded image preview"
            className="h-full w-full object-cover"
            style={aspectStyle}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
            aria-label="Remove image"
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
            disabled={disabled}
          >
            Replace
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>
    );
  }

  /* ---- Uploading state ---- */
  if (uploading) {
    return (
      <div
        className={cn('flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50', previewSize)}
        style={aspectStyle}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-xs text-slate-500">Uploading...</span>
        </div>
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="space-y-2">
        <div
          className={cn('flex items-center justify-center rounded-xl border-2 border-dashed border-red-300 bg-red-50', previewSize)}
          style={aspectStyle}
        >
          <Upload className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
          disabled={disabled}
        >
          Try again
        </button>
      </div>
    );
  }

  /* ---- Empty / drop zone state ---- */
  return (
    <div>
      <div
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors',
          previewSize,
          dragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        style={aspectStyle}
      >
        {dragOver ? (
          <>
            <Upload className="mb-2 h-8 w-8 text-blue-500" />
            <p className="text-sm font-medium text-blue-600">Drop here</p>
          </>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">
              Click to browse or drag & drop
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {acceptedTypes
                .map((t) => t.split('/')[1].toUpperCase())
                .join(', ')}
              , max {maxSizeMB}MB
            </p>
            {aspectRatio && (
              <p className="mt-1 text-xs text-slate-400">
                Recommended aspect ratio: {aspectRatio}
              </p>
            )}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}
