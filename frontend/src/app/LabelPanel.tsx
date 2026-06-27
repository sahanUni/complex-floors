'use client'

import { useState } from 'react'

export interface ExtractionLabel {
  category: string
  label_code: string
  label_display?: string
  note?: string
}

interface Props {
  busy: boolean
  error?: string
  onCancel: () => void
  onConfirm: (label: ExtractionLabel) => Promise<void>
}

const CATEGORIES = [
  { value: 'floor-plan', label: 'Floor Plan' },
  { value: 'elevation', label: 'Elevation View' },
  { value: 'cross-section', label: 'Cross Section' },
  { value: 'specification', label: 'Specification' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'other', label: 'Other' },
]

const LEVEL_CODES = ['B01', 'L00', 'L01', 'L02', 'L03', 'L04', 'L05']

export default function LabelPanel({ busy, error, onCancel, onConfirm }: Props) {
  const [category, setCategory] = useState('')
  const [levelCode, setLevelCode] = useState('')
  const [labelText, setLabelText] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [note, setNote] = useState('')
  const [fieldError, setFieldError] = useState('')

  const isFloorPlan = category === 'floor-plan'

  async function handleConfirm() {
    if (!category) {
      setFieldError('Category is required')
      return
    }
    if (isFloorPlan && !levelCode) {
      setFieldError('Level code is required')
      return
    }
    if (!isFloorPlan && !labelText.trim()) {
      setFieldError('Label is required')
      return
    }

    setFieldError('')
    await onConfirm({
      category,
      label_code: isFloorPlan ? levelCode : labelText.trim(),
      label_display: isFloorPlan ? displayName.trim() || undefined : undefined,
      note: note.trim() || undefined,
    })
  }

  return (
    <div
      data-testid="label-panel"
      onMouseDown={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        width: 260,
        padding: 12,
        border: '1px solid #cbd5e1',
        borderRadius: 6,
        background: '#fff',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
        fontFamily: 'sans-serif',
        fontSize: 13,
      }}
    >
      <label style={labelStyle}>
        Category
        <select
          aria-label="Category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value)
            setFieldError('')
          }}
          disabled={busy}
          style={inputStyle}
        >
          <option value="">Select category</option>
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </label>

      {isFloorPlan ? (
        <>
          <label style={labelStyle}>
            Level code
            <select
              aria-label="Level code"
              value={levelCode}
              onChange={(event) => {
                setLevelCode(event.target.value)
                setFieldError('')
              }}
              disabled={busy}
              style={inputStyle}
            >
              <option value="">Select level</option>
              {LEVEL_CODES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Display name
            <input
              aria-label="Display name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={busy}
              style={inputStyle}
            />
          </label>
        </>
      ) : category ? (
        <label style={labelStyle}>
          Label
          <input
            aria-label="Label"
            type="text"
            value={labelText}
            onChange={(event) => {
              setLabelText(event.target.value)
              setFieldError('')
            }}
            disabled={busy}
            style={inputStyle}
          />
        </label>
      ) : null}

      <label style={labelStyle}>
        Note
        <textarea
          aria-label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={busy}
          style={{ ...inputStyle, minHeight: 58, resize: 'vertical' }}
        />
      </label>

      {(fieldError || error) && (
        <p role="alert" style={{ margin: '0 0 0.5rem', color: '#b91c1c' }}>
          {fieldError || error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} disabled={busy} style={buttonStyle}>Cancel</button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          style={{ ...buttonStyle, background: busy ? '#94a3b8' : '#111827', color: '#fff' }}
        >
          {busy ? 'Confirming...' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  marginBottom: 8,
  color: '#111827',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.35rem 0.45rem',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  font: 'inherit',
  background: '#fff',
}

const buttonStyle: React.CSSProperties = {
  padding: '0.35rem 0.65rem',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  font: 'inherit',
}
