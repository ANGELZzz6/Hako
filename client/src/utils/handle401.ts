export function handle401(response: Response) {
  if (response.status === 401) {
    localStorage.clear();
    window.location.reload();
  }
} 