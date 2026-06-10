import { useRef } from 'react'

export default function FileUpload({ onFile, disabled }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && !disabled) onFile(file)
  }

  return (
    <div
      className={`upload-zone ${disabled ? 'upload-disabled' : ''}`}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      <div className="upload-icon">📂</div>
      <div className="upload-text">
        {disabled ? 'Processing…' : 'Tap to upload leads file'}
      </div>
      <div className="upload-hint">CSV or Excel · columns: business name, address, category, owner, phone, email, notes</div>
    </div>
  )
}
