import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />
  }

  const colors = {
    success: { bg: '#10b981', border: '#059669', text: '#ffffff' },
    error: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
    warning: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' },
    info: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }
  }

  const color = colors[type]

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        maxWidth: '400px',
        backgroundColor: color.bg,
        color: color.text,
        padding: '16px 20px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 10000,
        animation: 'slideIn 0.3s ease-out',
        border: `2px solid ${color.border}`,
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      
      <div style={{ flexShrink: 0 }}>
        {icons[type]}
      </div>
      
      <div style={{ flex: 1, fontSize: '14px', lineHeight: '1.5' }}>
        {message}
      </div>
      
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: color.text,
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.8,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
      >
        <X size={18} />
      </button>
    </div>
  )
}
