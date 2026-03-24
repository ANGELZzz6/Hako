export const showSuccessToast = (message: string) => {
  const toast = document.createElement('div');

  const inner = document.createElement('div');
  inner.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: #28a745; color: white; padding: 1rem 1.5rem;
    border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000; animation: slideInRight 0.3s ease;
    display: flex; align-items: center; gap: 0.5rem;
  `;

  const icon = document.createElement('i');
  icon.className = 'bi bi-check-circle-fill';

  const text = document.createTextNode(message);

  inner.appendChild(icon);
  inner.appendChild(text);
  toast.appendChild(inner);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      if (document.body.contains(toast)) document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

export const showErrorToast = (message: string) => {
  const toast = document.createElement('div');
  const inner = document.createElement('div');
  inner.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: #d32f2f; color: white; padding: 1rem 1.5rem;
    border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000; animation: slideInRight 0.3s ease;
    display: flex; align-items: center; gap: 0.5rem;
  `;
  const icon = document.createElement('i');
  icon.className = 'bi bi-x-octagon-fill';
  const text = document.createTextNode(message);
  inner.appendChild(icon);
  inner.appendChild(text);
  toast.appendChild(inner);
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      if (document.body.contains(toast)) document.body.removeChild(toast);
    }, 300);
  }, 2500);
};