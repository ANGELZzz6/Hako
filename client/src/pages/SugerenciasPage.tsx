import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SugerenciasPage: React.FC = () => {
  const [urls, setUrls] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // Extrae todas las URLs válidas del texto, incluso si están pegadas
  function extraerURLs(texto: string): string[] {
    const urlRegex = /(https?:\/\/[\w\-\.\/?#&=;%:+,~@!$'*()\[\]]+)/g;
    let matches = [];
    let match;
    while ((match = urlRegex.exec(texto)) !== null) {
      matches.push(match[1].trim());
    }
    return Array.from(new Set(matches));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);
    // Procesar SIEMPRE el texto completo para extraer todas las URLs, aunque estén pegadas
    const urlsExtraidas = extraerURLs(urls);
    if (urlsExtraidas.length === 0) {
      setError('Por favor, ingresa al menos una URL válida.');
      setLoading(false);
      return;
    }
    if (urlsExtraidas.length > 5) {
      setError('Solo puedes sugerir hasta 5 productos por envío.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/products/sugerencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ urls: urlsExtraidas })
      });
      if (!res.ok) throw new Error('Error al enviar sugerencia');
      setMensaje('¡Gracias por tu sugerencia!');
      setUrls('');
    } catch (err: any) {
      setError(err.message || 'Error al enviar sugerencia');
    } finally {
      setLoading(false);
    }
  };

  // Maneja el pegado para separar URLs pegadas con saltos de línea
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    // Inserta salto de línea antes de cada http(s) excepto al inicio
    const procesado = pasted.replace(/(https?:\/\/)/g, '\n$1').replace(/^\n/, '');
    // Inserta en la posición actual del cursor
    const textarea = e.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nuevoValor = urls.slice(0, start) + procesado + urls.slice(end);
    setUrls(nuevoValor);
    e.preventDefault();
  };

  return (
    <div className="profile-form-container" style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2 className="text-center mb-4">Sugerir productos</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="urls">Pega aquí una o varias URLs de productos que te gustaría ver en Hako</label>
          <textarea
            id="urls"
            className="form-control"
            value={urls}
            onChange={e => setUrls(e.target.value)}
            onPaste={handlePaste}
            rows={4}
            placeholder="https://ejemplo.com/producto1\nhttps://ejemplo.com/producto2"
            required
          />
        </div>
        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar sugerencia'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SugerenciasPage; 