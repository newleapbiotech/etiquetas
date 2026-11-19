import { mount } from 'svelte';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/700-italic.css';
import '@fontsource/roboto-condensed/400.css';
import '@fontsource/roboto-condensed/700.css';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/700.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import './app.css';
import App from './App.svelte';
// NewLeap Biotech: carga la etiqueta que llega en la URL (#id=...&img=...).
import './lib/newleap/cargar-desde-url.svelte';

const app = mount(App, { target: document.getElementById('app')! });

export default app;
