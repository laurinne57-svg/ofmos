'use client';

import { useRef, useState } from 'react';

import { Upload04 } from '@untitledui/icons';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function VideoUpload({
  onUploaded,
}: {
  onUploaded: (url: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('content')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      alert(`Upload failed: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('content').getPublicUrl(data.path);

    setUploading(false);
    setProgress(100);
    onUploaded(urlData.publicUrl, file);

    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload04 className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading...' : 'Upload Video'}
      </Button>
      {uploading && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: '50%' }} />
        </div>
      )}
    </div>
  );
}
