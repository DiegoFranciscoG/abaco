import './styles/index.css';

/**
 * index.html carries a static shell (brand bar and, on the home page, the hero copy). It is painted first;
 * React and the router mount right after that first frame. The app chunks are already downloading in
 * parallel (low-priority modulepreload added at build time), so modest phones show content without
 * waiting for JavaScript and still start the app as soon as it arrives.
 */
const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor #root');

requestAnimationFrame(() => {
  setTimeout(() => {
    void import('./app/mount').then(({ mount }) => mount(root));
  }, 0);
});
