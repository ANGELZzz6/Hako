import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import siteSettingsService from '../services/siteSettingsService';
import type { SiteSettings } from '../services/siteSettingsService';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import './AdminContentEditorPage.css';

const AdminContentEditorPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { settings: globalSettings, refreshSettings } = useSiteSettings();
  
  const [formData, setFormData] = useState<Partial<SiteSettings>>({
    heroTitle: '',
    heroDescription: '',
    heroCtaText: '',
    promoBannerEnabled: true,
    promoBannerMessage: '',
    contactEmail: '',
    footerTagline: '',
    aboutUsDescription: ''
  });
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (globalSettings) {
      setFormData(globalSettings);
    }
  }, [globalSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);
    try {
      await siteSettingsService.updateSettings(formData);
      await refreshSettings();
      setToastMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      
      // Auto-hide toast
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      setToastMessage({ type: 'error', text: error.message || 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="admin-dashboard admin-content-editor-page" data-theme="light">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-pencil-square header-icon"></i>
            <span className="header-title">Editor de Contenido</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <a href="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </a>
          </div>
        </div>
      </header>

      <main className="admin-main-content">
        <div className="container-fluid py-4">
          
          {toastMessage && (
            <div className={`alert alert-${toastMessage.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mb-4`} role="alert">
              <i className={`bi bi-${toastMessage.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>
              {toastMessage.text}
              <button type="button" className="btn-close" onClick={() => setToastMessage(null)}></button>
            </div>
          )}

          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 border-bottom">
                  <h4 className="mb-0 text-primary">Ajustes del Sitio</h4>
                  <p className="text-muted small mb-0 mt-1">Modifica los textos estáticos que se muestran a los usuarios en toda la plataforma.</p>
                </div>
                
                <div className="card-body p-4">
                  <form onSubmit={handleSubmit}>
                    
                    {/* Sección: Hero Principal */}
                    <div className="settings-section mb-5">
                      <h5 className="section-title border-bottom pb-2 mb-3">
                        <i className="bi bi-image me-2 text-danger"></i>
                        Sección Hero (Página Principal)
                      </h5>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Título Principal</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="heroTitle" 
                            value={formData.heroTitle || ''} 
                            onChange={handleInputChange} 
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Texto del Botón (CTA)</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="heroCtaText" 
                            value={formData.heroCtaText || ''} 
                            onChange={handleInputChange} 
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Descripción</label>
                          <textarea 
                            className="form-control" 
                            rows={3} 
                            name="heroDescription" 
                            value={formData.heroDescription || ''} 
                            onChange={handleInputChange} 
                          ></textarea>
                        </div>
                      </div>
                    </div>

                    {/* Sección: Banner Promocional */}
                    <div className="settings-section mb-5">
                      <h5 className="section-title border-bottom pb-2 mb-3">
                        <i className="bi bi-megaphone me-2 text-warning"></i>
                        Banner Promocional
                      </h5>
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="form-check form-switch fs-5 mb-2">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              role="switch" 
                              id="promoBannerToggle" 
                              name="promoBannerEnabled"
                              checked={!!formData.promoBannerEnabled}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label ms-2" htmlFor="promoBannerToggle">
                              Habilitar Banner
                            </label>
                          </div>
                        </div>
                        <div className="col-12">
                          <label className="form-label text-muted">Mensaje del Banner</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="promoBannerMessage" 
                            value={formData.promoBannerMessage || ''} 
                            onChange={handleInputChange} 
                            disabled={!formData.promoBannerEnabled}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección: Footer y Contacto */}
                    <div className="settings-section mb-4">
                      <h5 className="section-title border-bottom pb-2 mb-3">
                        <i className="bi bi-envelope me-2 text-info"></i>
                        Pie de Página y Contacto
                      </h5>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Email de Contacto</label>
                          <input 
                            type="email" 
                            className="form-control" 
                            name="contactEmail" 
                            value={formData.contactEmail || ''} 
                            onChange={handleInputChange} 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Tagline (Lema corto)</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="footerTagline" 
                            value={formData.footerTagline || ''} 
                            onChange={handleInputChange} 
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Descripción "Sobre Nosotros"</label>
                          <textarea 
                            className="form-control" 
                            rows={3} 
                            name="aboutUsDescription" 
                            value={formData.aboutUsDescription || ''} 
                            onChange={handleInputChange} 
                          ></textarea>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="form-actions border-top pt-4 text-end">
                      <button 
                        type="button" 
                        className="btn btn-light me-2 px-4"
                        onClick={() => globalSettings && setFormData(globalSettings)}
                        disabled={saving}
                      >
                        Descartar
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary px-5"
                        disabled={saving}
                      >
                        {saving ? (
                          <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                        ) : (
                          <><i className="bi bi-save me-2"></i>Guardar Cambios</>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminContentEditorPage;
