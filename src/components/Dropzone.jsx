import { UploadCloud } from 'lucide-react';

export default function Dropzone({ isDragging, isProcessing, onDragChange, onFiles }) {
  function handleDrop(event) {
    event.preventDefault();
    onDragChange(false);
    onFiles(event.dataTransfer.files);
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        onDragChange(true);
      }}
      onDragLeave={() => onDragChange(false)}
      onDrop={handleDrop}
      className={[
        'flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-5 text-center transition',
        isDragging ? 'border-success bg-[#eef8f4]' : 'border-slate-300 bg-white hover:border-success',
        isProcessing ? 'pointer-events-none opacity-70' : '',
      ].join(' ')}
    >
      <input
        type="file"
        accept=".xml,text/xml,application/xml"
        multiple
        className="sr-only"
        onChange={(event) => onFiles(event.target.files)}
      />
      <UploadCloud className="h-8 w-8 text-success" strokeWidth={1.8} />
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-900">
          {isProcessing ? 'Đang đọc XML...' : 'Kéo thả hoặc chọn nhiều file XML'}
        </div>
        <div className="text-xs text-slate-500">Bulk upload</div>
      </div>
    </label>
  );
}
